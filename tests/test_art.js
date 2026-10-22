// Run with: node tests/test_art.js
// The cover pipeline: which cover addresses are taken, and the commands that fetch and
// shrink them, with their limits.
const assert = require("assert");
const path = require("path");
const { load } = require("./load.js");
const Art = load(path.join(__dirname, "..", "qml/js/Art.js"));
const same = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);

same(Art.parse("https://i.scdn.co/image/ab67"), { web: "https://i.scdn.co/image/ab67" });
same(Art.parse("file:///tmp/firefox-mpris/cover%201.png"), { file: "/tmp/firefox-mpris/cover 1.png" }, "local files, decoded");
assert.strictEqual(Art.parse("data:image/png;base64,AAAA"), null, "no inline data");
assert.strictEqual(Art.parse("ftp://x/y.png"), null);
assert.strictEqual(Art.parse("file:///tmp/a[x]"), null, "no vips options in a path");
assert.strictEqual(Art.parse("file:///tmp/../etc/passwd"), null);
assert.strictEqual(Art.parse("https://x/" + "a".repeat(3000)), null, "bounded");

const n = Art.nameOf("https://i.scdn.co/image/ab67");
assert.ok(Art.isName(n) && n === Art.nameOf("https://i.scdn.co/image/ab67"), "a stable name");

const c = Art.curlArgs("https://i.scdn.co/image/ab67", "/c/incoming/" + n + ".img");
assert.strictEqual(c[0], "curl");
assert.strictEqual(c[c.indexOf("--max-filesize") + 1], String(8 * 1048576), "a byte cap on the download");
assert.ok(c.includes("--max-time") && c.includes("=https,http"));
assert.strictEqual(Art.curlArgs("file:///tmp/x.png", "/c/incoming/" + n + ".img"), null, "local files are not fetched");
assert.strictEqual(Art.curlArgs("https://x/y", "/c/incoming/../x.img"), null);

const t = Art.thumbArgs("/c/incoming/" + n + ".img", "/c/covers/" + n + ".png");
assert.strictEqual(t[0], "prlimit", "made in a capped process");
assert.ok(t.some((a) => /^--as=\d+$/.test(a)) && t.includes("vipsthumbnail") && t.includes("256x256"));
assert.strictEqual(t[t.length - 1], "/c/covers/" + n + ".png[keep=none]", "no metadata is kept");
assert.strictEqual(Art.thumbArgs("relative.png", "/c/covers/" + n + ".png"), null);
assert.strictEqual(Art.thumbArgs("/c/x.png", "/c/covers/x.png"), null);
console.log("art tests: ok");
