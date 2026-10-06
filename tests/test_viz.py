#!/usr/bin/python3
"""Run with: python3 tests/test_viz.py"""
import io
import math
import os
import stat
import sys
import tempfile
import threading
import unittest
from array import array
from contextlib import redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import viz  # noqa: E402


def sine(freq, n, amp=0.5, rate=viz.RATE):
    return array("h", [int(amp * 32767 * math.sin(2 * math.pi * freq * i / rate)) for i in range(n)])


class SpectrumTests(unittest.TestCase):
    def peak_bar(self, freq, bars=24):
        sp = viz.Spectrum(bars, gain=100, smooth=0)
        samples = sine(freq, viz.KEEP)
        for _ in range(4):                      # let attack smoothing settle
            out = sp.frame(samples)
        return out.index(max(out)), out

    def test_low_tone_lands_in_low_bars_high_tone_in_high_bars(self):
        lo, _ = self.peak_bar(100)
        hi, _ = self.peak_bar(4000)
        self.assertLess(lo, 8)
        self.assertGreater(hi, 14)
        self.assertGreater(hi, lo)

    def test_values_in_range_and_silence_is_flat(self):
        _, out = self.peak_bar(1000)
        self.assertTrue(all(0 <= v <= 100 for v in out))
        sp = viz.Spectrum(16, 100, 0)
        self.assertEqual(max(sp.frame(array("h", [0] * viz.KEEP))), 0)

    def test_gain_scales_and_clamps(self):
        a = viz.Spectrum(16, 50, 0).frame(sine(500, viz.KEEP, 0.05))
        b = viz.Spectrum(16, 400, 0).frame(sine(500, viz.KEEP, 0.05))
        self.assertGreater(max(b), max(a))
        self.assertLessEqual(max(b), 100)

    def test_decay_is_slower_with_more_smoothing(self):
        def after_silence(smooth):
            sp = viz.Spectrum(16, 100, smooth)
            for _ in range(3):
                sp.frame(sine(500, viz.KEEP))
            return max(sp.frame(array("h", [0] * viz.KEEP)))
        self.assertGreater(after_silence(100), after_silence(0))


class ScopeTests(unittest.TestCase):
    def test_shape_and_range(self):
        out = viz.Scope(64, 100).frame(sine(220, viz.KEEP))
        self.assertEqual(len(out), 64)
        self.assertTrue(all(-100 <= v <= 100 for v in out))
        self.assertGreater(max(out), 40)
        self.assertLess(min(out), -40)

    def test_trigger_makes_frames_repeatable(self):
        a = viz.Scope(64, 100).frame(sine(220, viz.KEEP))
        shifted = sine(220, viz.KEEP + 77)[77:]
        b = viz.Scope(64, 100).frame(shifted)
        diff = sum(abs(x - y) for x, y in zip(a, b)) / 64
        self.assertLess(diff, 12)

    def test_silence_stays_flat(self):
        out = viz.Scope(64, 100).frame(array("h", [0] * viz.KEEP))
        self.assertEqual(set(out), {0})


class PcmWindowTests(unittest.TestCase):
    def test_pacing_and_odd_byte_carry(self):
        r, w = os.pipe()
        data = sine(300, viz.KEEP * 3).tobytes()

        def feed():
            os.write(w, data[:1001])           # odd split on purpose
            os.write(w, data[1001:])
            os.close(w)
        t = threading.Thread(target=feed)
        t.start()
        ticks = iter(range(0, 10_000))
        wins = list(viz.pcm_windows(r, fps=10, clock=lambda: next(ticks) * 0.01))
        t.join()
        os.close(r)
        self.assertTrue(wins)
        self.assertTrue(all(len(x) == viz.KEEP for x in wins))


class EndToEndTests(unittest.TestCase):
    def test_builtin_engine_with_fake_pw_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = os.path.join(tmp, "pw-record")
            pcm = os.path.join(tmp, "audio.raw")
            with open(pcm, "wb") as fh:
                fh.write(sine(1000, viz.RATE).tobytes())
            with open(fake, "w") as fh:     # trickle audio like a live stream
                fh.write("#!/bin/sh\nfor i in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do\n"
                         "  dd if='%s' bs=1600 skip=$i count=1 2>/dev/null\n  sleep 0.03\ndone\n" % pcm)
            os.chmod(fake, os.stat(fake).st_mode | stat.S_IXUSR)
            old = (viz.PW_RECORD, viz.PACTL, viz.CAVA)
            viz.PW_RECORD, viz.PACTL, viz.CAVA = fake, "/nonexistent", "/nonexistent"
            try:
                buf = io.StringIO()
                with redirect_stdout(buf):
                    code = viz.main(["--mode", "spectrum", "--bars", "12", "--fps", "60"])
            finally:
                viz.PW_RECORD, viz.PACTL, viz.CAVA = old
            self.assertEqual(code, 5)           # stream ended -> service retries
            lines = buf.getvalue().strip().splitlines()
            self.assertGreater(len(lines), 3)
            for line in lines:
                vals = [int(v) for v in line.split(" ")]
                self.assertEqual(len(vals), 12)

    def test_missing_dependencies_report_127(self):
        old = (viz.PW_RECORD, viz.CAVA)
        viz.PW_RECORD, viz.CAVA = "/nonexistent", "/nonexistent"
        try:
            self.assertEqual(viz.main(["--mode", "scope"]), 127)
            self.assertEqual(viz.main(["--engine", "cava"]), 127)
            self.assertEqual(viz.main(["--engine", "auto"]), 127)
        finally:
            viz.PW_RECORD, viz.CAVA = old

    def test_arguments_are_clamped(self):
        a = viz.parse(["--bars", "9999", "--fps", "1", "--gain", "-5", "--smooth", "500"])
        self.assertEqual((a.bars, a.fps, a.gain, a.smooth), (96, 10, 10, 100))


if __name__ == "__main__":
    unittest.main(verbosity=2)
