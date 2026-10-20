.pragma library
.import "Paint.js" as Paint
.import "Trace.js" as Trace
.import "parts/Ends.js" as Ends
.import "parts/Surfaces.js" as Surfaces
.import "parts/Lines.js" as Lines
.import "parts/Ornaments.js" as Ornaments

// The plate behind the widget: its options, and the parameters Paint.js draws it
// from. Plain functions, so they can be tested.
//
// A plate is one shape: its ends (parts/Ends.js), what it is made of
// (parts/Surfaces.js), its edge (parts/Lines.js) and decoration (parts/Ornaments.js).
// js/Schema.js holds the settings themselves.

function keysOf(mod) { return mod.list.map((e) => e.key); }
function labelsOf(mod) { const out = {}; for (const e of mod.list) out[e.key] = e.label; return out; }
function aboutsOf(mod) { const out = {}; for (const e of mod.list) if (e.about) out[e.key] = e.about; return out; }

var ends = { options: keysOf(Ends), labels: labelsOf(Ends), abouts: aboutsOf(Ends) };
var surfaces = { options: keysOf(Surfaces), labels: labelsOf(Surfaces), abouts: aboutsOf(Surfaces) };
var lines = { options: keysOf(Lines), labels: labelsOf(Lines), abouts: aboutsOf(Lines) };
var ornaments = { options: keysOf(Ornaments), labels: labelsOf(Ornaments), abouts: aboutsOf(Ornaments) };
var pointingEnds = Ends.list.filter((e) => e.pointing === true).map((e) => e.key);
var colorlessLines = Lines.list.filter((e) => e.usesColor === false).map((e) => e.key);

// ---- colors ----------------------------------------------------------------------------

