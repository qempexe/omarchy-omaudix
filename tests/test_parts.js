// Run with: node tests/test_parts.js
// Every visual and every color mode: well formed, and drawing without errors or
// broken numbers at any size, for loud, quiet and empty frames.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { load, mockCtx } = require("./load.js");

const ROOT = path.join(__dirname, "..");
const js = (f) => path.join(ROOT, "qml/js", f);
const Draw = load(js("Draw.js"));
const Visuals = load(js("Visuals.js"));
const Colors = load(js("Colors.js"));
const Schema = load(js("Schema.js"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const schemaOf = (key) => manifest.barWidget.schema.find((s) => s.key === key);

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log("ok  " + name); }
    catch (e) { console.log("FAIL " + name + "\n     " + (e && e.message)); process.exitCode = 1; }
}

const colorCtx = {
    fg: [234, 219, 200], custom: [122, 162, 247], custom2: [247, 118, 142], accent: [200, 146, 90],
    palette: [[210, 122, 82], [158, 206, 106], [122, 162, 247]], border: [[18, 232, 218], [165, 134, 253]],
    cover: [[40, 90, 160], [230, 180, 60]], level: 0.6
};

function frame(kind, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
        if (kind === "empty") break;
        if (kind === "quiet") out.push(0);
        else if (kind === "scope") out.push(Math.sin(i / n * Math.PI * 6) * 0.8);
        else out.push(Math.abs(Math.sin(i * 1.7)) * 0.95);
    }
    return out;
}

function drawOnce(visual, mode, w, h, levels, st, mem) {
    const ctx = mockCtx();
    const g = Draw.make({
        ctx, w, h, levels, st, mem, count: 20, colorCtx,
        colorAt: (t, v, c) => Colors.at(mode, t, v, c)
    });
    visual.draw(g);
    return ctx;
}

test("visual keys are unique and every visual is complete", () => {
    assert.strictEqual(new Set(Visuals.keys).size, Visuals.keys.length);
    for (const v of Visuals.list) {
        assert.ok(/^[a-z][a-z0-9]*$/.test(v.key), v.key);
        assert.ok(typeof v.label === "string" && v.label.length > 0, v.key + " label");
        assert.ok(typeof v.about === "string" && v.about.length > 10, v.key + " about");
        assert.strictEqual(typeof v.draw, "function", v.key + " draw");
    }
});

test("every visual draws cleanly at every size, loud, quiet and empty", () => {
    for (const v of Visuals.list) {
        for (const [w, h] of [[72, 18], [24, 18], [240, 18], [20, 20], [300, 40], [3, 3]]) {
            const st = Draw.freshState(), mem = {};
            for (const kind of ["loud", "quiet", "empty", v.scope ? "scope" : "loud"]) {
                const levels = frame(kind, v.scope ? 64 : 20);
                Draw.advance(st, levels);
                for (let k = 0; k < 3; k++) {
                    const ctx = drawOnce(v, "theme", w, h, levels, st, mem);
                    assert.deepStrictEqual(ctx.bad, [], v.key + " " + w + "x" + h + " " + kind);
                }
            }
        }
    }
});

test("the visuals that draw something do so with sound", () => {
    for (const v of Visuals.list) {
        const st = Draw.freshState();
        const levels = frame(v.scope ? "scope" : "loud", 20);
        Draw.advance(st, levels);
        const ctx = drawOnce(v, "theme", 72, 18, levels, st, {});
        assert.ok(ctx.calls.n > 3, v.key + " drew nothing");
    }
});

test("color modes are complete and give real colors", () => {
    assert.strictEqual(new Set(Colors.keys).size, Colors.keys.length);
    for (const m of Colors.list) {
        assert.ok(m.label && m.about, m.key);
        for (const t of [0, 0.25, 0.5, 1]) for (const v of [-1, 0, 0.5, 1]) {
            const c = Colors.at(m.key, t, v, colorCtx);
            assert.ok(c.length >= 3 && c.slice(0, 3).every((x) => isFinite(x) && x >= 0 && x <= 255.5), m.key + " " + c);
            if (c.length > 3) assert.ok(c[3] >= 0 && c[3] <= 1, m.key + " alpha");
        }
    }
});

test("color modes fall back to the text color when their colors are missing", () => {
    const bare = { fg: [10, 20, 30] };
    for (const m of Colors.list) {
        const c = Colors.at(m.key, 0.5, 0.5, bare);
        assert.ok(c.slice(0, 3).every((x) => isFinite(x)), m.key);
    }
});

test("the manifest lists the same styles and color modes as the registries", () => {
    assert.deepStrictEqual(schemaOf("vizStyle").options, Array.from(Visuals.keys));
    assert.deepStrictEqual(schemaOf("colorMode").options, Array.from(Colors.keys));
});

test("Draw helpers", () => {
    assert.strictEqual(JSON.stringify(Draw.hex("#ff8000")), "[255,128,0]");
    assert.strictEqual(Draw.hex("red"), null);
    const r = Draw.hsl(0, 1, 0.5);
    assert.ok(Math.abs(r[0] - 255) < 1 && r[1] < 1 && r[2] < 1);
    assert.strictEqual(Draw.sample([0, 1], 1, 3), 0.5);
    assert.strictEqual(Draw.css([255, 0, 0], 0.5), "rgba(255,0,0,0.500)");
});

