.pragma library
.import "parts/Ends.js" as Ends
.import "parts/Surfaces.js" as Surfaces
.import "parts/Lines.js" as Lines
.import "parts/Ornaments.js" as Ornaments
.import "Trace.js" as Trace

// Paints the plate behind the widget on a Canvas. Called from bar/Plate.qml (and the
// little previews in the settings) with the parameters js/Style.js builds.
//
// This file only puts the layers together: the fill, then what the surface adds,
// then the lines, then the ornaments. Every kind of end, surface, line and ornament
// lives in its own entry in parts/, so adding one never means touching this file.
//
// The shape is drawn along x and across y; for a bar on the left or the right the
// canvas is flipped first, so the same drawing works on every side.
//
// p: {
//   width, height     the canvas
//   margin            room around the shape for shadows and ears
//   vertical          flip x and y
//   r                 corner radius
//   ends              a key from parts/Ends.js
//   dir               "right" | "left" | "both"   which way ends that point, point
//   surface           a key from parts/Surfaces.js: what the inside is made of
//   lines             a key from parts/Lines.js: the edge
//   ornament          a key from parts/Ornaments.js: decoration on top
//   frameColors       four colors for a "gilded" frame, light to dark to light, made from the shape's own color
//   velvetSheen       the soft light across a "velvet" shape
//   splitColor        the second half of a "split" shape
//   head              the bright end of a "comet"
//   metal             four colors across a "metal" shape, edge to edge
//   frost             the milky color of a "frost" surface
//   key               the darker base under a "keycap"
//   second            the edge half of a "twotone" shape
//   railSide          "windows" | "edge" | "both"   where a rail ("underline") goes
//   lineGrad, lineAngle   the outline in several colors at an angle (gradient outline, window border)
//   markGrad          the same for rails and brackets
//   edge              "start" | "end" | ""   the side that touches the screen edge, when attached
//   concave           curved ears where an attached shape meets the screen edge
//   inner             "start" | "end"   the side that faces the windows
//   fill, fill2       css colors, fill2 for gradients ("" = no gradient)
//   gradAcross        gradient across the plate (from the outer side in) instead of along it
//   glass             a bright line on the outer side
//   glassColor
//   line, lineWidth   outline color and width (lineWidth 0 = none)
//   mark, markWidth   brackets / underline color and thickness
//   bracket           bracket arm length
//   shadow, shadowBlur
//   shadowShift       move the shadow across the plate (toward the windows), in px
//   flat              "start" | "end" | ""   square corners on that side, no ears
//   pattern           "stripes" | "dots" | "grid" | "", patternColor
//   depth             "raised" | "sunken" | "", light, dark
//   cap               "start" | "end" | "both" | "", capColor
// }

function num(v, fallback) {
    return typeof v === "number" && isFinite(v) ? v : fallback;
}

// ---- the ends of a shape ---------------------------------------------------------
//
// Each end is drawn from a small list of points, written for the LEFT end and
// measured inward from it: u = how far into the shape, v = 0 at the top, T at the bottom.
// The left end is walked from the bottom up; the right end uses the same kind of list,
// mirrored and walked from the top down.
// Between two points the connector is a straight line, or { arc: [u, v], r } (a round
// corner at that point), or { q: [u, v] } (a curve pulled toward that point).

// what one end looks like, for a kind of end and the way the shape points
//   side: "L" or "R",  dir: "right" | "left" | "both",  inner: "start" | "end"
// The ends themselves live in parts/Ends.js
function endForm(kind, side, dir, inner) {
    var e = Ends.byKey[kind] || Ends.byKey.rounded;
    return e.form(side, dir, inner);
}

// the points of one end form (left end, bottom to top). rt / rb: top and bottom radius
function endPoints(form, T, L, rt, rb) {
    var f = Ends.forms[form] || Ends.forms.round;
    return f(T, L, rt, rb);
}

