# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Operation Hurricane sizzle: bespoke trailer score + the game's voice lines on the beat grid.

    MOTION_REEL_SKILL=<skill> uv run hurricane-reel/audio/score.py

100 BPM, 4/4, 50 beats = 30.0 s, D minor. Storm drone and thunder for the cold open, the phone
rings, a ticking pulse under Sarah and Bryan, a riser into the drop at b32, a driving groove for
the gameplay montage, a bright sting on JACKPOT, and a D-major resolve on the end card.

Reads  hurricane-reel/audio/vo/*.wav (the game's Piper voice lines)
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
    ("c2", 0.0, 5.31, 12, False, "I've called 911. The county. Everyone. They all say nobody can get out there tonight."),
    ("bq1", 0.0, 2.99, 21, False, "We're the last resort. We're never the first phone call."),
    ("bq3", 0.0, 3.30, 26, False, "We don't come home until they come home. You in, operator?"),
    ("o_danger", 0.0, 1.76, 38, True, "Water's almost over that roof!"),
    ("b_jackpot_Tom", 2.38, 4.80, 41, True, "Jackpot! Jackpot! Jackpot!"),
    ("bq4", 1.26, 2.44, 45.5, False, "Don't be a spectator."),
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

    # ---- cold open b0-9: storm drone, thunder, heartbeat
    music.add(pad_chord(["D2", "A2", "D3"], T(12.5), (160, 700), attack=0.02, release=0.6), 0, 0.55)
    fx.add(thunder(3.4, 1.0), 0, 0.85)
    fx.add(thunder(4.0, 1.3), 2, 1.0)
    fx.add(sub_drop(1.6, 80, 28), 2, 0.8)
    fx.add(thunder(3.0, 0.7), 6.5, 0.45, pan=0.4)
    for b in (4, 6, 8, 10):
        drums.add(kick(soft=True), b, 0.55)
        drums.add(kick(soft=True), b + 0.33, 0.35)
    # ---- the call b8-11.5
    fx.add(ring(1.0), 8, 0.22, pan=0.15)
    fx.add(ring(1.0), 9.7, 0.22, pan=0.15)

    # ---- tension b12-26: ticking, pulse bass, Dm -> Bb -> Gm colour
    music.add(pad_chord(Dm, T(9), 650, attack=0.4, release=0.5), 12, 0.32)
    music.add(pad_chord(Bb, T(5.2), 700, attack=0.3, release=0.5), 21, 0.32)
    for b in range(12, 26):
        bass.add(bass_note("D1" if b < 21 else "Bb0", BEAT * 0.8, 260), b, 0.42)
    for b in np.arange(12, 26, 0.5):
        drums.add(hat(), b, 0.05 if b % 1 else 0.08, pan=0.25)
    for b in range(16, 26, 2):
        drums.add(tom(98, 0.8), b + 1, 0.25, pan=-0.2)

    # ---- build b26-32: Bb -> A, kicks crescendo, snare roll, riser
    music.add(pad_chord(Bb, T(3), (500, 1600), attack=0.1), 26, 0.36)
    music.add(pad_chord(A, T(2.75), (1600, 3500), attack=0.05), 29, 0.4)
    for b in range(26, 32):
        drums.add(kick(), b, 0.45 + 0.08 * (b - 26))
        drums.add(tom(82, 1.0), b + 0.5, 0.18 + 0.04 * (b - 26))
    for i, b in enumerate(np.arange(30, 31.75, 0.25)):
        drums.add(clap(tight=True), b, 0.12 + 0.05 * i, pan=0.1 * (-1) ** i)
    fx.add(riser(T(6)), 26, 0.5)

    # ---- DROP b32-44: driving groove
    fx.add(sub_drop(1.8, 90, 28), 32, 1.0)
    fx.add(crash(2.4), 32, 0.5)
    fx.add(thunder(3.0, 1.4), 32, 0.55)
    harmony = [(32, Dm, "D"), (36, Bb, "Bb"), (40, F, "F"), (42, C, "C")]

    def chord(b):
        cur = harmony[0]
        for h in harmony:
            if b >= h[0]:
                cur = h
        return cur

    for b in range(32, 44):
        drums.add(kick(), b, 0.95)
        if b % 2 == 1:
            drums.add(clap(), b, 0.5)
        drums.add(hat(), b + 0.5, 0.16, pan=0.3)
        drums.add(hat(), b + 0.25, 0.05, pan=-0.3)
        drums.add(hat(), b + 0.75, 0.05, pan=-0.3)
    for b in (35.5, 39.5, 43.5):
        drums.add(tom(120), b, 0.4, pan=-0.3)
        drums.add(tom(90), b + 0.25, 0.45, pan=0.3)
    root_oct = {"D": ("D2", "D3"), "Bb": ("Bb1", "Bb2"), "F": ("F1", "F2"), "C": ("C2", "C3")}
    for k in range(24):
        b = 32 + k / 2
        lo, hi = root_oct[chord(b)[2]]
        bass.add(bass_note(hi if k % 4 == 3 else lo, BEAT / 2 * 0.85, 1100), b, 0.6)
    for h0, notes, _ in harmony:
        length = (44 if h0 == 42 else [h[0] for h in harmony if h[0] > h0][0]) - h0
        music.add(pad_chord([n[:-1] + str(int(n[-1]) + 1) for n in notes], T(length), 2400, attack=0.05), h0, 0.3)
    for k in range(24):
        b = 32 + k / 2
        if k % 2 == 1:
            notes = chord(b)[1]
            music.add(pluck([n[:-1] + str(int(n[-1]) + 2) for n in notes], 0.18, 2600), b, 0.16, pan=0.3)
    # JACKPOT sting
    for i, nt in enumerate(("D5", "F5", "A5", "D6")):
        music.add(pluck([nt], 0.5, 4200), 41 + i * 0.25, 0.32, pan=-0.2 + 0.13 * i)
    music.add(bell("D6", 1.6), 42, 0.18)

    # ---- debrief b44-47: pull back to a Dm pad, heartbeat returns
    music.add(pad_chord(Dm, T(3), 900, attack=0.05, release=0.4), 44, 0.4)
    drums.add(kick(soft=True), 44, 0.5)
    drums.add(kick(soft=True), 44.33, 0.3)
    fx.add(riser(T(1.5)), 45.5, 0.25)

    # ---- end card b47-50: impact + bell, D major resolve
    fx.add(sub_drop(1.6, 70, 28), 47, 0.9)
    fx.add(crash(2.0), 47, 0.35)
    drums.add(kick(), 47, 0.9)
    music.add(pad_chord(["D3", "F#3", "A3", "D4"], T(3.2), 2000, attack=0.02, release=0.8), 47, 0.42)
    music.add(bell("D5", 2.4), 47, 0.3)
    music.add(bell("A5", 2.0), 47.5, 0.16)

    # ---- mix the bed
    kick_t = [T(b) for b in range(32, 44)]
    pump = sidechain(kick_t, bass.x.shape[1], 0.4, 0.1)
    ir = reverb_ir(1.8, 0.45)
    wet_src = music.x * 0.4 + fx.x * 0.15 + drums.x * 0.08
    wet = np.stack([signal.fftconvolve(wet_src[c], ir[c])[: wet_src.shape[1]] for c in range(2)])
    bed = drums.x * 0.85 + bass.x * pump * 0.8 + music.x * pump * 0.75 + fx.x * 0.8 + wet * 0.5
    bed = np.stack([filt(ch, "highpass", 25) for ch in bed])[:, :N]
    # a breath of silence right before the drop
    a, b = int(T(31.82) * SR), int(T(32.0) * SR)
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
                 "sections": {"hook": [0, 6], "where": [6, 9], "call": [9, 12], "sarah": [12, 21], "bryan": [21, 26],
                              "ask": [26, 32], "drop": [32, 44], "debrief": [44, 47], "end": [47, 50]},
                 "source": "hurricane-reel/audio/score.py click track, librosa beat_track + onsets, linear fit"})
    (FILM / "beats.json").write_text(json.dumps(grid, indent=1))
    print(f"beats: {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms, fit rms {grid['fit_residual_ms']} ms")

    v, placed = build_vo()
    v = v / (np.abs(v).max() + 1e-9) * 0.7
    sf.write(HERE / "vo.wav", np.stack([v, v]).T, SR, subtype="PCM_24")
    (FILM / "vo.json").write_text(json.dumps([{"t0": round(a, 3), "t1": round(b, 3), "text": t} for a, b, t in placed], indent=1))


if __name__ == "__main__":
    main()
