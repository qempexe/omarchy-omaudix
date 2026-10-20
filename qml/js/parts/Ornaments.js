.pragma library

// Decoration on top of a shape. One entry per ornament in the settings, in the order
// the tiles show.
//
// entry fields:
//   key, label     the saved value and the name on the tile
//   about          one sentence for the settings hint
//   draw(g)        draws it, on top of the surface and the lines, in g.p.mark (the
//                  accent). Ornaments that share their drawing point at the same function

// rosettes in the corners, diamonds in the middle of the long sides, or both with a
// fine inner frame (filigree)
function rosettes(g) {
    var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T, r = g.r,
        orn = g.orn;
    if (!(p.mark)) return;
    var fi = 3;
    ctx.save();
    ctx.strokeStyle = p.mark;
    ctx.fillStyle = p.mark;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.75;
    // filigree: a fine inner frame as well
    if (orn === "filigree") {
        g.outline(x0 + fi, y0 + fi, L - 2 * fi, T - 2 * fi, Math.max(0, r - fi));
        ctx.stroke();
    }
    if (orn !== "diamonds") {
        // a little rosette in each corner
        var rs = Math.max(1.2, T * 0.07);
        var cxs = [x0 + fi + Math.max(r * 0.4, T * 0.3), x1 - fi - Math.max(r * 0.4, T * 0.3)];
        for (var fc = 0; fc < 2; fc++)
            for (var fr = 0; fr < 2; fr++) {
                var ry = fr === 0 ? y0 + fi + rs + 1.5 : y1 - fi - rs - 1.5;
                ctx.beginPath(); ctx.arc(cxs[fc], ry, rs, 0, Math.PI * 2, false); ctx.fill();
                if (orn === "rosettes") { ctx.beginPath(); ctx.arc(cxs[fc], ry, rs + 1.4, 0, Math.PI * 2, false); ctx.stroke(); }
            }
    }
    if (orn !== "rosettes" && L > T * 2.5) {
        // a diamond in the middle of each long side
        var mx = x0 + L / 2, dsz = Math.max(2, T * 0.12);
        for (var fy = 0; fy < 2; fy++) {
            var yy = fy === 0 ? y0 + fi : y1 - fi;
            ctx.beginPath();
            ctx.moveTo(mx - dsz, yy); ctx.lineTo(mx, yy - dsz * 0.7); ctx.lineTo(mx + dsz, yy); ctx.lineTo(mx, yy + dsz * 0.7);
            ctx.closePath(); ctx.fill();
        }
    }
    ctx.restore();
}

