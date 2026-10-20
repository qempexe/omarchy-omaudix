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

console.log(passed + " passed");