// the outline of the shape, as a path on ctx
function outline(ctx, x0, y0, L, T, r, ends, edge, flat, dir, inner) {
    var x1 = x0 + L;
    r = Math.max(0, Math.min(r, T / 2, L / 2));
    var rt = edge === "start" || flat === "start" ? 0 : r;      // corners on the top (y0) side
    var rb = edge === "end" || flat === "end" ? 0 : r;          // corners on the bottom side
    var d = dir === "left" || dir === "both" ? dir : "right";
    var a = endPoints(endForm(ends, "L", d, inner), T, L, rt, rb);
    var b = endPoints(endForm(ends, "R", d, inner), T, L, rt, rb);

    ctx.beginPath();
    // left end, bottom to top
    function px(u) { return x0 + u; }
    ctx.moveTo(px(a.pts[0][0]), y0 + a.pts[0][1]);
    for (var i = 1; i < a.pts.length; i++) link(ctx, a.links[i - 1], px, y0, a.pts[i]);
    // right end, top to bottom: its list reversed and mirrored
    function qx(u) { return x1 - u; }
    var n = b.pts.length;
    ctx.lineTo(qx(b.pts[n - 1][0]), y0 + b.pts[n - 1][1]);
    for (var j = n - 2; j >= 0; j--) link(ctx, b.links[j], qx, y0, b.pts[j]);
    ctx.closePath();
}

// one connector of an end: a line, a round corner or a curve, to point p
function link(ctx, how, mapX, y0, p) {
    var x = mapX(p[0]), y = y0 + p[1];
    if (how && how.arc) ctx.arcTo(mapX(how.arc[0]), y0 + how.arc[1], x, y, how.r);
    else if (how && how.q) ctx.quadraticCurveTo(mapX(how.q[0]), y0 + how.q[1], x, y);
    else ctx.lineTo(x, y);
}

// the curved ears that make an attached shape flow into the screen edge
function ears(ctx, x0, y0, L, T, size, edge, color) {
    if (!edge || size <= 0) return;
    var x1 = x0 + L;
    var y = edge === "start" ? y0 : y0 + T;
    var dir = edge === "start" ? 1 : -1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 - size, y);
    ctx.quadraticCurveTo(x0, y, x0, y + dir * size);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 + size, y);
    ctx.quadraticCurveTo(x1, y, x1, y + dir * size);
    ctx.closePath();
    ctx.fill();
}

// a number between 0 and 1 that is always the same for the same k and seed, so a
// pattern never jumps around when the shape is drawn again
function hash(k, seed) {
    var v = Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
}

// a curled spiral, like the scroll at the top of an old column. side 1 curls one
// way, -1 the other
function volute(ctx, cx, cy, rmax, side, color) {
    if (!color || rmax < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.9, rmax / 6);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    var turns = 2.25 * Math.PI * 2, steps = 48;
    for (var i = 0; i <= steps; i++) {
        var t = i / steps, a = t * turns, rr = rmax * (1 - t * 0.85);
        var px = cx + side * Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
}


// a gradient over the shape's box at an angle in degrees (0 runs left to right)
function angled(ctx, x0, y0, L, T, angle, colors) {
    var a = num(angle, 0) * Math.PI / 180;
    var dx = Math.cos(a), dy = Math.sin(a);
    var half = (Math.abs(dx) * L + Math.abs(dy) * T) / 2;
    var cx = x0 + L / 2, cy = y0 + T / 2;
    var g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    for (var i = 0; i < colors.length; i++) g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), colors[i]);
    return g;
}

// a faint pattern over the whole rect (the caller clips it to the shape)
function texture(ctx, kind, color, x0, y0, L, T) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    var step = 6;
    if (kind === "stripes") {
        ctx.beginPath();
        for (var x = x0 - T; x < x0 + L; x += step) { ctx.moveTo(x, y0 + T); ctx.lineTo(x + T, y0); }
        ctx.stroke();
    } else if (kind === "dots") {
        for (var dx = x0 + 3; dx < x0 + L; dx += step)
            for (var dy = y0 + 3; dy < y0 + T; dy += step) ctx.fillRect(dx, dy, 1, 1);
    } else if (kind === "grid") {
        for (var gx = x0 + step; gx < x0 + L; gx += step) ctx.fillRect(gx, y0, 1, T);
        for (var gy = y0 + step; gy < y0 + T; gy += step) ctx.fillRect(x0, gy, L, 1);
    }
}