// small marks that stay inside the shape: crosses, stars, fleurons, rivets,
// chevrons, a flourish, pearls and fans
function decor(g) {
    var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T, r = g.r,
        orn = g.orn, side0 = g.side0, side1 = g.side1;
    if (!(p.mark)) return;
    ctx.save();
    // they all stay inside the shape
    g.outline(x0, y0, L, T, r);
    ctx.clip();
    ctx.strokeStyle = p.mark;
    ctx.fillStyle = p.mark;
    ctx.lineWidth = 1;
    var oi = 3, osz = Math.max(1.6, Math.min(3, T / 8));
    var cornerX = [x0 + oi + Math.max(r * 0.45, osz * 1.6), x1 - oi - Math.max(r * 0.45, osz * 1.6)];
    var cornerY = [y0 + oi + osz, y1 - oi - osz];
    if (orn === "crosses" || orn === "stars") {
        for (var cxI = 0; cxI < 2; cxI++)
            for (var cyI = 0; cyI < 2; cyI++) {
                var px3 = cornerX[cxI], py3 = cornerY[cyI];
                ctx.beginPath();
                if (orn === "crosses") {
                    ctx.moveTo(px3 - osz, py3); ctx.lineTo(px3 + osz, py3);
                    ctx.moveTo(px3, py3 - osz); ctx.lineTo(px3, py3 + osz);
                    ctx.stroke();
                } else {
                    // a little four-pointed sparkle
                    for (var spk = 0; spk < 8; spk++) {
                        var sa = spk * Math.PI / 4, srr = spk % 2 === 0 ? osz * 1.2 : osz * 0.35;
                        if (spk === 0) ctx.moveTo(px3 + Math.cos(sa) * srr, py3 + Math.sin(sa) * srr);
                        else ctx.lineTo(px3 + Math.cos(sa) * srr, py3 + Math.sin(sa) * srr);
                    }
                    ctx.closePath(); ctx.fill();
                }
            }
    }
    if (orn === "fleurons" && L > T * 2) {
        // a small lily in the middle of each long side
        var fx = x0 + L / 2, fsz = osz * 0.7;
        for (var fe = 0; fe < 2; fe++) {
            var fyb = fe === 0 ? y0 + oi : y1 - oi, fd = fe === 0 ? 1 : -1;
            ctx.beginPath(); ctx.arc(fx, fyb + fd * fsz * 1.1, fsz * 0.55, 0, Math.PI * 2, false); ctx.fill();
            ctx.beginPath(); ctx.arc(fx - fsz * 0.9, fyb + fd * fsz * 0.5, fsz * 0.4, 0, Math.PI * 2, false); ctx.fill();
            ctx.beginPath(); ctx.arc(fx + fsz * 0.9, fyb + fd * fsz * 0.5, fsz * 0.4, 0, Math.PI * 2, false); ctx.fill();
            ctx.beginPath(); ctx.moveTo(fx - fsz * 1.5, fyb); ctx.lineTo(fx + fsz * 1.5, fyb); ctx.stroke();
        }
    }
    if (orn === "rivets" || orn === "pearls") {
        // a row of rivets, or a string of pearls, inside both long sides
        var step2 = orn === "rivets" ? 9 : 3.6, rad2 = orn === "rivets" ? 0.95 : 1.15;
        for (var rx2 = side0; rx2 <= side1; rx2 += step2)
            for (var re = 0; re < 2; re++) {
                var ry2 = re === 0 ? y0 + oi + rad2 : y1 - oi - rad2;
                ctx.fillStyle = p.mark;
                ctx.globalAlpha = orn === "pearls" ? 0.7 : 0.9;
                ctx.beginPath(); ctx.arc(rx2, ry2, rad2, 0, Math.PI * 2, false); ctx.fill();
                // pearls catch the light, rivets throw a little shadow
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = orn === "pearls" ? (p.light || "rgba(255,255,255,0.6)") : (p.dark || "rgba(0,0,0,0.4)");
                var off = orn === "pearls" ? -0.4 : 0.5;
                ctx.beginPath(); ctx.arc(rx2 + off, ry2 + off, rad2 * 0.45, 0, Math.PI * 2, false); ctx.fill();
            }
        ctx.globalAlpha = 1;
    }
    if (orn === "chevrons") {
        // double chevrons inside each end, pointing outward
        var chx = [x0 + oi + T * 0.28, x1 - oi - T * 0.28], chs = [-1, 1], ch = T * 0.22;
        for (var ci2 = 0; ci2 < 2; ci2++)
            for (var cn = 0; cn < 2; cn++) {
                var bx = chx[ci2] - chs[ci2] * cn * ch * 0.7;
                ctx.beginPath();
                ctx.moveTo(bx - chs[ci2] * ch * 0.5, y0 + T / 2 - ch);
                ctx.lineTo(bx + chs[ci2] * ch * 0.5, y0 + T / 2);
                ctx.lineTo(bx - chs[ci2] * ch * 0.5, y0 + T / 2 + ch);
                ctx.globalAlpha = cn === 0 ? 0.9 : 0.5;
                ctx.stroke();
            }
        ctx.globalAlpha = 1;
    }
    if (orn === "flourish" && L > T * 2.5) {
        // a swash in the middle of each long side, curling out both ways
        var mxf = x0 + L / 2, wf = Math.min(T * 1.4, L / 5);
        ctx.lineWidth = 0.9;
        for (var fl = 0; fl < 2; fl++) {
            var yf = fl === 0 ? y0 + oi + 1 : y1 - oi - 1, df = fl === 0 ? 1 : -1;
            for (var sd = -1; sd <= 1; sd += 2) {
                ctx.beginPath();
                ctx.moveTo(mxf, yf);
                ctx.quadraticCurveTo(mxf + sd * wf * 0.5, yf + df * osz * 1.0, mxf + sd * wf, yf + df * osz * 0.2);
                ctx.stroke();
                g.volute(mxf + sd * wf * 0.88, yf + df * osz * 0.6, osz * 0.5, sd, p.mark);
            }
            ctx.beginPath(); ctx.arc(mxf, yf, 0.9, 0, Math.PI * 2, false); ctx.fill();
        }
    }
    if (orn === "fans") {
        // an art deco fan in each corner: rings and rays
        var fr2 = Math.min(T * 0.42, L / 6);
        var fc2 = [[x0, y0, 0], [x1, y0, Math.PI / 2], [x1, y1, Math.PI], [x0, y1, Math.PI * 1.5]];
        ctx.lineWidth = 0.7;
        ctx.globalAlpha = 0.75;
        for (var fq = 0; fq < 4; fq++) {
            var fcx = fc2[fq][0], fcy = fc2[fq][1], a0 = fc2[fq][2];
            for (var ringF = 1; ringF <= 3; ringF++) {
                ctx.beginPath(); ctx.arc(fcx, fcy, fr2 * ringF / 3, a0, a0 + Math.PI / 2, false); ctx.stroke();
            }
            ctx.beginPath();
            for (var ray = 1; ray < 4; ray++) {
                var raa = a0 + ray * Math.PI / 8;
                ctx.moveTo(fcx + Math.cos(raa) * fr2 / 3, fcy + Math.sin(raa) * fr2 / 3);
                ctx.lineTo(fcx + Math.cos(raa) * fr2, fcy + Math.sin(raa) * fr2);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}

// a curl inside each end, like the scroll at the top of an old column. What sits on
// the plate moves in to clear them (Style.endRoom)
function scrolls(g) {
    var T = g.T, p = g.p;
    if (!(p.mark || p.frameColors) || g.L <= T) return;
    var color = p.frameColors && p.frameColors.length === 4 && g.lines === "gilded" ? p.frameColors[1] : p.mark;
    g.volute(g.x0 + T * 0.38, g.y0 + T / 2, T * 0.25, 1, color);
    g.volute(g.x1 - T * 0.38, g.y0 + T / 2, T * 0.25, -1, color);
}

var list = [
    { key: "none", label: "None" },
    { key: "studs", label: "Studs", about: "Studs sit in the corners.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, T = g.T, r = g.r;
        if (!(p.mark)) return;
        // four little studs, one in each corner
        var sr = Math.max(1.5, Math.min(2.5, T / 10));
        var inX = Math.max(r * 0.55, sr * 2.4), inY = sr * 2.4;
        ctx.fillStyle = p.mark;
        var spots = [[x0 + inX, y0 + inY], [x1 - inX, y0 + inY], [x0 + inX, y1 - inY], [x1 - inX, y1 - inY]];
        for (var si = 0; si < spots.length; si++) {
            ctx.beginPath();
            ctx.arc(spots[si][0], spots[si][1], sr, 0, Math.PI * 2, false);
            ctx.fill();
        }
    } },
    { key: "rivets", label: "Rivets", about: "Rivets run along the long sides.", draw: decor },
    { key: "pearls", label: "Pearls", about: "Pearls string along the long sides.", draw: decor },
    { key: "crosses", label: "Crosses", about: "Crosses sit in the corners.", draw: decor },
    { key: "stars", label: "Stars", about: "Stars sparkle in the corners.", draw: decor },
    { key: "brackets", label: "Brackets", about: "Brackets mark the corners.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T,
            markStyle = g.markStyle, mw = g.mw;
        if (!(p.mark)) return;
        var b = Math.max(3, Math.min(g.num(p.bracket, 6), L / 2, T));
        ctx.strokeStyle = markStyle;
        ctx.lineWidth = mw;
        var h = mw / 2;
        ctx.beginPath();
        ctx.moveTo(x0 + h, y0 + b); ctx.lineTo(x0 + h, y0 + h); ctx.lineTo(x0 + b, y0 + h);
        ctx.moveTo(x1 - b, y0 + h); ctx.lineTo(x1 - h, y0 + h); ctx.lineTo(x1 - h, y0 + b);
        ctx.moveTo(x1 - h, y1 - b); ctx.lineTo(x1 - h, y1 - h); ctx.lineTo(x1 - b, y1 - h);
        ctx.moveTo(x0 + b, y1 - h); ctx.lineTo(x0 + h, y1 - h); ctx.lineTo(x0 + h, y1 - b);
        ctx.stroke();
    } },
    { key: "rosettes", label: "Rosettes", about: "Rosettes sit in the corners.", draw: rosettes },
    { key: "diamonds", label: "Diamonds", about: "Diamonds sit in the middle of the long sides.", draw: rosettes },
    { key: "fleurons", label: "Fleurons", about: "Fleurons sit in the middle of the long sides.", draw: decor },
    { key: "filigree", label: "Filigree", about: "Filigree adds a fine inner frame with rosettes and diamonds.", draw: rosettes },
    { key: "flourish", label: "Flourish", about: "Flourish swirls out from the middle.", draw: decor },
    { key: "scrolls", label: "Scrolls", about: "Scrolls curl inside each end, and what is on the plate moves in to clear them.", draw: scrolls },
    { key: "chevrons", label: "Chevrons", about: "Chevrons point out of each end.", draw: decor },
    { key: "fans", label: "Fans", about: "Fans open in the corners.", draw: decor },
    { key: "deco", label: "Deco", about: "Deco steps three lines into each corner, the way the twenties did it.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T, r = g.r;
        if (!p.mark) return;
        var w = Math.max(0.8, T / 30), step = Math.max(1.8, T * 0.09), arm = Math.min(T * 0.42, L / 8), oi = 2 + r * 0.25;
        ctx.save();
        g.outline(x0, y0, L, T, r);
        ctx.clip();
        ctx.fillStyle = g.markStyle || p.mark;
        var cs = [[x0 + oi, y0 + oi, 1, 1], [x1 - oi, y0 + oi, -1, 1], [x1 - oi, y1 - oi, -1, -1], [x0 + oi, y1 - oi, 1, -1]];
        for (var c = 0; c < 4; c++) {
            var cx = cs[c][0], cy = cs[c][1], dx = cs[c][2], dy = cs[c][3];
            for (var i = 0; i < 3; i++) {
                var ox = cx + dx * step * i, oy = cy + dy * step * i, len = arm - step * i * 1.4;
                if (len <= w) break;
                ctx.fillRect(dx > 0 ? ox : ox - len, dy > 0 ? oy : oy - w, len, w);
                ctx.fillRect(dx > 0 ? ox : ox - w, dy > 0 ? oy : oy - len * 0.5, w, len * 0.5);
            }
        }
        ctx.restore();
    } },
    { key: "crown", label: "Crown", about: "Crown sets a little crown inside each end, and what is on the plate moves in to clear it.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, L = g.L, T = g.T;
        if (!p.mark || L < T * 1.6) return;
        var k = Math.max(2.2, T * 0.17), my = g.y0 + T / 2 + k * 0.15;
        ctx.save();
        ctx.fillStyle = g.markStyle || p.mark;
        var xs = [g.x0 + Math.max(T * 0.5, g.r * 0.6 + k * 1.4), g.x1 - Math.max(T * 0.5, g.r * 0.6 + k * 1.4)];
        for (var c = 0; c < 2; c++) {
            var mx = xs[c];
            ctx.beginPath();
            ctx.moveTo(mx - k, my + k * 0.45);
            ctx.lineTo(mx - k, my - k * 0.45);
            ctx.lineTo(mx - k * 0.5, my);
            ctx.lineTo(mx, my - k * 0.75);
            ctx.lineTo(mx + k * 0.5, my);
            ctx.lineTo(mx + k, my - k * 0.45);
            ctx.lineTo(mx + k, my + k * 0.45);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    } },
    { key: "laurels", label: "Laurels", about: "Laurels hold the plate between two half wreaths, and what is on it moves in to clear them.",
      draw: function (g) {
        var ctx = g.ctx, p = g.p, T = g.T, L = g.L;
        if (!p.mark || L < T * 1.6) return;
        var rad = T * 0.36, my = g.y0 + T / 2;
        var lx = Math.max(1.6, T * 0.1), ly = Math.max(0.8, T * 0.045);
        ctx.save();
        ctx.fillStyle = g.markStyle || p.mark;
        for (var side = -1; side <= 1; side += 2) {
            // the middle of the wreath sits inside the end, the leaves curve round toward it
            var cx = side < 0 ? g.x0 + T * 0.62 : g.x1 - T * 0.62;
            for (var i = 0; i < 5; i++) {
                var a = (side < 0 ? Math.PI : 0) + (i - 2) * 0.42;
                var px = cx + Math.cos(a) * rad, py = my + Math.sin(a) * rad;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(a + Math.PI / 2 + side * 0.5);
                ctx.beginPath();
                ctx.ellipse(-lx, -ly, lx * 2, ly * 2);    // Qt's ellipse takes the box around it
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    } }
];

var byKey = {};
for (var i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
