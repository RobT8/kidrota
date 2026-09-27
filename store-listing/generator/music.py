# Original, royalty-free backing track synthesised from scratch.
# Light and upbeat: I–V–vi–IV in C at 104 BPM, e-piano arpeggios, pluck melody,
# soft bass, kick, shaker and claps. Ends on a sustained C chord.
import sys, numpy as np, soundfile as sf
SR = 44100
total = float(sys.argv[2])
BPM = 104; beat = 60 / BPM; bar = 4 * beat
n = int(SR * (total + 1)); L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def put(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR); j = min(n, i + len(sig))
    if i >= n: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2); R[i:j] += s * np.sqrt((1 + pan) / 2)

def epiano(m, dur, vel=1.0):
    t = np.arange(int(SR * (dur + 1.2))) / SR; f = hz(m)
    env = np.exp(-t * 2.6) * np.minimum(1, t / 0.004)
    tone = np.sin(2*np.pi*f*t + 0.9*np.exp(-t*6)*np.sin(2*np.pi*f*2*t)) + 0.18*np.sin(2*np.pi*f*3*t)*np.exp(-t*5)
    rel = np.clip((dur + 1.2 - t) / 1.2, 0, 1)
    return tone * env * rel * vel

def pluck(m, vel=1.0):
    t = np.arange(int(SR * 0.9)) / SR; f = hz(m)
    env = np.exp(-t * 7) * np.minimum(1, t / 0.002)
    return (np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*2*f*t)*np.exp(-t*10) + 0.1*np.sin(2*np.pi*3*f*t)) * env * vel

def bass(m, dur):
    t = np.arange(int(SR * dur)) / SR; f = hz(m)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 1.5) * np.clip((dur - t) / 0.05, 0, 1)
    return np.tanh(1.6 * np.sin(2*np.pi*f*t)) * env

def kick():
    t = np.arange(int(SR * 0.35)) / SR
    return np.sin(2*np.pi*(45 + 90*np.exp(-t*30))*t) * np.exp(-t * 9)

def noise_hit(dur, decay, hp):
    x = rng.standard_normal(int(SR * dur)); x = np.diff(x, prepend=0) if hp else x
    t = np.arange(len(x)) / SR
    return x * np.exp(-t * decay)

C, G, Am, F = [60, 64, 67], [55, 59, 62, 67], [57, 60, 64], [53, 57, 60, 65]
prog = [(C, 36), (G, 43), (Am, 45), (F, 41)]
melody = [[76, None, 74, 76, 79, None, 76, None], [74, None, 71, 74, 79, None, 74, None],
          [72, None, 76, 72, 69, None, 72, None], [72, None, 69, 72, 77, None, 76, 74]]
end_at = total - 3.2          # the end card: stop the groove, ring out a chord
bars = int(np.ceil(end_at / bar))
for b in range(bars):
    t0 = b * bar; chord, root = prog[b % 4]; intro = b == 0
    # e-piano: chord on 1, arpeggiated eighths
    for k, m in enumerate(chord): put(epiano(m, beat * 1.5, 0.22), t0, pan=-0.3 + 0.2 * k)
    arp = chord + [chord[1] + 12, chord[0] + 12]
    for e in range(8):
        if t0 + e * beat / 2 < end_at: put(epiano(arp[e % len(arp)] + 12, beat / 2, 0.10), t0 + e * beat / 2, pan=0.25)
    if intro: continue
    for e in range(4):
        tb = t0 + e * beat
        if tb >= end_at: break
        put(bass(root, beat * 0.9), tb, gain=0.34)
        if e in (0, 2): put(kick(), tb, gain=0.55)
        if e in (1, 3): put(noise_hit(0.18, 22, True), tb, gain=0.11, pan=0.1)
        for h in (0.5,):  # shaker on the off-beat
            put(noise_hit(0.07, 60, True), tb + h * beat, gain=0.06, pan=0.4)
    if b >= 2:                  # melody comes in after two bars
        for e, m in enumerate(melody[b % 4]):
            if m and t0 + e * beat / 2 < end_at: put(pluck(m, 0.20), t0 + e * beat / 2, pan=-0.15)
# ending: a warm, held C major with a little sparkle
for k, m in enumerate([48, 60, 64, 67, 72, 76]): put(epiano(m, 3.0, 0.2), end_at + 0.05, pan=-0.3 + 0.12 * k)
put(pluck(84, 0.15), end_at + 0.05)
# gentle fade and master
t = np.arange(n) / SR
fade = np.clip((total + 0.2 - t) / 1.5, 0, 1)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.2) * 0.8
sf.write(sys.argv[1], mix[: int(SR * total)], SR)
print('music', total, 's,', bars, 'bars')
