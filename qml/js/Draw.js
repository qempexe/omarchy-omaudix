.pragma library

// What every visual draws with. Visualizer.qml builds one `g` per frame with
// make() and hands it to the visual's draw(g); a visual never needs to import
// anything itself.
//
// g: {
//   ctx, w, h          the canvas and its size
//   levels             the frame: 0..1 per band (spectrum) or -1..1 per point (scope)
//   at(i, n)           the level at slot i of n, resampled from whatever the engine sent
//   peak(i, n)         the slowly falling maximum at slot i of n
//   st                 { level, bass, centre, peakLevel, phase }: loudness 0..1, low end
//                      0..1, where the energy sits 0 (lows) .. 1 (highs), a slowly falling
//                      max of level, and a phase that moves on with every frame
//   mem                an object the visual may keep things in between frames (cleared
//                      when the visual changes)
//   color(t, v, a)     css color at position t (0..1 along the visual) for an element as
//                      loud as v (0..1, or -1 when it has no loudness of its own), with
//                      opacity a (default 1). The color mode decides what that means.
//   gradient(a)        a left to right canvas gradient through color(t)
//   bands()            { n, gap, bw }: how many bars fit, the gap and a bar's width
//   smooth(xs, ys), poly(xs, ys)   add a path through points
//   glowLine(xs, ys, smooth, core) a line with a soft halo
//   clamp(v, lo, hi), frac(x), hash(i, seed)
// }

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function frac(x) { return x - Math.floor(x); }
function hash(i, seed) { return frac(Math.sin(i * 12.9898 + (seed || 0) * 78.233) * 43758.5453); }

// level at slot i of n, linearly resampled from data
function sample(data, i, n) {
    const m = data ? data.length : 0;
    if (m === 0) return 0;
    if (m === 1 || n <= 1) return Number(data[0]) || 0;
    const pos = i * (m - 1) / (n - 1);
    const a = Math.floor(pos);
    const b = Math.min(m - 1, a + 1);
    const f = pos - a;
    return (Number(data[a]) || 0) * (1 - f) + (Number(data[b]) || 0) * f;
}

// ---- colors ------------------------------------------------------------------------
// Colors are [r, g, b] from 0 to 255, or [r, g, b, a] with a from 0 to 1.

function hex(text) {
    const t = typeof text === "string" ? text : "";
    if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t)) return null;
    return [parseInt(t.substr(1, 2), 16), parseInt(t.substr(3, 2), 16), parseInt(t.substr(5, 2), 16)];
}
function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function hsl(h, s, l) {
    const k = (n) => (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
}
function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
// a color along a list of colors, t from 0 to 1
function along(list, t) {
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0];
    const x = clamp(t, 0, 1) * (list.length - 1);
    const i = Math.min(list.length - 2, Math.floor(x));
    return mix(list[i], list[i + 1], x - i);
}
function css(c, a) {
    const al = clamp((c.length > 3 ? c[3] : 1) * (typeof a === "number" ? a : 1), 0, 1);
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + al.toFixed(3) + ")";
}

// ---- paths -------------------------------------------------------------------------

// a smooth path through points, using midpoint quadratic segments
function smoothPath(ctx, xs, ys) {
    const n = xs.length;
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < n - 1; i++)
        ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
    ctx.lineTo(xs[n - 1], ys[n - 1]);
}
function polyPath(ctx, xs, ys) {
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
}

// ---- motion between frames -----------------------------------------------------------
// Called once per new frame, so nothing moves while the music is paused.

function freshState() { return { level: 0, bass: 0, centre: 0.5, peakLevel: 0, phase: 0, peaks: [] }; }

function advance(st, data) {
    const m = data ? data.length : 0;
    let sum = 0, weighted = 0, low = 0, lowN = 0;
    const quarter = Math.max(1, Math.floor(m / 4));
    for (let i = 0; i < m; i++) {
        const v = Math.abs(Number(data[i]) || 0);
        sum += v;
        weighted += v * i;
        if (i < quarter) { low += v; lowN++; }
    }
    const now = clamp((m > 0 ? sum / m : 0) * 1.7, 0, 1);
    const bass = clamp((lowN > 0 ? low / lowN : 0) * 1.3, 0, 1);
    // eased, so the visuals that follow these glide instead of jumping
    st.level += (now - st.level) * 0.55;
    st.bass += (bass - st.bass) * 0.55;
    if (m > 1 && sum > 0.05) st.centre += (clamp(weighted / sum / (m - 1) * 1.7, 0, 1) - st.centre) * 0.4;
    st.peakLevel = Math.max(now, st.peakLevel - 0.02);
    const np = 64, old = st.peaks, next = new Array(np);
    for (let i = 0; i < np; i++) {
        const held = old && old.length === np ? old[i] : 0;
        next[i] = Math.max(clamp(Math.abs(sample(data, i, np)), 0, 1), held - 0.03);
    }
    st.peaks = next;
    st.phase = (st.phase + 0.3) % (2 * Math.PI);
    return st;
}

// ---- the g every visual gets ---------------------------------------------------------
//
// o: { ctx, w, h, levels, st, mem, count, colorAt(t, v, c) -> [r,g,b,a], colorCtx }

function make(o) {
    const ctx = o.ctx, w = o.w, h = o.h, levels = o.levels || [];
    const cc = o.colorCtx || {};
    const colorAt = o.colorAt;
    const count = o.count || 20;
    const g = {
        ctx: ctx, w: w, h: h, levels: levels, st: o.st || freshState(), mem: o.mem || {},
        count: count,
        clamp: clamp, frac: frac, hash: hash,
        at: (i, n) => sample(levels, i, n),
        peak: (i, n) => sample(g.st.peaks, i, n),
        rgb: (t, v) => colorAt(clamp(t, 0, 1), typeof v === "number" ? v : -1, cc),
        color: (t, v, a) => css(g.rgb(t, v), a),
        gradient: (a, x0, x1) => {
            const gr = ctx.createLinearGradient(typeof x0 === "number" ? x0 : 0, 0, typeof x1 === "number" ? x1 : w, 0);
            for (let k = 0; k <= 4; k++) gr.addColorStop(k / 4, g.color(k / 4, -1, a));
            return gr;
        },
        bands: () => {
            const n = Math.max(2, Math.min(count, Math.floor(w / 2)));
            const gap = Math.max(1, Math.round(w / n * 0.22));
            return { n: n, gap: gap, bw: Math.max(1, (w - gap * (n - 1)) / n) };
        },
        smooth: (xs, ys) => smoothPath(ctx, xs, ys),
        poly: (xs, ys) => polyPath(ctx, xs, ys),
        // a line with a soft halo: two wide faint passes under a crisp core
        glowLine: (xs, ys, smooth, core) => {
            const passes = [[core * 3.4, 0.13], [core * 2.0, 0.25], [core, 1.0]];
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.strokeStyle = g.gradient();
            for (const [width, alpha] of passes) {
                ctx.globalAlpha = alpha;
                ctx.lineWidth = width;
                ctx.beginPath();
                if (smooth) smoothPath(ctx, xs, ys); else polyPath(ctx, xs, ys);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        }
    };
    return g;
}
