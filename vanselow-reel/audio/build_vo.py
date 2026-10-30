# /// script
# dependencies = ["numpy", "soundfile"]
# ///
# Cut the ElevenLabs take into phrases at its silences and land each on the beat grid.
import json, numpy as np, soundfile as sf
B = json.load(open('beats.json')); P, OFF = B['period'], B['offset']
x, sr = sf.read('audio/vo/take2.wav')
# (take start, take end, beat it lands on, text)
PH = [
  (0.00, 2.11, 1.0, "Your work is world class."),
  (2.49, 4.08, 6.0, "The images speak for themselves."),
  (4.60, 6.56, 10.0, "Your website should be world class too."),
  (7.09, 10.68, 15.0, "For Van Selow Design Build, every detail was considered."),
  (11.16, 14.85, 23.0, "A signature logo that glides into a sticky header as you scroll."),
  (15.33, 18.45, 31.0, "A menu that opens their whole world in one hover."),
  (18.89, 21.68, 38.0, "A custom quote form that qualifies every lead."),
  (22.13, 24.97, 45.0, "An interactive map of every community they serve."),
  (25.42, 27.07, 51.5, "All of it, built for speed."),
  (27.57, 30.89, 56.0, "Work with someone who takes the same care and precision that you do."),
  (31.40, 33.30, 64.0, "WD Morgan Solutions."),
]
out = np.zeros(int(38 * sr)); pad = int(0.03 * sr); fade = int(0.02 * sr)
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