test("the manifest's settings match the schema: defaults and options", () => {
    for (const s of manifest.barWidget.schema) {
        const it = Schema.byKey[s.key];
        if (s.key === "player") { assert.strictEqual(s.defaultValue, Schema.hidden.player); continue; }
        assert.ok(it, s.key + " missing from Schema.js");
        assert.strictEqual(JSON.stringify(s.defaultValue), JSON.stringify(it.fallback), s.key + " default");
        if (s.type === "enum") assert.strictEqual(JSON.stringify(s.options), JSON.stringify(Array.from(it.options)), s.key + " options");
        if (s.type === "integer") { assert.strictEqual(s.min, it.min, s.key); assert.strictEqual(s.max, it.max, s.key); }
    }
});

test("every schema item is complete and its default is valid", () => {
    const seen = new Set();
    for (const it of Schema.items) {
        assert.ok(!seen.has(it.key), "twice: " + it.key); seen.add(it.key);
        assert.ok(it.label && it.hint, it.key);
        assert.strictEqual(JSON.stringify(Schema.cleanValue(it.key, it.fallback)), JSON.stringify(it.fallback), it.key);
        for (const c of it.when || []) assert.ok(Schema.byKey[c.key], it.key + " depends on " + c.key);
    }
});

test("values are checked: wrong types, out of range, unknown options", () => {
    assert.strictEqual(Schema.cleanValue("vizWidth", 9999), 240);
    assert.strictEqual(Schema.cleanValue("vizWidth", "50"), 50);
    assert.strictEqual(Schema.cleanValue("vizWidth", "x"), 72);
    assert.strictEqual(Schema.cleanValue("showText", "false"), false);
    assert.strictEqual(Schema.cleanValue("vizStyle", "nope"), "bars");
    assert.strictEqual(Schema.cleanValue("customColor", "red"), "#7aa2f7");
    assert.strictEqual(Schema.cleanValue("separator", "abcdefgh"), "abcde");
    assert.strictEqual(Schema.cleanValue("startLook", 3), "3");
});

test("settings are layered: defaults, then shell.json, then the panel", () => {
    const r = Schema.resolve({ vizStyle: "wave", fps: 45 }, { vizStyle: "ring", fps: null });
    assert.strictEqual(r.vizStyle, "ring");
    assert.strictEqual(r.fps, 45);
    assert.strictEqual(r.barCount, 20);
});

test("an old settings file still reads the same", () => {
    const old = { vizStyle: "capsules", vizSide: "both", coverSide: "center", coverSize: 16, barCount: 56,
                  textFormat: "title", colorMode: "rainbow", separator: " \u2022 ", sensitivity: 145, textWidth: 100,
                  player: "org.mpris.MediaPlayer2.chromium.instance2990357" };
    const r = Schema.resolve(null, old);
    for (const k in old) assert.strictEqual(r[k], old[k], k);
});

test("ready made looks only set look keys, all valid, and are told apart", () => {
    const seen = new Set();
    for (const L of Schema.looks) {
        for (const k in L.set) assert.ok(Schema.lookKeys.indexOf(k) >= 0, L.key + ": " + k + " is not a look key");
        const full = Schema.lookSet(L.key);
        for (const k in L.set) assert.strictEqual(String(full[k]), String(L.set[k]), L.key + "." + k);
        const sig = JSON.stringify(full);
        assert.ok(!seen.has(sig), L.key + " is the same as another look"); seen.add(sig);
        assert.strictEqual(Schema.lookNow(Object.assign(Schema.defaults(), full)), L.key);
    }
});

test("imported looks keep only look keys", () => {
    const L = Schema.cleanLook({ vizStyle: "neon", player: "evil", hideWhenPaused: true, vizWidth: 1e9 });
    assert.strictEqual(L.vizStyle, "neon");
    assert.strictEqual(L.vizWidth, 240);
    assert.strictEqual(L.player, undefined);
    assert.strictEqual(L.hideWhenPaused, undefined);
    assert.strictEqual(Schema.cleanLook("x"), null);
    assert.strictEqual(Schema.cleanLook({ nothing: 1 }), null);
});

test("search finds settings by their words", () => {
    const hits = Schema.items.filter((it) => Schema.matches(it, "scroll speed")).map((it) => it.key);
    assert.ok(hits.indexOf("scrollSpeed") >= 0);
    assert.strictEqual(Schema.items.filter((it) => Schema.matches(it, "zzzz")).length, 0);
});

test("your own places keep every setting and give all of it back", () => {
    const mine = Object.assign(Schema.defaults(), { vizStyle: "ring", clickAction: "next",
        player: "org.mpris.MediaPlayer2.spotify", panelColor: "monochrome", fps: 45, startLook: "3" });
    const kept = Schema.settingsOf(mine);
    for (const k of ["vizStyle", "clickAction", "player", "panelColor", "fps"])
        assert.strictEqual(String(kept[k]), String(mine[k]), k);
    assert.strictEqual(kept.startLook, undefined, "Look at login stays out");
    assert.strictEqual(Object.keys(kept).length, Object.keys(Schema.defaults()).length - 1);
    const back = Schema.cleanSettings(JSON.parse(JSON.stringify(kept)));
    assert.strictEqual(JSON.stringify(back), JSON.stringify(kept));
    assert.strictEqual(Schema.cleanSettings({ fps: 9999, nonsense: 1 }).fps, 60);
    assert.strictEqual(Schema.cleanSettings({ nonsense: 1 }), null);
});

console.log(passed + " passed");
