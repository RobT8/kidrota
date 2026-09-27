# Original, royalty-free backing track synthesised from scratch.
# Bright and bouncy: I–vi–IV–V in F at 112 BPM — marimba, glockenspiel hook,
# walking bass, finger snaps and a soft kick. Ends on a ringing F chord.
import sys, numpy as np, soundfile as sf
SR = 44100
total = float(sys.argv[2])
BPM = 112; beat = 60 / BPM; bar = 4 * beat
n = int(SR * (total + 1)); L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(11)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def put(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR); j = min(n, i + len(sig))
    if i >= n: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2); R[i:j] += s * np.sqrt((1 + pan) / 2)

def marimba(m, vel=1.0):
    # Wooden bar: fundamental plus the characteristic 4x partial, fast decay.
    t = np.arange(int(SR * 1.0)) / SR; f = hz(m)
    env = np.minimum(1, t / 0.001)
    return (np.sin(2*np.pi*f*t) * np.exp(-t * 5.5) + 0.35 * np.sin(2*np.pi*4*f*t) * np.exp(-t * 22)
            + 0.08 * np.sin(2*np.pi*10*f*t) * np.exp(-t * 60)) * env * vel

def glock(m, vel=1.0):
    t = np.arange(int(SR * 1.6)) / SR; f = hz(m)
    return (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*2.76*f*t)*np.exp(-t*8) + 0.2*np.sin(2*np.pi*5.4*f*t)*np.exp(-t*15)) \
        * np.exp(-t * 2.8) * np.minimum(1, t / 0.001) * vel

def bass(m, dur):
    t = np.arange(int(SR * dur)) / SR; f = hz(m)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 2.2) * np.clip((dur - t) / 0.03, 0, 1)
    return (np.sin(2*np.pi*f*t) + 0.25*np.sin(2*np.pi*2*f*t)) * env

def kick():
    t = np.arange(int(SR * 0.3)) / SR
    return np.sin(2*np.pi*(50 + 80*np.exp(-t*35))*t) * np.exp(-t * 11)

def snap():
    x = np.diff(rng.standard_normal(int(SR * 0.12)), prepend=0); t = np.arange(len(x)) / SR
    body = np.sin(2*np.pi*1800*t) * np.exp(-t * 90)
    return (x * 0.6 + body) * np.exp(-t * 45)

def shaker():
    x = np.diff(rng.standard_normal(int(SR * 0.06)), prepend=0); t = np.arange(len(x)) / SR
    return x * np.exp(-t * 70) * np.minimum(1, t / 0.008)

F, Dm, Bb, C = [65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]
prog = [(F, [41, 45, 48, 45]), (Dm, [38, 41, 45, 43]), (Bb, [46, 45, 43, 41]), (C, [36, 40, 43, 40])]
# marimba pattern in sixteenths per bar (index into chord tones, None = rest)
pattern = [0, None, 1, 2, None, 1, 0, None, 2, None, 1, 2, None, 0, 1, None]
hook = [[77, None, 81, None, 79, 77, None, None], [74, None, 77, None, 81, None, 79, None],
        [77, None, 74, None, 70, None, 74, 77], [76, None, 79, None, 84, None, 81, 79]]
end_at = total - 3.2
bars = int(np.ceil(end_at / bar))
six = beat / 4
for b in range(bars):
    t0 = b * bar; chord, walk = prog[b % 4]
    for k, idx in enumerate(pattern):
        tk = t0 + k * six
        if idx is not None and tk < end_at:
            put(marimba(chord[idx] + (12 if k % 8 == 6 else 0), 0.22 if k % 4 == 0 else 0.15), tk, pan=0.3 if k % 2 else -0.2)
    if b == 0: continue                      # one-bar marimba intro
    for e in range(4):
        tb = t0 + e * beat
        if tb >= end_at: break
        put(bass(walk[e], beat * 0.85), tb, gain=0.38)
        if e in (0, 2): put(kick(), tb, gain=0.5)
        if e in (1, 3): put(snap(), tb, gain=0.16, pan=-0.25)
        put(shaker(), tb + beat / 2, gain=0.05, pan=0.45)
        put(shaker(), tb + 3 * beat / 4, gain=0.03, pan=0.45)
    if b >= 2:
        for e, m in enumerate(hook[b % 4]):
            if m and t0 + e * beat / 2 < end_at: put(glock(m, 0.13), t0 + e * beat / 2, pan=0.1)
# ending: marimba roll up an F chord into a ringing glock
for k, m in enumerate([53, 57, 60, 65, 69, 72, 77]):
    put(marimba(m, 0.2), end_at + k * 0.045, pan=-0.3 + 0.1 * k)
put(glock(81, 0.16), end_at + 0.32); put(glock(77, 0.12), end_at + 0.32)
put(bass(41, 2.5), end_at, gain=0.35)
t = np.arange(n) / SR
fade = np.clip((total + 0.2 - t) / 1.5, 0, 1)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.2) * 0.8
sf.write(sys.argv[1], mix[: int(SR * total)], SR)
print('music', total, 's,', bars, 'bars')
