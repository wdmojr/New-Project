# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Operation Hurricane sizzle: bespoke trailer score + the game's voice lines on the beat grid.

    MOTION_REEL_SKILL=<skill> uv run hurricane-reel/audio/score.py

100 BPM, 4/4, 50 beats = 30.0 s, D minor. The phone rings and Olivia answers over a storm drone,
a ticking pulse under Sarah and Bryan, a riser into the drop at b13 ("You in, operator?"), a
driving groove for the whole flight, a sting on JACKPOT, and a D-major resolve on the end card.

Reads  hurricane-reel/audio/vo/*.wav (the game's ElevenLabs voice lines) and audio/ring.wav
Writes hurricane-reel/audio/music.wav, vo.wav, hurricane-reel/beats.json
"""
import json
import os
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy import signal


def _skill_dir():
    if os.environ.get("MOTION_REEL_SKILL"):
        return Path(os.environ["MOTION_REEL_SKILL"])
    found = sorted((Path.home() / ".claude/plugins").glob("**/skills/motion-reel/scripts/dsp.py"))
    if found:
        return found[-1].parent.parent
    sys.exit("set MOTION_REEL_SKILL to the folder that holds the motion-reel SKILL.md")


sys.path.insert(0, str(_skill_dir() / "scripts"))
from dsp import *  # noqa: E402,F403

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BPM = 100
BEAT = 60 / BPM
N_BEATS = 50
DUR = N_BEATS * BEAT
N = int(SR * DUR)
seed(20261022)


def T(b):
    return b * BEAT


# ---------------------------------------------------------------- instruments

def thunder(length=3.2, bright=1.0):
    """A crack, then a long rolling rumble."""
    n = int(length * SR)
    t = tvec(n)
    crack = filt(rng.standard_normal(n), "bandpass", [600, 5000 * bright]) * np.exp(-t / 0.05)
    roll = filt(rng.standard_normal(n), "lowpass", 160) * (1 - np.exp(-t / 0.08)) * np.exp(-t / (length * 0.35))
    wob = 1 + 0.5 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t)
    return np.tanh(1.5 * (crack * 0.5 + roll * 3.0 * wob))


def ring(length=1.1):
    """US phone ring: 440 + 480 Hz, warbled."""
    n = int(length * SR)
    t = tvec(n)
    x = np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)
    am = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 20 * t))
    return x * am * adsr(n, 0.01, 0.05, 0.9, 0.05) * 0.5


def tom(f0=110, gain=1.0):
    n = int(0.6 * SR)
    t = tvec(n)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.05))
    return np.tanh(1.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22) * gain)


def bell(note, length=2.2):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (length * d)) for r, a, d in
            ((1, 1, 0.5), (2.76, 0.4, 0.2), (5.4, 0.2, 0.08), (2.0, 0.3, 0.35)))
    return x * (1 - np.exp(-t / 0.002)) * 0.5


# ---------------------------------------------------------------- VO edit

# (take, take start s, take end s, beat the phrase lands on, radio?, text)
PHRASES = [
    ("o0", 0.0, 1.85, 0.3, False, "Grey Bull Rescue, this is Olivia."),
    ("c2", 4.10, 6.40, 3.5, False, "They all say nobody can get out there tonight."),
    ("bq3", 0.0, 2.32, 7.4, False, "We don't come home until they come home."),
    ("bq3", 2.76, 3.82, 11.3, False, "You in, operator?"),
    ("b_liftoff", 0.0, 2.10, 13.7, True, "Operator, lift off and head south."),
    ("b_jackpot_Tom", 2.55, 4.45, 24.5, True, "Jackpot! Jackpot! Jackpot!"),
    ("o_danger", 0.0, 1.72, 28.6, True, "Water's almost over that roof!"),
    ("b_full", 0.0, 2.62, 31.5, True, "Helo's full. Bring them back to base, operator."),
    ("o_all", 0.0, 0.92, 36.6, False, "That's everyone."),
    ("o_all", 1.52, 3.50, 38.3, False, "All fifteen souls saved."),
    ("b_proud", 0.0, 2.68, 41.8, False, "Proud of you, operator. Welcome to the team."),
    ("bq4", 1.85, 2.92, 46.6, False, "Don't be a spectator."),
]


def compress(x, thresh_db=-22, ratio=3.0, attack=0.004, release=0.08, makeup_db=4):
    e = env_follow(x, attack, release)
    over = np.maximum(20 * np.log10(e + 1e-9) - thresh_db, 0)
    return x * 10 ** ((-over * (1 - 1 / ratio) + makeup_db) / 20)


def radio(x):
    x = filt(x, "bandpass", [380, 3600], 2)
    return np.tanh(2.2 * x) / np.tanh(2.2)


