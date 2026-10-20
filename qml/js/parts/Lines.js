.pragma library

// The edge of a shape. One entry per kind of line in the settings, in the order the
// tiles show.
//
// entry fields:
//   key, label     the saved value and the name on the tile
//   about          one sentence for the settings hint
//   usesColor      false when Line color does nothing for it (true if left out)
//   usesWidth      false when Line width does nothing for it (true if left out)
//   glow           it glows, so a shape gets a soft glow even with Shadow off
//   draw(g)        draws it, on top of the surface (see Paint.js). Lines
//                  that share their drawing point at the same function

// a solid line, a double one or a glowing ring: one line around the shape, a
// second thinner one inside it for Double, blurred for Glow ring
function plain(g) {
    var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, r = g.r, lines = g.lines,
        lineStyle = g.lineStyle, lw = g.lw;
    if (!(lw > 0 && p.line)) return;
    if (lines === "glow") {
        ctx.shadowBlur = Math.max(4, g.num(p.shadowBlur, 8));
        ctx.shadowColor = p.line;
    }
    ctx.strokeStyle = lineStyle;
    ctx.lineWidth = lw;
    g.outline(x0 + lw / 2, y0 + lw / 2, L - lw, T - lw, Math.max(0, r - lw / 2));
    ctx.stroke();
    ctx.shadowBlur = 0;
    // double: a thinner second line just inside
    if (lines === "double" && L > 4 * lw + 6 && T > 4 * lw + 6) {
        var gap = lw + 2;
        ctx.lineWidth = Math.max(1, lw / 2);
        g.outline(x0 + gap, y0 + gap, L - 2 * gap, T - 2 * gap, Math.max(0, r - gap));
        ctx.stroke();
    }
}

