#!/usr/bin/python3
"""Omaudix audio helper.

Prints one frame per line on stdout, values separated by single spaces:

  --mode spectrum   N integers, 0..100     (frequency bars)
  --mode scope      N integers, -100..100  (oscilloscope trace)

Spectrum engines: cava (preferred) or a built-in FFT fallback that only needs
pw-record. Only the Python standard library and /usr/bin/{cava,pw-record,pactl}
are used. Children die with this process, and this process dies with its parent.

Exit codes: 0 normal, 4 cava failed (engine=cava), 5 capture stream ended,
127 a required program is missing.
"""
import argparse
import cmath
import ctypes
import math
import os
import signal
import subprocess
import sys
import tempfile
import time
from array import array

PW_RECORD = "/usr/bin/pw-record"
PACTL = "/usr/bin/pactl"
CAVA = "/usr/bin/cava"

RATE = 16000          # mono s16 capture rate used by the built-in engines
FFT_SIZE = 512
SCOPE_POINTS = 64
SCOPE_WINDOW = 640    # samples shown per frame (40 ms)
SCOPE_SEARCH = 384    # samples searched for a trigger crossing
KEEP = SCOPE_WINDOW + SCOPE_SEARCH
F_MIN, F_MAX = 45.0, 7500.0

PR_SET_PDEATHSIG = 1


# --------------------------------------------------------------------------
# process plumbing
# --------------------------------------------------------------------------
def _pdeathsig(sig):
    try:
        ctypes.CDLL(None, use_errno=True).prctl(PR_SET_PDEATHSIG, int(sig), 0, 0, 0)
    except Exception:
        pass


def _child_setup():
    _pdeathsig(signal.SIGKILL)


def spawn(argv):
    return subprocess.Popen(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        close_fds=True,
        preexec_fn=_child_setup,
    )


def stop(proc):
    if proc is None:
        return
    if proc.poll() is None:
        try:
            proc.terminate()
            proc.wait(timeout=1.0)
        except Exception:
            try:
                proc.kill()
                proc.wait(timeout=1.0)
            except Exception:
                pass
    try:
        proc.stdout.close()
    except Exception:
        pass


def runnable(path):
    return os.path.isfile(path) and os.access(path, os.X_OK)


def runtime_dir():
    d = os.environ.get("XDG_RUNTIME_DIR", "")
    return d if d and os.path.isdir(d) else tempfile.gettempdir()


def default_sink():
    if not runnable(PACTL):
        return None
    try:
        out = subprocess.run(
            [PACTL, "get-default-sink"],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, timeout=2.0,
        )
        name = out.stdout.decode("utf-8", "replace").strip()
        return name if out.returncode == 0 and name else None
    except Exception:
        return None


def emit(values):
    try:
        sys.stdout.write(" ".join(str(int(v)) for v in values) + "\n")
        sys.stdout.flush()
    except (BrokenPipeError, OSError):
        sys.exit(0)


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


