# /// script
# dependencies = ["numpy", "soundfile"]
# ///
# Cut the ElevenLabs take into phrases at its silences and land each on the beat grid.
import json, numpy as np, soundfile as sf
B = json.load(open('beats.json')); P, OFF = B['period'], B['offset']
x, sr = sf.read('audio/vo/take1.wav')
# (take start, take end, beat it lands on, text)
PH = [
  (0.00, 1.60, 0.5, "Luxury isn't loud."),
  (2.04, 3.41, 4.0, "It lives in the details."),
  (3.89, 7.34, 7.0, "For Van Selow Design Build, we built a site to match."),
  (7.80, 10.25, 14.0, "A signature logo that shimmers to life."),
  (10.60, 13.74, 19.0, "A menu that opens their whole world in one hover."),
  (14.12, 16.95, 25.5, "A custom quote form that qualifies every lead."),
  (17.34, 20.27, 31.5, "And an interactive map of every community they serve."),
  (20.69, 22.37, 38.0, "All of it, built for speed."),
  (22.78, 24.59, 42.0, "Your clients expect luxury."),
  (25.04, 27.40, 46.5, "WD Morgan Solutions delivers it."),
]
out = np.zeros(int(30 * sr)); pad = int(0.03 * sr); fade = int(0.02 * sr)
prev_end, rows = 0, []
for a, b, beat, txt in PH:
    seg = x[max(0, int(a * sr) - pad):int(b * sr) + pad].copy()
    ramp = np.linspace(0, 1, fade); seg[:fade] *= ramp; seg[-fade:] *= ramp[::-1]
    t0 = OFF + beat * P - pad / sr
    i = int(t0 * sr); out[i:i + len(seg)] += seg
    rows.append({'beat': beat, 't': round(t0 + pad / sr, 3), 'end': round(t0 + len(seg) / sr, 3), 'text': txt})
    print(f'{beat:5} {t0:6.2f}-{t0 + len(seg) / sr:6.2f}  gap {t0 - prev_end:+.2f}  {txt}'); prev_end = t0 + len(seg) / sr
sf.write('audio/vo.wav', out, sr)
json.dump(rows, open('audio/vo_phrases.json', 'w'), indent=1)