function rgb(c) {
    if (c && typeof c === "object" && typeof c.r === "number") return [c.r * 255, c.g * 255, c.b * 255];
    if (Array.isArray(c) && c.length >= 3) return c;
    const h = typeof c === "string" ? c : "";
    if (!/^#[0-9a-fA-F]{6}/.test(h)) return [128, 128, 128];
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function css(c, a) {
    const al = typeof a === "number" ? Math.max(0, Math.min(1, a)) : 1;
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + al + ")";
}
function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

// ---- where the plate is ------------------------------------------------------------------

// which side of the shape faces the windows, in the painter's terms
function innerFor(edge) { return edge === "bottom" || edge === "right" ? "start" : "end"; }
function isVertical(edge) { return edge === "left" || edge === "right"; }

// how much room the canvas leaves around the shape, for shadows, glows and ornaments
function marginFor(d) {
    const Ln = Lines.byKey[d.lines] || {};
    const S = Surfaces.byKey[d.surface] || {};
    if (d.shadow === "strong") return 10;
    if (d.shadow === "soft" || Ln.glow === true || S.ownShadow === true) return 7;
    return 2;
}

// the corner radius the painter gets: capsule ends are fully round, rounded ends use
// the Roundness setting, every other end draws its own corners
function radiusOf(d) {
    if (d.ends === "capsule") return 999;
    if (d.ends === "rounded") return typeof d.radius === "number" ? d.radius : 8;
    return 0;
}

// ---- the parameters Paint.js draws from ------------------------------------------------
//
// d: the settings, pal: { bg, fg, ac, border: ["#rrggbb"...], borderAngle },
// w/h: the canvas, margin: room around the shape, edge: the side of the screen the bar is on

function params(d, pal, w, h, margin, edge) {
    const opacity = typeof d.plateOpacity === "number" ? d.plateOpacity : 85;
    const bar = rgb(pal.bg), fg = rgb(pal.fg), mine = rgb(pal.ac);
    const borders = (pal.border || []).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
    const hasBorder = borders.length > 0;
    // the plate's own color: a shade off the bar, the accent, or a color of your own
    const base = d.plateColor === "accent" ? mix(bar, mine, 0.38)
               : d.plateColor === "custom" ? rgb(d.plateCustom)
               : mix(bar, fg, lum(bar) > 0.5 ? 0.08 : 0.07);
    const S = Surfaces.byKey[d.surface] || Surfaces.byKey.filled;
    let k = typeof S.fill === "number" ? S.fill : 1;
    if (d.fill === "glass") k *= 0.55;
    const alpha = k * opacity / 100;

    let from = base, target;
    if (d.gradientTo === "border" && hasBorder) {
        from = mix(base, rgb(borders[0]), 0.35);
        target = mix(base, rgb(borders[borders.length - 1]), 0.35);
    } else if (d.gradientTo === "lighter") target = mix(base, [255, 255, 255], 0.2);
    else if (d.gradientTo === "darker") target = mix(base, [0, 0, 0], 0.35);
    else target = mix(base, mine, 0.45);

    const Ln = Lines.byKey[d.lines] || Lines.byKey.none;
    let lw = 0, lineBase = mine, lineAlpha = 0.85;
    if (Ln.usesColor !== false) {
        lw = d.borderWidth;
        if (d.border === "text") { lineBase = fg; lineAlpha = 0.55; }
        else if (d.border === "subtle") { lineBase = fg; lineAlpha = 0.16; }
    }
    const lineColor = Ln.usesColor !== false ? css(lineBase, lineAlpha) : "";
    let lineGrad = [], markGrad = [], lineAngle = 0;
    if (d.border === "window" && hasBorder) {
        // the window border's own gradient, at its own angle
        lineGrad = borders.map((c) => css(rgb(c), 0.95));
        markGrad = lineGrad;
        lineAngle = typeof pal.borderAngle === "number" ? pal.borderAngle : 0;
    } else if (d.outlineGradient === true) {
        if (lw > 0) lineGrad = [css(lineBase, lineAlpha), css(mix(lineBase, [255, 255, 255], 0.55), Math.max(lineAlpha, 0.6))];
        markGrad = [css(mine, 0.9), css(mix(mine, [255, 255, 255], 0.55), 0.9)];
    }
    const mark = d.border === "window" && hasBorder ? css(rgb(borders[0]), 0.95) : css(mine, 0.9);

    let blur = 0, shadow = "";
    if (d.shadow !== "none") {
        blur = d.shadow === "strong" ? 10 : 6;
        shadow = d.shadowColor === "accent" ? css(mine, d.shadow === "strong" ? 0.8 : 0.55)
                                           : css([0, 0, 0], d.shadow === "strong" ? 0.55 : 0.35);
    }
    if (Ln.glow === true && blur === 0) { blur = 6; shadow = css(mine, 0.5); }
    if (S.ownShadow === true && blur === 0) { blur = 7; shadow = css([0, 0, 0], 0.5); }
    blur = Math.min(blur, Math.max(0, margin - 1));

    const inner = innerFor(edge);
    const edgeSide = inner === "start" ? "end" : "start";
    const flat = d.flatSide === "edge" ? edgeSide : (d.flatSide === "windows" ? inner : "");
    const lightBase = lum(base) > 0.6;
    const dense = S.noDepth !== true;
    return {
        width: w, height: h, margin: margin, vertical: isVertical(edge),
        dir: d.pointing === "left" || d.pointing === "both" ? d.pointing : "right",
        flat: flat,
        pattern: dense && d.pattern !== "none" ? d.pattern : "", patternColor: css(fg, 0.07),
        depth: dense && d.depth !== "flat" ? d.depth : "",
        light: lightBase ? css([255, 255, 255], 0.7) : css([255, 255, 255], 0.16),
        dark: lightBase ? css([0, 0, 0], 0.18) : css([0, 0, 0], 0.35),
        r: radiusOf(d), ends: d.ends,
        edge: "", concave: false, inner: inner,
        surface: d.surface, lines: d.lines, ornament: d.ornaments,
        fill: css(from, alpha),
        fill2: d.fill === "gradient" && S.noGradient !== true ? css(target, alpha) : "",
        gradAcross: d.gradientAcross === true,
        glass: d.fill === "glass" && S.noGradient !== true,
        glassColor: lightBase ? css([255, 255, 255], 0.8) : css(fg, 0.22),
        line: lineColor, lineWidth: lw, lineGrad: lineGrad, markGrad: markGrad, lineAngle: lineAngle,
        mark: mark, markWidth: Math.max(1, d.borderWidth), bracket: 6,
        second: css(mix(base, mine, 0.28), alpha),
        splitColor: css(mix(base, mine, 0.5), alpha),
        frameColors: [css(mix(mine, [255, 255, 255], 0.55)), css(mine), css(mix(mine, [0, 0, 0], 0.45)), css(mix(mine, [255, 255, 255], 0.3))],
        velvetSheen: css(mix(base, lightBase ? [255, 255, 255] : mine, lightBase ? 0.35 : 0.3), alpha),
        head: css(mix(base, mine, 0.7), Math.max(alpha, 0.85)),
        metal: [css(mix(base, [255, 255, 255], lightBase ? 0.5 : 0.22), alpha), css(base, alpha),
                css(mix(base, [0, 0, 0], lightBase ? 0.12 : 0.3), alpha), css(mix(base, [255, 255, 255], lightBase ? 0.25 : 0.1), alpha)],
        frost: css(lightBase ? [255, 255, 255] : mix(base, [255, 255, 255], 0.35), lightBase ? 0.55 : 0.32 * opacity / 100),
        key: css(lightBase ? mix(base, [0, 0, 0], 0.4) : mix(base, mine, 0.55), Math.max(alpha, 0.6)),
        railSide: d.railSide,
        shadow: shadow, shadowBlur: blur, shadowShift: 0
    };
}

// ---- room for what sits on the plate --------------------------------------------------------
//
// Pointed, notched and curled ends reach into the plate. This measures how far, on the
// shape's real outline, across the band the content sits in, so the visualizer and
// the buttons never touch the end. Remembered per kind of end and thickness.
var roomCache = {};
// ornaments that sit inside each end (Scrolls, Crown, Laurels), as a share of the thickness
var ORNAMENT_ROOM = { scrolls: 0.62, crown: 0.72, laurels: 0.55 };
function endRoom(d, thick, band) {
    const e = Ends.byKey[d.ends];
    const curls = typeof ORNAMENT_ROOM[d.ornaments] === "number";
    if (!e || ((d.ends === "rounded" || d.ends === "square") && !curls)) return 0;
    const r = Math.min(radiusOf(d), thick / 2);
    const dir = d.pointing === "left" || d.pointing === "both" ? d.pointing : "right";
    const key = d.ends + "|" + dir + "|" + Math.round(thick) + "|" + Math.round(band) + "|" + r + "|" + d.ornaments;
    if (roomCache[key] !== undefined) return roomCache[key];
    const L = 600, T = thick;
    const tr = Trace.trace((c) => { Paint.outline(c, 0, 0, L, T, r, d.ends, "", "", dir, "end"); });
    const pts = tr.pts;
    let worst = 0;
    for (let row = 0; row <= 12; row++) {
        const v = band + (T - 2 * band) * row / 12, xs = [];
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length];
            if ((p[1] <= v && q[1] > v) || (q[1] <= v && p[1] > v)) xs.push(p[0] + (q[0] - p[0]) * (v - p[1]) / (q[1] - p[1]));
        }
        xs.sort((a, b) => a - b);
        for (let j = 0; j + 1 < xs.length; j += 2) {
            if (xs[j] <= L / 2 && xs[j + 1] >= L / 2) worst = Math.max(worst, xs[j], L - xs[j + 1]);
        }
    }
    if (curls) worst = Math.max(worst, T * ORNAMENT_ROOM[d.ornaments]);
    const out = Math.ceil(worst > 0.5 ? worst + 2 : 0);
    roomCache[key] = out;
    return out;
}