# --------------------------------------------------------------------------
# PCM capture of the default output (monitor) via pw-record
# --------------------------------------------------------------------------
def open_capture(fps):
    latency = int(clamp(1000 // max(1, fps), 8, 30))
    argv = [PW_RECORD, "--rate", str(RATE), "--channels", "1", "--format", "s16",
            "--latency", "%dms" % latency, "-P", "{ stream.capture.sink=true }"]
    sink = default_sink()
    if sink:
        argv += ["--target", sink]
    argv.append("-")
    return spawn(argv)


def pcm_windows(fd, fps, keep=KEEP, clock=time.monotonic):
    """Yield the most recent `keep` samples, paced to at most `fps` per second.

    Older audio is dropped instead of queued, so a slow consumer never builds
    up latency. Ends when the stream closes.
    """
    buf = array("h")
    carry = b""
    interval = 1.0 / max(1, fps)
    due = 0.0
    while True:
        data = os.read(fd, 65536)
        if not data:
            return
        data = carry + data
        n = len(data) & ~1
        carry = data[n:]
        chunk = array("h")
        chunk.frombytes(data[:n])
        buf.extend(chunk)
        if len(buf) > keep:
            del buf[: len(buf) - keep]
        now = clock()
        if len(buf) >= keep and now >= due:
            due = max(due + interval, now)
            yield buf


# --------------------------------------------------------------------------
# oscilloscope
# --------------------------------------------------------------------------
class Scope:
    def __init__(self, points=SCOPE_POINTS, gain=100):
        self.points = points
        self.gain = gain / 100.0
        self.env = 0.0

    def frame(self, samples):
        n = len(samples)
        start = 0
        limit = min(SCOPE_SEARCH, n - SCOPE_WINDOW - 1)
        for i in range(max(0, limit)):          # rising zero crossing = stable picture
            if samples[i] <= 0 < samples[i + 1]:
                start = i
                break
        window = samples[start:start + SCOPE_WINDOW]
        if len(window) < self.points:
            return [0] * self.points
        peak = max(max(window), -min(window)) / 32768.0
        self.env = max(peak, self.env * 0.995)            # slow automatic gain
        scale = 0.85 / max(self.env, 0.04) * self.gain
        out = []
        w = len(window)
        for k in range(self.points):
            a, b = k * w // self.points, (k + 1) * w // self.points
            seg = window[a:b]
            m = sum(seg) / (len(seg) * 32768.0)
            out.append(round(clamp(m * scale, -1.0, 1.0) * 100))
        return out


# --------------------------------------------------------------------------
# built-in spectrum (radix-2 FFT, log-spaced bands)
# --------------------------------------------------------------------------
def make_fft(n):
    bits = n.bit_length() - 1
    rev = [int(format(i, "0%db" % bits)[::-1], 2) for i in range(n)]
    tw = [cmath.exp(-2j * math.pi * k / n) for k in range(n // 2)]

    def fft(x):
        a = [x[r] + 0j for r in rev]
        size = 2
        while size <= n:
            half, step = size >> 1, n // size
            for s in range(0, n, size):
                k = 0
                for j in range(s, s + half):
                    t = a[j + half] * tw[k]
                    u = a[j]
                    a[j] = u + t
                    a[j + half] = u - t
                    k += step
            size <<= 1
        return a

    return fft


class Spectrum:
    def __init__(self, bars, gain=100, smooth=60):
        self.bars = bars
        self.gain = gain / 100.0
        self.decay = 0.55 + 0.42 * clamp(smooth, 0, 100) / 100.0
        self.fft = make_fft(FFT_SIZE)
        self.win = [0.5 - 0.5 * math.cos(2 * math.pi * i / (FFT_SIZE - 1))
                    for i in range(FFT_SIZE)]
        self.prev = [0.0] * bars
        hz = RATE / FFT_SIZE
        edges = [F_MIN * (F_MAX / F_MIN) ** (i / bars) for i in range(bars + 1)]
        self.bands = []
        for i in range(bars):
            lo, hi = edges[i] / hz, edges[i + 1] / hz
            centre_hz = math.sqrt(edges[i] * edges[i + 1])
            tilt = 4.5 * math.log2(centre_hz / 300.0)       # highs carry less energy
            self.bands.append((lo, hi, tilt))

    def frame(self, samples):
        x = samples[-FFT_SIZE:]
        spec = self.fft([x[i] / 32768.0 * self.win[i] for i in range(FFT_SIZE)])
        mags = [abs(c) * 4.0 / FFT_SIZE for c in spec[: FFT_SIZE // 2 + 1]]
        out = []
        for i, (lo, hi, tilt) in enumerate(self.bands):
            if hi - lo < 1.0:                                # interpolate narrow bands
                c = math.sqrt(lo * hi)
                a = int(c)
                f = c - a
                m = mags[a] * (1 - f) + mags[min(a + 1, len(mags) - 1)] * f
            else:
                m = max(mags[int(lo): max(int(lo) + 1, int(math.ceil(hi)))])
            db = 20.0 * math.log10(max(m, 1e-7)) + tilt
            raw = clamp((db + 75.0) / 60.0, 0.0, 1.0)
            p = self.prev[i]
            v = p + (raw - p) * 0.7 if raw > p else max(raw, p * self.decay)
            self.prev[i] = v
            out.append(round(clamp(v * self.gain, 0.0, 1.0) * 100))
        return out


# --------------------------------------------------------------------------
# cava engine
# --------------------------------------------------------------------------
def cava_config(bars, fps, smooth):
    return "\n".join([
        "[general]", "bars = %d" % bars, "framerate = %d" % fps,
        "lower_cutoff_freq = 50", "higher_cutoff_freq = 12000",
        "[input]", "method = pipewire", "source = auto",
        "[output]", "method = raw", "raw_target = /dev/stdout",
        "data_format = ascii", "ascii_max_range = 100",
        "bar_delimiter = 59", "frame_delimiter = 10",
        "channels = mono", "mono_option = average",
        "[smoothing]", "noise_reduction = %d" % clamp(smooth, 0, 100), "",
    ])


def run_cava(args):
    """Return True if cava produced frames (then ran until the stream ended)."""
    fd, path = tempfile.mkstemp(prefix="omaudix-", suffix=".conf", dir=runtime_dir())
    with os.fdopen(fd, "w") as fh:
        fh.write(cava_config(args.bars, args.fps, args.smooth))
    proc = None
    frames = 0
    try:
        proc = spawn([CAVA, "-p", path])
        for raw in proc.stdout:
            if frames == 0:
                try:
                    os.unlink(path)       # cava has read its config by now
                except OSError:
                    pass
            parts = [p for p in raw.decode("ascii", "ignore").strip().split(";") if p]
            try:
                vals = [clamp(int(p) * args.gain // 100, 0, 100) for p in parts]
            except ValueError:
                continue
            if len(vals) < args.bars:
                vals += [0] * (args.bars - len(vals))
            emit(vals[: args.bars])
            frames += 1
    finally:
        stop(proc)
        try:
            os.unlink(path)
        except OSError:
            pass
    return frames > 0


# --------------------------------------------------------------------------
# entry point
# --------------------------------------------------------------------------
def run_pcm(engine_obj, fps):
    if not runnable(PW_RECORD):
        return 127
    proc = open_capture(fps)
    try:
        for window in pcm_windows(proc.stdout.fileno(), fps):
            emit(engine_obj.frame(window))
    finally:
        stop(proc)
    return 5


def parse(argv):
    p = argparse.ArgumentParser(prog="viz.py")
    p.add_argument("--mode", choices=("spectrum", "scope"), default="spectrum")
    p.add_argument("--engine", choices=("auto", "cava", "builtin"), default="auto")
    p.add_argument("--bars", type=int, default=20)
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--gain", type=int, default=100)
    p.add_argument("--smooth", type=int, default=60)
    a = p.parse_args(argv)
    a.bars = int(clamp(a.bars, 4, 96))
    a.fps = int(clamp(a.fps, 10, 60))
    a.gain = int(clamp(a.gain, 10, 500))
    a.smooth = int(clamp(a.smooth, 0, 100))
    return a


def main(argv=None):
    args = parse(sys.argv[1:] if argv is None else argv)
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    _pdeathsig(signal.SIGTERM)
    if os.getppid() == 1:
        return 0

    if args.mode == "scope":
        return run_pcm(Scope(SCOPE_POINTS, args.gain), args.fps)

    if args.engine in ("auto", "cava") and runnable(CAVA):
        if run_cava(args):
            return 0
        if args.engine == "cava":
            return 4
    elif args.engine == "cava":
        return 127
    return run_pcm(Spectrum(args.bars, args.gain, args.smooth), args.fps)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception:
        sys.exit(1)