function paint(ctx, p) {
    var W = num(p.width, 0), H = num(p.height, 0);
    // `keep` draws on top of what's there, at ox/oy (the little pictures in the panel)
    if (!p.keep) ctx.reset();
    if (W <= 0 || H <= 0) return;
    ctx.save();
    if (p.keep) ctx.translate(num(p.ox, 0), num(p.oy, 0));
    draw(ctx, p, W, H);
    ctx.restore();
}

function draw(ctx, p, W, H) {
    var vertical = p.vertical === true;
    if (vertical) ctx.transform(0, 1, 1, 0, 0, 0);        // draw along y instead of x
    var along = vertical ? H : W, thick = vertical ? W : H;
    var m = num(p.margin, 0);
    var x0 = m, L = along - 2 * m;
    // across: the shape keeps the full canvas thickness on the edge side when attached
    var y0 = p.edge === "start" ? 0 : m;
    var T = thick - (p.edge === "start" ? 0 : m) - (p.edge === "end" ? 0 : m);
    if (L < 2 || T < 2) return;

    var r = num(p.r, 0);
    var ends = p.ends || "rounded";
    var edge = p.edge === "start" || p.edge === "end" ? p.edge : "";
    var surface = p.surface || "filled";
    var lines = p.lines || "none";
    var orn = p.ornament || "none";
    var flat = p.flat === "start" || p.flat === "end" ? p.flat : "";
    var dir = p.dir === "left" || p.dir === "both" ? p.dir : "right";
    var inner = p.inner === "start" ? "start" : "end";
    var x1 = x0 + L, y1 = y0 + T;

    var ink = p.mark || p.line || "";
    var S = Surfaces.byKey[surface] || Surfaces.byKey.filled;
    var Ln = Lines.byKey[lines] || Lines.byKey.none;
    var O = Ornaments.byKey[orn] || Ornaments.byKey.none;
    var E = Ends.byKey[ends] || Ends.byKey.rounded;

    // everything a part needs to draw itself (see the top of each file in parts/)
    var g = {
        ctx: ctx, p: p, vertical: vertical,
        x0: x0, y0: y0, x1: x1, y1: y1, L: L, T: T, r: r,
        ends: ends, edge: edge, flat: flat, dir: dir, inner: inner,
        surface: surface, lines: lines, orn: orn, ink: ink,
        seed: Math.round(L) % 97 + Math.round(T),
        tone: ink || "rgba(255,255,255,0.4)",
        num: num, hash: hash,
        outline: function (x, y, l, t, rr) { outline(ctx, x, y, l, t, rr, ends, edge, flat, dir, inner); },
        volute: function (cx, cy, rmax, side, color) { volute(ctx, cx, cy, rmax, side, color); },
        texture: function (kind, color, x, y, l, t) { texture(ctx, kind, color, x, y, l, t); },
        // the outline moved `inset` pixels inward as points, and a walk round it at points
        // about `step` apart: fn(x, y, tx, ty, nx, ny, i, n) with the way it runs and the
        // way inward (see Trace.js)
        trace: function (inset) {
            var d = num(inset, 0);
            return Trace.trace(function (c) {
                outline(c, x0 + d, y0 + d, Math.max(1, L - 2 * d), Math.max(1, T - 2 * d), Math.max(0, r - d), ends, edge, flat, dir, inner);
            });
        },
        along: function (inset, step, fn) { return Trace.walk(g.trace(inset), step, fn); },
        walkTrace: function (tr, step, fn) { return Trace.walk(tr, step, fn); }
    };

    // a surface may shift the shape before it's filled (Keycap stands on its side)
    if (S.base) {
        S.base(g);
        y0 = g.y0; T = g.T; y1 = g.y1;
    }

    // fill, with its shadow
    var fills = S.noFill !== true;
    if (fills) {
        if (num(p.shadowBlur, 0) > 0 && p.shadow) {
            ctx.shadowBlur = p.shadowBlur;
            ctx.shadowColor = p.shadow;
            // shadow offsets ignore the flip, so move it on the real axis
            var shift = num(p.shadowShift, 0);
            ctx.shadowOffsetX = vertical ? shift : 0;
            ctx.shadowOffsetY = vertical ? 0 : shift;
        }
        var style = p.fill || "rgba(0,0,0,0)";
        if (p.fill2) {
            var grad = p.gradAcross ? ctx.createLinearGradient(x0, y0, x0, y1) : ctx.createLinearGradient(x0, y0, x1, y0);
            grad.addColorStop(0, p.fill);
            grad.addColorStop(p.gradAcross ? 0.12 : 0.55, p.fill);
            grad.addColorStop(1, p.fill2);
            style = grad;
        }
        if (S.fillStyle) style = S.fillStyle(g, style);
        ctx.fillStyle = style;
        outline(ctx, x0, y0, L, T, r, ends, edge, flat, dir, inner);
        ctx.fill();
        if (S.afterFill) S.afterFill(g);
        if (E.afterFill) E.afterFill(g);
        if (edge && p.concave && E.ears) ears(ctx, x0, y0, L, T, Math.max(4, Math.min(r > 0 ? r : 8, T)), edge, p.fill);
        ctx.shadowBlur = 0;
        ctx.shadowColor = "rgba(0,0,0,0)";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // what the surface adds inside the shape, then outside it
        if (S.inside) {
            ctx.save();
            outline(ctx, x0, y0, L, T, r, ends, edge, flat, dir, inner);
            ctx.clip();
            S.inside(g);
            ctx.restore();
        }
        if (S.outside) S.outside(g);

        // texture, depth and accent caps all stay inside the shape
        var inside = (p.pattern && p.patternColor) || (p.depth === "raised" || p.depth === "sunken") || (p.cap && p.capColor);
        if (inside) {
            ctx.save();
            outline(ctx, x0, y0, L, T, r, ends, edge, flat, dir, inner);
            ctx.clip();
            if (p.pattern && p.patternColor) texture(ctx, p.pattern, p.patternColor, x0, y0, L, T);
            if ((p.depth === "raised" || p.depth === "sunken") && p.light && p.dark) {
                var top = p.depth === "raised" ? p.light : p.dark;
                var bottom = p.depth === "raised" ? p.dark : p.light;
                ctx.fillStyle = top; ctx.fillRect(x0, y0, L, 1.5);
                ctx.fillStyle = bottom; ctx.fillRect(x0, y1 - 1.5, L, 1.5);
            }
            if (p.cap && p.capColor) {
                var cw = Math.max(3, Math.min(6, L / 8));
                ctx.fillStyle = p.capColor;
                if (p.cap === "start" || p.cap === "both") ctx.fillRect(x0, y0, cw, T);
                if (p.cap === "end" || p.cap === "both") ctx.fillRect(x1 - cw, y0, cw, T);
            }
            ctx.restore();
        }
    }

    // glass: a bright line just inside the outer side
    if (p.glass && fills) {
        ctx.save();
        outline(ctx, x0, y0, L, T, r, ends, edge, flat, dir, inner);
        ctx.clip();
        ctx.fillStyle = p.glassColor || "rgba(255,255,255,0.2)";
        var gy = p.inner === "start" ? y1 - 2 : y0 + 1;
        ctx.fillRect(x0 + r * 0.5, gy, L - r, 1);
        ctx.restore();
    }

    // lines, in the line color (a gradient when it fades)
    var lw = num(p.lineWidth, 0);
    g.lw = lw;
    g.lwN = Math.max(1, lw);
    g.lineStyle = p.lineGrad && p.lineGrad.length > 1 ? angled(ctx, x0, y0, L, T, p.lineAngle, p.lineGrad) : p.line;
    // where lines along the long sides start and stop, clear of the ends
    g.side0 = x0 + Math.max(r * 0.8, T * 0.3);
    g.side1 = x1 - Math.max(r * 0.8, T * 0.3);
    // the accent, for ornaments and the lines that use it (Rail), a gradient when lines fade
    g.mw = Math.max(1, num(p.markWidth, 2));
    g.markStyle = p.markGrad && p.markGrad.length > 1 ? angled(ctx, x0, y0, L, T, p.lineAngle, p.markGrad) : p.mark;
    if (Ln.draw) Ln.draw(g);

    // ornaments
    if (O.draw) O.draw(g);
    // an end that decorates itself, unless the ornament already did
    if (E.onTop && orn !== "scrolls") E.onTop(g);
}