// a wave or a sawtooth all the way round, ends included
function waves(g) {
    var ctx = g.ctx, p = g.p, T = g.T, lwN = g.lwN, sharp = g.lines === "sawtooth";
    if (!p.line) return;
    var amp = Math.max(1, Math.min(2, T / 12)), per = 7;
    var tr = g.trace(amp + lwN / 2 + 0.5);
    if (!(tr.len > 0)) return;
    var count = Math.max(3, Math.round(tr.len / per)), step = sharp ? 0.5 : 1 / 8;
    ctx.save();
    ctx.strokeStyle = g.lineStyle;
    ctx.lineWidth = lwN;
    ctx.lineJoin = sharp ? "miter" : "round";
    ctx.beginPath();
    g.walkTrace(tr, tr.len / (count / step), function (x, y, tx, ty, nx, ny, i) {
        var d = sharp ? (i % 2 === 0 ? -amp : amp) : Math.sin(i * step * Math.PI * 2) * amp;
        if (i === 0) ctx.moveTo(x + nx * d, y + ny * d); else ctx.lineTo(x + nx * d, y + ny * d);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

var list = [
    { key: "none", label: "None", usesColor: false, usesWidth: false },
    { key: "solid", label: "Solid", draw: plain },
    { key: "double", label: "Double", about: "Double adds a thinner line inside.", draw: plain },
    { key: "triple", label: "Triple", about: "Triple adds two.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, r = g.r, lineStyle = g.lineStyle,
            lwN = g.lwN;
        if (!(p.line)) return;
        // three lines, the outer one the strongest
        ctx.strokeStyle = lineStyle;
        var insets = [lwN / 2, lwN + 2, lwN + 4.5], widths = [lwN, 0.7, 0.7];
        for (var tr = 0; tr < 3; tr++) {
            var ti = insets[tr];
            if (L <= 2 * ti + 4 || T <= 2 * ti + 4) break;
            ctx.lineWidth = widths[tr];
            ctx.globalAlpha = tr === 0 ? 1 : 0.75;
            g.outline(x0 + ti, y0 + ti, L - 2 * ti, T - 2 * ti, Math.max(0, r - ti));
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    } },
    { key: "glow", label: "Glow ring", about: "Glow ring shines softly.", glow: true, draw: plain },
    { key: "neon", label: "Neon tube", about: "Neon tube glows with a bright core.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, r = g.r, lineStyle = g.lineStyle,
            lw = g.lw;
        if (!(p.line)) return;
        // a glowing tube: a wide soft glow, then a thin bright core
        var nw = Math.max(1, lw);
        // as soft as the room around the shape allows, so the glow never ends in a hard box
        ctx.shadowBlur = Math.min(12, Math.max(2, (typeof p.margin === "number" ? p.margin : 8) * 1.5));
        ctx.shadowColor = p.line;
        ctx.strokeStyle = lineStyle;
        ctx.lineWidth = nw + 1;
        g.outline(x0 + nw, y0 + nw, L - 2 * nw, T - 2 * nw, Math.max(0, r - nw));
        ctx.stroke();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = Math.max(0.6, nw / 2);
        ctx.stroke();
    } },
    { key: "dashed", label: "Dashed",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, T = g.T, r = g.r,
            lineStyle = g.lineStyle, lw = g.lw;
        if (!(lw > 0 && p.line)) return;
        // dashes along the two long sides
        ctx.fillStyle = lineStyle;
        var dash = 5, gapD = 4;
        var span0 = x0 + Math.max(r, T * 0.3), span1 = x1 - Math.max(r, T * 0.3);
        for (var dx = span0; dx < span1; dx += dash + gapD) {
            var dl = Math.min(dash, span1 - dx);
            ctx.fillRect(dx, y0, dl, lw);
            ctx.fillRect(dx, y1 - lw, dl, lw);
        }
    } },
    { key: "dotted", label: "Dotted",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, T = g.T, r = g.r,
            lineStyle = g.lineStyle, lw = g.lw;
        if (!(lw > 0 && p.line)) return;
        // round dots along the two long sides
        ctx.fillStyle = lineStyle;
        var dot = Math.max(1, lw), stepD = dot * 3 + 1;
        var from = x0 + Math.max(r, T * 0.3), to = x1 - Math.max(r, T * 0.3);
        for (var ddx = from; ddx <= to; ddx += stepD) {
            ctx.beginPath(); ctx.arc(ddx, y0 + dot / 2, dot / 2 + 0.3, 0, Math.PI * 2, false); ctx.fill();
            ctx.beginPath(); ctx.arc(ddx, y1 - dot / 2, dot / 2 + 0.3, 0, Math.PI * 2, false); ctx.fill();
        }
    } },
    { key: "dashdot", label: "Dash and dot",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, y0 = g.y0, y1 = g.y1, lineStyle = g.lineStyle, lwN = g.lwN,
            side0 = g.side0, side1 = g.side1;
        if (!(p.line)) return;
        // dash, dot, dash along the long sides
        ctx.fillStyle = lineStyle;
        for (var dd2 = side0, k2 = 0; dd2 < side1; k2++) {
            var len2 = k2 % 2 === 0 ? 6 : lwN;
            var l2 = Math.min(len2, side1 - dd2);
            ctx.fillRect(dd2, y0, l2, lwN);
            ctx.fillRect(dd2, y1 - lwN, l2, lwN);
            dd2 += len2 + 3;
        }
    } },
    { key: "stitched", label: "Stitched", about: "Stitched sews it like leather.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, T = g.T, r = g.r,
            lineStyle = g.lineStyle, lw = g.lw;
        if (!(p.line)) return;
        // short stitches a few pixels inside the long sides, like leather
        ctx.fillStyle = lineStyle;
        var st = 3, sl = 4, sg = 3, sw = Math.max(1, lw);
        var s0 = x0 + Math.max(r * 0.8, T * 0.35), s1 = x1 - Math.max(r * 0.8, T * 0.35);
        for (var stx = s0; stx < s1; stx += sl + sg) {
            var stl = Math.min(sl, s1 - stx);
            ctx.fillRect(stx, y0 + st, stl, sw);
            ctx.fillRect(stx, y1 - st - sw, stl, sw);
        }
    } },
    { key: "inset", label: "Inset line", about: "Inset sits a few pixels in.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, r = g.r, lineStyle = g.lineStyle,
            lw = g.lw;
        if (!(p.line)) return;
        // a line drawn a few pixels inside the edge
        var ig = 3 + Math.max(1, lw);
        ctx.strokeStyle = lineStyle;
        ctx.lineWidth = Math.max(1, lw);
        g.outline(x0 + ig, y0 + ig, L - 2 * ig, T - 2 * ig, Math.max(0, r - ig));
        ctx.stroke();
    } },
    { key: "mat", label: "Mat", about: "Mat frames the inside with a light band, like a picture behind glass.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, r = g.r;
        var band = Math.max(2, Math.min(4, T * 0.12));
        ctx.save();
        ctx.lineWidth = band;
        ctx.strokeStyle = p.light || "rgba(255,255,255,0.18)";
        g.outline(x0 + band / 2, y0 + band / 2, L - band, T - band, Math.max(0, r - band / 2));
        ctx.stroke();
        if (p.line) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = g.lineStyle;
            g.outline(x0 + band + 0.5, y0 + band + 0.5, L - 2 * band - 1, T - 2 * band - 1, Math.max(0, r - band - 0.5));
            ctx.stroke();
        }
        ctx.restore();
    } },
    { key: "rail", label: "Rail", about: "Rail is a line on one side only.", usesColor: false,
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, r = g.r, inner = g.inner,
            markStyle = g.markStyle, mw = g.mw;
        if (!(p.mark)) return;
        ctx.fillStyle = markStyle;
        var inset = Math.min(r * 0.6, L / 4);
        var side = p.railSide === "edge" || p.railSide === "both" ? p.railSide : "windows";
        var windowsY = inner === "start" ? y0 : y1 - mw;
        var edgeY = inner === "start" ? y1 - mw : y0;
        if (side !== "edge") ctx.fillRect(x0 + inset, windowsY, L - 2 * inset, mw);
        if (side !== "windows") ctx.fillRect(x0 + inset, edgeY, L - 2 * inset, mw);
    } },
    { key: "wavy", label: "Wavy", about: "Wavy waves all the way round, ends included.", draw: waves },
    { key: "sawtooth", label: "Sawtooth", about: "Sawtooth zigzags all the way round, ends included.", draw: waves },
    { key: "rope", label: "Rope", about: "Rope twists.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, r = g.r,
            lineStyle = g.lineStyle, lwN = g.lwN, side0 = g.side0, side1 = g.side1;
        if (!(p.line)) return;
        // a twisted rope: short slanted strands between two thin edges
        ctx.strokeStyle = lineStyle;
        ctx.lineWidth = 0.6;
        g.outline(x0 + 0.5, y0 + 0.5, L - 1, T - 1, Math.max(0, r - 0.5));
        ctx.stroke();
        var band = Math.max(3, lwN + 2);
        ctx.lineWidth = Math.max(0.8, lwN * 0.8);
        ctx.beginPath();
        for (var rx = side0; rx <= side1; rx += 2.4) {
            ctx.moveTo(rx, y0 + band); ctx.lineTo(rx + band * 0.7, y0 + 0.6);
            ctx.moveTo(rx, y1 - 0.6); ctx.lineTo(rx + band * 0.7, y1 - band);
        }
        ctx.stroke();
    } },
    { key: "chain", label: "Chain", about: "Chain links all the way round, one flat and one on its side.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, T = g.T;
        if (!p.line) return;
        var lk = 5, lh = Math.max(1.4, Math.min(2.2, T / 12));
        ctx.save();
        ctx.strokeStyle = g.lineStyle;
        ctx.lineWidth = Math.max(0.7, g.lwN * 0.7);
        g.along(lh + 0.6, lk * 0.82, function (x, y, tx, ty, nx, ny, i) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.atan2(ty, tx));
            ctx.beginPath();
            if (i % 2 === 0) ctx.ellipse(-lk / 2, -lh, lk, lh * 2);    // Qt's ellipse takes the box around it
            else { ctx.moveTo(-lk * 0.45, 0); ctx.lineTo(lk * 0.45, 0); }
            ctx.stroke();
            ctx.restore();
        });
        ctx.restore();
    } },
    { key: "beads", label: "Beads", about: "Beads string all the way round the edge.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, w = Math.max(1.2, g.lwN * 1.1);
        if (!p.line) return;
        ctx.save();
        ctx.fillStyle = g.lineStyle;
        g.along(w + 0.8, w * 3.4, function (x, y) {
            ctx.beginPath(); ctx.arc(x, y, w, 0, Math.PI * 2, false); ctx.fill();
        });
        ctx.restore();
    } },
    { key: "ladder", label: "Ladder", about: "Ladder has rungs between two lines.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, r = g.r,
            lineStyle = g.lineStyle, lwN = g.lwN, side0 = g.side0, side1 = g.side1;
        if (!(p.line)) return;
        // two lines with rungs between them, like a railway seen from above
        var lg = 4 + lwN;
        ctx.strokeStyle = lineStyle;
        ctx.lineWidth = Math.max(0.8, lwN * 0.8);
        g.outline(x0 + 0.5, y0 + 0.5, L - 1, T - 1, Math.max(0, r - 0.5));
        ctx.stroke();
        if (L > 2 * lg + 4 && T > 2 * lg + 4) {
            g.outline(x0 + lg, y0 + lg, L - 2 * lg, T - 2 * lg, Math.max(0, r - lg));
            ctx.stroke();
            ctx.beginPath();
            for (var rg = side0 + 2; rg < side1 - 1; rg += 5) {
                ctx.moveTo(rg, y0 + 1); ctx.lineTo(rg, y0 + lg);
                ctx.moveTo(rg, y1 - 1); ctx.lineTo(rg, y1 - lg);
            }
            ctx.stroke();
        }
    } },
    { key: "sketch", label: "Sketched", about: "Sketched looks drawn by hand.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, r = g.r, lineStyle = g.lineStyle,
            lwN = g.lwN;
        if (!(p.line)) return;
        // drawn by hand: the edge traced twice, never quite on top of itself
        ctx.strokeStyle = lineStyle;
        ctx.lineWidth = Math.max(0.8, lwN * 0.9);
        var jit = [[0.9, -0.5, 0.4], [-0.7, 0.6, -0.6]];
        for (var sk = 0; sk < 2; sk++) {
            ctx.globalAlpha = sk === 0 ? 0.9 : 0.6;
            g.outline(x0 + 1 + jit[sk][0], y0 + 1 + jit[sk][1], L - 2 + jit[sk][2], T - 2 - jit[sk][2], Math.max(0, r - 1 + jit[sk][2]));
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    } },
    { key: "gilded", label: "Gilded frame", about: "Gilded frame shines in your color.", usesColor: false, usesWidth: false,
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, r = g.r;
        if (!(p.frameColors && p.frameColors.length === 4)) return;
        var gw = Math.max(2, Math.min(3, T / 8));
        var frameG = ctx.createLinearGradient(x0, y0, x0, y1);
        frameG.addColorStop(0, p.frameColors[0]); frameG.addColorStop(0.35, p.frameColors[1]);
        frameG.addColorStop(0.7, p.frameColors[2]); frameG.addColorStop(1, p.frameColors[3]);
        ctx.strokeStyle = frameG;
        ctx.lineWidth = gw;
        g.outline(x0 + gw / 2, y0 + gw / 2, L - gw, T - gw, Math.max(0, r - gw / 2));
        ctx.stroke();
        var gi = gw + 2.5;
        if (L > 2 * gi + 4 && T > 2 * gi + 4) {
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.8;
            g.outline(x0 + gi, y0 + gi, L - 2 * gi, T - 2 * gi, Math.max(0, r - gi));
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    } },
    { key: "glitch", label: "Glitch", about: "Glitch slips into cyan and magenta.", usesColor: false, usesWidth: false,
      draw: function (g) {
        var ctx = g.ctx, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, r = g.r;
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(40,230,255,0.6)";
        g.outline(x0 - 1.5 + 0.5, y0 + 0.5, L - 1, T - 1, r);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,40,170,0.6)";
        g.outline(x0 + 1.5 + 0.5, y0 + 0.5, L - 1, T - 1, r);
        ctx.stroke();
        ctx.save();
        g.outline(x0, y0, L, T, r);
        ctx.clip();
        var rows = [0.22, 0.58, 0.8];
        for (var gq = 0; gq < rows.length; gq++) {
            var gyy = y0 + T * rows[gq];
            var shiftX = ((Math.round(L) * (gq + 3)) % 9) - 4;
            ctx.fillStyle = gq % 2 ? "rgba(255,40,170,0.35)" : "rgba(40,230,255,0.35)";
            ctx.fillRect(x0 + L * 0.1 + shiftX, gyy, L * (0.25 + 0.2 * gq), 1.5);
        }
        ctx.restore();
    } }
];

var byKey = {};
for (var i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