def build_vo():
    vo = np.zeros(N + SR)
    placed = []
    for take, a, b, beat, rad, text in PHRASES:
        y, _ = librosa.load(HERE / "vo" / f"{take}.wav", sr=SR, mono=True)
        seg = y[int(a * SR):int(b * SR)].copy()
        fi, fo = int(0.004 * SR), int(0.02 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo)
        seg /= np.abs(seg).max() + 1e-9
        if rad:
            seg = radio(seg)
        s = int(round(T(beat) * SR))
        vo[s:s + len(seg)] += seg
        placed.append((T(beat), T(beat) + len(seg) / SR, text))
    print("VO edit:")
    for (a0, b0, l0), (a1, _, _) in zip(placed, placed[1:] + [(DUR, 0, "")]):
        gap = a1 - b0
        print(f"  {l0[:44]:46s} {a0:6.2f}-{b0:6.2f}  gap {gap * 1000:+5.0f} ms" + ("  OVERLAP" if gap < 0 else ""))
    x = filt(vo[:N], "highpass", 90, 2)
    x = peq(x, 3000, 3.0, 0.9)
    return compress(x), placed


# ---------------------------------------------------------------- the score

def main():
    drums, bass, music, fx, click = (Bus(DUR, BPM) for _ in range(5))

    # harmony
    Dm, Bb, F, C, A = ["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["F2", "A2", "C3", "F3"], ["C3", "E3", "G3"], ["A2", "C#3", "E3"]

    # ---- the call b0-7.4: storm drone, phone ring, Olivia answers, Sarah's plea over a ticking pulse
    music.add(pad_chord(["D2", "A2", "D3"], T(7.6), (160, 700), attack=0.02, release=0.6), 0, 0.5)
    fx.add(thunder(3.4, 0.9), 0, 0.6)
    # the call: the game's recorded desk-phone ring (ElevenLabs sound effect), one burst of two trills
    rg, _ = librosa.load(HERE / "ring.wav", sr=SR, mono=True)
    fx.add(np.concatenate([rg, rg]) * 0.9, 0, 0.32, pan=0.15)
    music.add(pad_chord(Dm, T(7.6), 650, attack=0.4, release=0.5), 2, 0.3)
    for b in np.arange(2, 13, 0.5):
        drums.add(hat(), b, 0.05 if b % 1 else 0.08, pan=0.25)
    for b in range(2, 13):
        bass.add(bass_note("D1" if b < 7.5 else ("Bb0" if b < 10.5 else "A0"), BEAT * 0.8, 260), b, 0.42)
    for b in (2, 4, 6):
        drums.add(kick(soft=True), b, 0.5)
        drums.add(kick(soft=True), b + 0.33, 0.3)
    # ---- the order b7.4-13: Bb -> A, kicks crescendo, riser into the drop
    music.add(pad_chord(Bb, T(3.1), (500, 1400), attack=0.2), 7.5, 0.34)
    music.add(pad_chord(A, T(2.5), (1400, 3500), attack=0.05), 10.5, 0.4)
    for b in range(8, 13):
        drums.add(kick(), b, 0.4 + 0.08 * (b - 8))
        drums.add(tom(82, 1.0), b + 0.5, 0.16 + 0.04 * (b - 8))
    for i, b in enumerate(np.arange(11, 12.75, 0.25)):
        drums.add(clap(tight=True), b, 0.1 + 0.04 * i, pan=0.1 * (-1) ** i)
    fx.add(riser(T(5)), 8, 0.45)

    # ---- DROP b13-40: you deploy; the driving groove carries the whole flight
    fx.add(sub_drop(1.8, 90, 28), 13, 1.0)
    fx.add(crash(2.4), 13, 0.5)
    fx.add(thunder(3.0, 1.4), 13, 0.5)
    prog_ = [Dm, Bb, F, C]
    names = ["D", "Bb", "F", "C"]
    harmony = [(b, prog_[(i % 4)], names[i % 4]) for i, b in enumerate(range(13, 37, 4))] + [(37, Dm, "D")]

    def chord(b):
        cur = harmony[0]
        for h in harmony:
            if b >= h[0]:
                cur = h
        return cur

    for b in range(13, 40):
        half = b >= 37                      # debrief: half-time feel
        if not half or b % 2 == 1:
            drums.add(kick(), b, 0.95 if not half else 0.7)
        if b % 2 == 0 and not half:
            drums.add(clap(), b, 0.5)
        drums.add(hat(), b + 0.5, 0.16 if not half else 0.08, pan=0.3)
        if not half:
            drums.add(hat(), b + 0.25, 0.05, pan=-0.3)
            drums.add(hat(), b + 0.75, 0.05, pan=-0.3)
    for b in (16.5, 20.5, 27.5, 30.5):     # fills into the title, the hoist, the surge, the flight home
        drums.add(tom(120), b, 0.4, pan=-0.3)
        drums.add(tom(90), b + 0.25, 0.45, pan=0.3)
    root_oct = {"D": ("D2", "D3"), "Bb": ("Bb1", "Bb2"), "F": ("F1", "F2"), "C": ("C2", "C3")}
    for k in range(48):
        b = 13 + k / 2
        lo, hi = root_oct[chord(b)[2]]
        bass.add(bass_note(hi if k % 4 == 3 else lo, BEAT / 2 * 0.85, 1100), b, 0.55)
    for i, (h0, notes, _) in enumerate(harmony):
        h1 = harmony[i + 1][0] if i + 1 < len(harmony) else 40.5
        music.add(pad_chord([n[:-1] + str(int(n[-1]) + 1) for n in notes], T(h1 - h0), 2400, attack=0.05), h0, 0.28)
    for k in range(48):
        b = 13 + k / 2
        if k % 2 == 1:
            notes = chord(b)[1]
            music.add(pluck([n[:-1] + str(int(n[-1]) + 2) for n in notes], 0.18, 2600), b, 0.14, pan=0.3)
    # JACKPOT sting
    for i, nt in enumerate(("D5", "F5", "A5", "D6")):
        music.add(pluck([nt], 0.5, 4200), 24.5 + i * 0.25, 0.3, pan=-0.2 + 0.13 * i)
    music.add(bell("D6", 1.6), 25.5, 0.16)
    # the surge: thunder and a sub under the water
    fx.add(thunder(3.2, 1.2), 28, 0.55, pan=-0.3)
    fx.add(sub_drop(1.4, 70, 30), 28, 0.6)
    # SUCCESSFUL LANDING: a bright bell
    music.add(bell("A5", 1.8), 34.5, 0.2)
    music.add(bell("D6", 1.6), 34.75, 0.12)

    # ---- live the mission b40.5-45: pull back to a pad, heartbeat, riser to the end card
    fx.add(sub_drop(1.4, 70, 30), 40.5, 0.6)
    music.add(pad_chord(["Bb2", "D3", "F3", "A3"], T(4.5), 1200, attack=0.05, release=0.4), 40.5, 0.42)
    for b in (40.5, 42.5):
        drums.add(kick(soft=True), b, 0.5)
        drums.add(kick(soft=True), b + 0.33, 0.3)
    fx.add(riser(T(1.8)), 43.2, 0.3)

    # ---- end card b45-50: impact + bell, D major resolve
    fx.add(sub_drop(1.6, 70, 28), 45, 0.9)
    fx.add(crash(2.0), 45, 0.35)
    drums.add(kick(), 45, 0.9)
    music.add(pad_chord(["D3", "F#3", "A3", "D4"], T(5), 2000, attack=0.02, release=0.8), 45, 0.42)
    music.add(bell("D5", 2.4), 45, 0.28)
    music.add(bell("A5", 2.0), 45.5, 0.15)

    # ---- mix the bed
    kick_t = [T(b) for b in range(13, 37)]
    pump = sidechain(kick_t, bass.x.shape[1], 0.4, 0.1)
    ir = reverb_ir(1.8, 0.45)
    wet_src = music.x * 0.4 + fx.x * 0.15 + drums.x * 0.08
    wet = np.stack([signal.fftconvolve(wet_src[c], ir[c])[: wet_src.shape[1]] for c in range(2)])
    bed = drums.x * 0.85 + bass.x * pump * 0.8 + music.x * pump * 0.75 + fx.x * 0.8 + wet * 0.5
    bed = np.stack([filt(ch, "highpass", 25) for ch in bed])[:, :N]
    # a breath of silence right before the drop
    a, b = int(T(12.82) * SR), int(T(13.0) * SR)
    bed[:, a:b] *= np.linspace(1, 0, b - a) ** 3
    bed /= np.abs(bed).max() + 1e-9
    bed *= 0.5
    fade = int(0.4 * SR)
    bed[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    sf.write(HERE / "music.wav", bed.T, SR, subtype="PCM_24")

    # grid: measured on a silent click track that marks every beat (the bed is too sparse early on)
    for b in range(N_BEATS + 1):
        click.add(kick(), b, 1.0)
    grid = measure_beats(click.x[:, :N].mean(axis=0), SR, BPM, n_beats=N_BEATS + 1)
    grid.update({"designed_bpm": BPM, "downbeats": grid["beats"][::4],
                 "sections": {"call": [0, 7.4], "order": [7.4, 13], "deploy": [13, 21], "hoist": [21, 28], "surge": [28, 31], "home": [31, 36.5], "debrief": [36.5, 40.5], "live": [40.5, 45], "end": [45, 50]},
                 "source": "hurricane-reel/audio/score.py click track, librosa beat_track + onsets, linear fit"})
    (FILM / "beats.json").write_text(json.dumps(grid, indent=1))
    print(f"beats: {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms, fit rms {grid['fit_residual_ms']} ms")

    v, placed = build_vo()
    v = v / (np.abs(v).max() + 1e-9) * 0.7
    sf.write(HERE / "vo.wav", np.stack([v, v]).T, SR, subtype="PCM_24")
    (FILM / "vo.json").write_text(json.dumps([{"t0": round(a, 3), "t1": round(b, 3), "text": t} for a, b, t in placed], indent=1))


if __name__ == "__main__":
    main()
