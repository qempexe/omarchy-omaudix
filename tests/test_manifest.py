#!/usr/bin/python3
"""Checks manifest.json against the code, and that untrusted text is never shown as rich text."""
import json, os, re, sys, unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def read(name):
    with open(os.path.join(ROOT, name)) as fh:
        return fh.read()


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.m = json.loads(read("manifest.json"))
        self.bw = self.m["barWidget"]

    def test_entry_points_exist(self):
        for rel in self.m["entryPoints"].values():
            self.assertTrue(os.path.isfile(os.path.join(ROOT, rel)), rel)

    def test_every_manifest_setting_is_in_the_schema(self):
        # js/Schema.js holds every setting; tests/test_parts.js checks defaults and options
        schema = read("qml/js/Schema.js")
        known = set(re.findall(r'key: "([A-Za-z0-9_]+)"', schema)) | {"player"}
        for s in self.bw["schema"]:
            self.assertIn(s["key"], known, s["key"])
            self.assertEqual(self.bw["defaults"][s["key"]], s["defaultValue"], s["key"])
        self.assertEqual(set(self.bw["defaults"]), {s["key"] for s in self.bw["schema"]})

    def test_every_text_item_is_plain_text(self):
        """MPRIS metadata is attacker-controlled: Text.AutoText would render
        <img src=...> and fetch remote URLs. Every Text item must pin PlainText."""
        names = sorted(os.path.relpath(os.path.join(d, f), ROOT)
                       for d, _, fs in os.walk(os.path.join(ROOT, "qml")) for f in fs if f.endswith(".qml"))
        for name in names:
            lines = read(name).split("\n")
            for i, line in enumerate(lines):
                if not re.match(r"^\s*(?:[\w.]+:\s*)?Text \{\s*$", line):
                    continue
                depth, block = 0, []
                for l in lines[i:]:
                    depth += l.count("{") - l.count("}")
                    block.append(l)
                    if depth <= 0:
                        break
                self.assertTrue(any("textFormat: Text.PlainText" in b for b in block),
                                "%s:%d Text without textFormat: Text.PlainText" % (name, i + 1))


    def test_every_canvas_that_loads_a_picture_lets_it_go(self):
        """A Canvas keeps each picture it loads until unloadImage(): covers change with
        every song, so a file that loads one must also unload the one before."""
        for d, _, fs in os.walk(os.path.join(ROOT, "qml")):
            for f in fs:
                if not f.endswith(".qml"):
                    continue
                name = os.path.relpath(os.path.join(d, f), ROOT)
                text = read(name)
                if "loadImage(" in text.replace("unloadImage(", ""):
                    self.assertIn("unloadImage(", text, name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
