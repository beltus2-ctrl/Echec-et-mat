"""Soundtrack generator: a light music bed + sound effects placed on the scene cues.

Usage: python3 audio.py cues.json out.wav
Everything is synthesised (no samples), so the result is free of rights.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def biquad(x, kind, f, q=0.7):
    w = 2 * np.pi * f / SR
    a = np.sin(w) / (2 * q)
    c = np.cos(w)
    if kind == 'lp':
        b0, b1, b2 = (1 - c) / 2, 1 - c, (1 - c) / 2
    elif kind == 'hp':
        b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
    else:  # band-pass
        b0, b1, b2 = a, 0.0, -a
    a0, a1, a2 = 1 + a, -2 * c, 1 - a
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        xi = x[i]
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y[i] = yi
        x2, x1, y2, y1 = x1, xi, y1, yi
    return y


def env(n, attack=0.002, decay=0.1):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    na = max(1, int(attack * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def tone(freq, dur, decay=0.2, kind='sine', attack=0.004):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if kind == 'sine':
        s = np.sin(2 * np.pi * freq * t)
    elif kind == 'tri':
        s = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * freq * t))
    else:
        s = sum(np.sin(2 * np.pi * freq * h * t) / h for h in range(1, 7))
    return s * env(n, attack, decay)


def noise(dur):
    return rng.uniform(-1, 1, int(dur * SR))


def knock(freq=1700, body=210, gain=0.8, decay=0.06):
    n = int(0.16 * SR)
    nz = biquad(noise(0.16), 'bp', freq, 1.4) * env(n, 0.001, decay * 0.6) * 3
    t = np.arange(n) / SR
    f = body * (1 + 0.4 * np.exp(-t / 0.02))
    b = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, decay)
    return (nz + b * 0.8) * gain


def sfx(name):
    if name == 'move':
        return knock()
    if name == 'capture':
        a = knock(1300, 160, 0.95, 0.08)
        b = knock(2100, 240, 0.45, 0.05)
        out = np.zeros(len(a) + int(0.06 * SR))
        out[: len(a)] += a
        out[int(0.06 * SR):] += b
        return out
    if name == 'castle':
        a = knock()
        out = np.zeros(len(a) + int(0.11 * SR))
        out[: len(a)] += a
        out[int(0.11 * SR):] += knock(1500, 190)
        return out
    if name == 'check':
        a = knock(gain=0.9)
        p = tone(880, 0.35, 0.12, 'tri') * 0.3 + tone(1320, 0.35, 0.1) * 0.15
        out = np.zeros(max(len(a), len(p)))
        out[: len(a)] += a
        out[: len(p)] += p
        return out
    if name == 'mate':
        a = knock(1300, 150, 1.0, 0.1)
        out = np.zeros(int(1.2 * SR))
        out[: len(a)] += a
        for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
            s = tone(f, 0.9, 0.35, 'tri') * 0.22
            o = int((0.04 + i * 0.07) * SR)
            out[o: o + len(s)] += s[: len(out) - o]
        return out
    if name in ('tick', 'tick2'):
        f = 1600 if name == 'tick' else 2100
        return tone(f, 0.08, 0.02, 'sine', 0.001) * (0.5 if name == 'tick' else 0.8) + knock(3000, 600, 0.25, 0.02)[: int(0.08 * SR)]
    if name == 'whoosh':
        n = int(0.6 * SR)
        x = noise(0.6)
        y = np.zeros(n)
        # sweep a band-pass by processing chunks
        chunk = 1024
        for i in range(0, n, chunk):
            k = i / n
            y[i: i + chunk] = biquad(x[i: i + chunk], 'bp', 400 + 3600 * k, 0.8)
        e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
        return y * e * 1.6
    if name == 'pop':
        n = int(0.15 * SR)
        t = np.arange(n) / SR
        f = 500 + 900 * (t / 0.15)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.04) * 0.5
    if name == 'chime':
        out = np.zeros(int(1.6 * SR))
        for i, f in enumerate([783.99, 987.77, 1174.66, 1567.98]):
            s = (tone(f, 1.2, 0.5) + tone(f * 2.01, 1.2, 0.25) * 0.3) * 0.22
            o = int(i * 0.09 * SR)
            out[o: o + len(s)] += s
        return out
    if name == 'stamp':
        n = int(0.9 * SR)
        t = np.arange(n) / SR
        f = 120 * np.exp(-t / 0.15) + 40
        boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.25)
        hit = biquad(noise(0.9), 'lp', 3000) * env(n, 0.001, 0.05)
        out = boom * 1.0 + hit * 0.8
        m = sfx('mate')
        out2 = np.zeros(max(len(out), len(m)))
        out2[: len(out)] += out
        out2[: len(m)] += m * 0.9
        return out2
    if name == 'error':
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        s = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 157 * t)) * 0.5
        return biquad(s, 'lp', 1800) * env(n, 0.003, 0.15) * 0.45
    return np.zeros(10)


def music(dur):
    bpm = 100
    beat = 60 / bpm
    n = int(dur * SR)
    out = np.zeros(n)
    # A minor – F – C – G
    chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 261.63, 329.63], [196.0, 246.94, 293.66]]
    bass = [110.0, 87.31, 130.81, 98.0]
    nb = int(dur / beat) + 1
    kick_n = int(0.4 * SR)
    kt = np.arange(kick_n) / SR
    kick = np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-kt / 0.04)) / SR) * env(kick_n, 0.001, 0.14)
    clap = biquad(noise(0.25), 'bp', 1500, 0.9) * env(int(0.25 * SR), 0.001, 0.05) * 1.4
    hat = biquad(noise(0.05), 'hp', 7000) * env(int(0.05 * SR), 0.0005, 0.012) * 0.8

    def add(sig, at, g=1.0):
        o = int(at * SR)
        if o >= n:
            return
        m = min(len(sig), n - o)
        out[o: o + m] += sig[:m] * g

    for b in range(nb):
        t = b * beat
        bar = (b // 4) % 4
        if b % 4 in (0, 2):
            add(kick, t, 0.9)
        if b % 4 in (1, 3):
            add(clap, t, 0.35)
        add(hat, t + beat / 2, 0.25)
        add(hat, t, 0.12)
        # plucked arpeggio, 8th notes
        ch = chords[bar]
        for j in range(2):
            f = ch[(b * 2 + j) % 3] * 2
            add(tone(f, 0.4, 0.12, 'tri') * 0.18, t + j * beat / 2)
        if b % 4 == 0:
            pad = sum(tone(f, beat * 4, 1.6, 'saw', 0.4) for f in ch) * 0.05
            add(biquad(pad, 'lp', 1400), t)
            add(tone(bass[bar], beat * 3.5, 1.2, 'tri', 0.01) * 0.35, t)
    fade = np.ones(n)
    fi = int(0.4 * SR)
    fo = int(1.5 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fade[-fo:] = np.linspace(1, 0, fo)
    return out * fade


def main():
    data = json.load(open(sys.argv[1]))
    dur = data['dur']
    n = int(dur * SR) + SR
    mix = music(dur + 1) * 0.42
    mix = np.pad(mix, (0, max(0, n - len(mix))))[:n]
    cache = {}
    for c in data['cues']:
        name = c['name']
        if name not in cache:
            cache[name] = sfx(name)
        s = cache[name] * c.get('gain', 1)
        o = int(c['t'] * SR)
        m = min(len(s), n - o)
        if m > 0:
            mix[o: o + m] += s[:m] * 0.8
    peak = np.max(np.abs(mix))
    mix = np.tanh(mix / max(peak, 1e-6) * 1.3) * 0.89
    stereo = np.stack([mix, mix], axis=1)
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    main()
