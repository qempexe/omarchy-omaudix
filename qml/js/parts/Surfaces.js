.pragma library

// What the inside of a shape is made of. One entry per surface in the settings, in
// the order the tiles show.
//
// entry fields:
//   key, label     the saved value and the name on the tile
//   about          one sentence for the settings hint
//   fill           how much of the fill color shows, 0 to 1 (1 if left out)
//   solid          false when the shape doesn't hide what's behind it (true if left out)
//   noFill         nothing is filled at all (Clear)
//   noGradient     the Fill setting (gradient, glass) does nothing for it
//   noTexture      the Texture setting is greyed out for it
//   noDepth        the Depth setting does nothing for it
//   leans          it follows the Pointing setting
//   ownShadow      it always casts its own shadow (Only a shadow)
//
// drawing hooks, all optional, each gets g (see Paint.js):
//   base(g)               before the fill. May move g.y0, g.T and g.y1
//   fillStyle(g, style)   returns the style the shape is filled with
//   afterFill(g)          right after the fill, not clipped
//   inside(g)             details clipped to the shape
//   outside(g)            details not clipped, drawn after inside()

var list = [
    { key: "filled", label: "Solid" },
    { key: "faint", label: "Faint", about: "Faint is a light wash.", fill: 0.18, solid: false },
    { key: "twotone", label: "Two-tone", about: "Two-tone colors the half on the screen edge side.",
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T;
        if (!p.second) return;
        ctx.fillStyle = p.second;
        // the half on the screen edge side
        if (g.inner === "end") ctx.fillRect(x0 - T, y0, L + 2 * T, T / 2);
        else ctx.fillRect(x0 - T, y0 + T / 2, L + 2 * T, T / 2);
    } },
    { key: "split", label: "Split", about: "Split cuts the far end off in your color.", leans: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T, dir = g.dir;
        if (!(p.splitColor)) return;
        // a diagonal cut, the far part in a second color
        var sx = x0 + L * 0.58;
        ctx.fillStyle = p.splitColor;
        ctx.beginPath();
        if (dir === "left") {
            ctx.moveTo(x0 + L * 0.42 + T / 3, y0); ctx.lineTo(x0 - 1, y0); ctx.lineTo(x0 - 1, y1); ctx.lineTo(x0 + L * 0.42 - T / 3, y1);
        } else {
            ctx.moveTo(sx + T / 3, y0); ctx.lineTo(x1 + 1, y0); ctx.lineTo(x1 + 1, y1); ctx.lineTo(sx - T / 3, y1);
        }
        ctx.closePath();
        ctx.fill();
    } },
    { key: "frost", label: "Frost", about: "Frost is milky and speckled.", noGradient: true,
      fillStyle: function (g, style) { return g.p.frost || style; },
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, inner = g.inner;
        if (p.patternColor) g.texture("dots", p.patternColor, x0, y0, L, T);
        if (p.light) { ctx.fillStyle = p.light; ctx.fillRect(x0, inner === "end" ? y0 : y1 - 1, L, 1); }
    } },
    { key: "bevel", label: "Bevel", about: "Bevel looks pressed out, lit from the top left.",
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T;
        if (!(p.light && p.dark)) return;
        // light from the top left, a shadow on the bottom right
        ctx.fillStyle = p.light;
        ctx.fillRect(x0, y0, L, 2); ctx.fillRect(x0, y0, 2, T);
        ctx.fillStyle = p.dark;
        ctx.fillRect(x0, y1 - 2, L, 2); ctx.fillRect(x1 - 2, y0, 2, T);
    } },
    { key: "keycap", label: "Keycap", about: "Keycap stands on a darker side, like a key.",
      base: function (g) {
        // a darker copy sits under the shape, showing on the windows side
        var ctx = g.ctx, p = g.p, T = g.T;
        if (!p.key) return;
        var drop = Math.max(2, Math.min(4, T / 6));
        ctx.fillStyle = p.key;
        g.outline(g.x0, g.y0, g.L, T, g.r);
        ctx.fill();
        // the key itself is a little shorter, so the side shows
        if (g.inner === "end") g.T = T - drop;
        else { g.y0 = g.y0 + drop; g.T = T - drop; }
        g.y1 = g.y0 + g.T;
    },
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, inner = g.inner;
        if (!(p.light)) return;
        ctx.fillStyle = p.light;
        ctx.fillRect(x0, inner === "end" ? y0 : y1 - 1, L, 1);
    } },
    { key: "metal", label: "Metal", about: "Metal is brushed.", noGradient: true,
      fillStyle: function (g, style) {
        // brushed metal: light at the top, a dark crease below the middle
        var p = g.p;
        if (!(p.metal && p.metal.length === 4)) return style;
        var mg = g.ctx.createLinearGradient(g.x0, g.y0, g.x0, g.y1);
        mg.addColorStop(0, p.metal[0]);
        mg.addColorStop(0.45, p.metal[1]);
        mg.addColorStop(0.56, p.metal[2]);
        mg.addColorStop(1, p.metal[3]);
        return mg;
    },
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L;
        if (!(p.light)) return;
        // brushed: fine lines along the length
        ctx.fillStyle = p.light;
        ctx.globalAlpha = 0.25;
        for (var my = y0 + 2; my < y1 - 1; my += 2) ctx.fillRect(x0, my, L, 0.5);
        ctx.globalAlpha = 1;
    } },
    { key: "carbon", label: "Carbon", about: "Carbon is woven.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1;
        if (!(p.light && p.dark)) return;
        // a woven carbon fibre pattern
        var cc = 3;
        for (var ci = 0; x0 + ci * cc < x1; ci++)
            for (var cj = 0; y0 + cj * cc < y1; cj++) {
                var even = (ci + cj) % 2 === 0;
                ctx.fillStyle = even ? p.dark : p.light;
                ctx.globalAlpha = even ? 0.55 : 0.35;
                if (even) ctx.fillRect(x0 + ci * cc, y0 + cj * cc, cc, cc / 2);
                else ctx.fillRect(x0 + ci * cc, y0 + cj * cc + cc / 2, cc / 2, cc / 2);
            }
        ctx.globalAlpha = 1;
    } },
    { key: "crt", label: "Old screen", about: "Old screen has scanlines.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, ink = g.ink;
        // scanlines, and a faint light along the middle
        if (p.dark) {
            ctx.fillStyle = p.dark;
            for (var sy = y0 + 1; sy < y1; sy += 3) ctx.fillRect(x0, sy, L, 1);
        }
        if (ink) {
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = ink;
            ctx.fillRect(x0, y0 + T * 0.3, L, T * 0.4);
            ctx.globalAlpha = 1;
        }
    } },
    { key: "candy", label: "Candy", about: "Candy has wide stripes.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, T = g.T, ink = g.ink;
        if (!(ink)) return;
        // wide diagonal stripes, like a candy cane
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.24;
        var cs = Math.max(6, T * 0.45);
        for (var cx0 = x0 - T; cx0 < x1 + T; cx0 += cs * 2) {
            ctx.beginPath();
            ctx.moveTo(cx0, y1); ctx.lineTo(cx0 + cs, y1); ctx.lineTo(cx0 + cs + T, y0); ctx.lineTo(cx0 + T, y0);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
    } },
    { key: "halftone", label: "Halftone", about: "Halftone has dots that grow.", noTexture: true, leans: true,
      inside: function (g) {
        var ctx = g.ctx, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, dir = g.dir, ink = g.ink;
        if (!(ink)) return;
        // dots that grow toward the end the shape points to
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.4;
        var hs = 4;
        for (var hx = x0 + 2; hx < x1; hx += hs) {
            var ht = (hx - x0) / Math.max(1, L);
            if (dir === "left") ht = 1 - ht;
            var hr = 0.25 + 1.35 * ht * ht;
            for (var hy = y0 + 2 + ((Math.round((hx - x0) / hs) % 2) ? hs / 2 : 0); hy < y1; hy += hs) {
                ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2, false); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    } },
    { key: "holo", label: "Hologram", about: "Hologram has a rainbow sheen.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, inner = g.inner;
        // a rainbow sheen across the shape, like a hologram sticker
        var hg = ctx.createLinearGradient(x0, y1, x0 + Math.max(T * 3, L * 0.6), y0);
        var hues = ["rgba(255,90,200,0.26)", "rgba(90,200,255,0.26)", "rgba(120,255,170,0.24)",
                    "rgba(255,230,100,0.24)", "rgba(255,90,200,0.26)"];
        for (var hi = 0; hi < hues.length; hi++) hg.addColorStop(hi / (hues.length - 1), hues[hi]);
        ctx.fillStyle = hg;
        ctx.fillRect(x0, y0, L, T);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(x0, inner === "end" ? y0 + 1 : y1 - 2, L, 1);
    } },
    { key: "comet", label: "Comet", about: "A Comet fades in from nothing.", noGradient: true, leans: true,
      fillStyle: function (g, style) {
        // fades in from nothing to a bright head, at the end the shape points to
        var p = g.p;
        if (!p.head) return style;
        var toLeft = g.dir === "left";
        var cg = g.ctx.createLinearGradient(toLeft ? g.x1 : g.x0, g.y0, toLeft ? g.x0 : g.x1, g.y0);
        cg.addColorStop(0, "rgba(0,0,0,0)");
        cg.addColorStop(0.5, p.fill || "rgba(0,0,0,0)");
        cg.addColorStop(1, p.head);
        return cg;
    },
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, T = g.T, dir = g.dir;
        if (!(p.head)) return;
        // a bright point at the head
        ctx.fillStyle = p.head;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(dir === "left" ? x0 : x1 - 2, y0, 2, T);
        ctx.globalAlpha = 1;
    } },
    { key: "damask", label: "Damask", about: "Damask is an old wallpaper.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, T = g.T, ink = g.ink;
        if (!(ink)) return;
        // an old wallpaper: a lattice of diamonds with a dot in each
        ctx.strokeStyle = ink;
        ctx.fillStyle = ink;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.2;
        var dd = Math.max(8, T * 0.5);
        ctx.beginPath();
        for (var da = x0 - T; da < x1 + T; da += dd) {
            ctx.moveTo(da, y1); ctx.lineTo(da + T, y0);
            ctx.moveTo(da, y0); ctx.lineTo(da + T, y1);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.32;
        for (var dx2 = x0 + dd / 2 - T / 2; dx2 < x1 + T; dx2 += dd)
            { ctx.beginPath(); ctx.arc(dx2 + T / 2, y0 + T / 2, Math.max(0.8, T * 0.05), 0, Math.PI * 2, false); ctx.fill(); }
        ctx.globalAlpha = 1;
    } },
    { key: "velvet", label: "Velvet", about: "Velvet has a soft sheen.", noGradient: true,
      fillStyle: function (g, style) {
        // deep at the edges, a soft sheen through the middle
        var p = g.p;
        if (!p.velvetSheen) return style;
        var vg = g.ctx.createLinearGradient(g.x0, g.y0, g.x0, g.y1);
        vg.addColorStop(0, p.fill);
        vg.addColorStop(0.42, p.velvetSheen);
        vg.addColorStop(0.58, p.velvetSheen);
        vg.addColorStop(1, p.fill);
        return vg;
    },
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T;
        if (!(p.light)) return;
        ctx.fillStyle = p.light;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x0, y0 + T * 0.48, L, 1);
        ctx.globalAlpha = 1;
    } },
    { key: "marble", label: "Marble", about: "Marble has winding veins.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, ink = g.ink;
        // veined stone: a few soft veins winding across, the same every time
        var veins = Math.max(2, Math.round(L / 55));
        var rnd = function(k) { var v = Math.sin(k * 12.9898 + L * 0.0137) * 43758.5453; return v - Math.floor(v); };
        for (var vi = 0; vi < veins; vi++) {
            var vx = x0 + (vi + rnd(vi)) * L / veins;
            var bend = (rnd(vi + 7) - 0.5) * T * 2.2;
            var lean = (rnd(vi + 13) - 0.5) * T * 1.6;
            for (var pass = 0; pass < 2; pass++) {
                ctx.strokeStyle = pass === 0 ? (ink || "rgba(0,0,0,0.3)") : (p.light || "rgba(255,255,255,0.3)");
                ctx.globalAlpha = pass === 0 ? 0.16 : 0.45;
                ctx.lineWidth = pass === 0 ? 2.2 : 0.7;
                ctx.beginPath();
                ctx.moveTo(vx, y0 - 1);
                ctx.quadraticCurveTo(vx + bend, y0 + T * 0.5, vx + lean, y1 + 1);
                ctx.stroke();
            }
            // a thin branch off each vein
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(vx + bend * 0.45, y0 + T * 0.45);
            ctx.quadraticCurveTo(vx + bend * 0.45 + T * 0.6, y0 + T * 0.3, vx + bend * 0.45 + T * 1.1, y0 + T * 0.62);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    } },
    { key: "ledge", label: "Ledge", about: "Ledge is a thick strip toward your windows.", fill: 0.25, solid: false,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, y1 = g.y1, L = g.L, T = g.T, inner = g.inner,
            ink = g.ink;
        if (!(ink)) return;
        // a solid strip along the side facing the windows
        var lh = Math.max(3, Math.min(T / 3, g.num(p.markWidth, 2) * 2 + 1));
        ctx.fillStyle = ink;
        ctx.fillRect(x0, inner === "end" ? y1 - lh : y0, L, lh);
    } },
    { key: "band", label: "Band", about: "Band runs a soft stripe through the middle.", fill: 0.3, solid: false,
      inside: function (g) {
        var ctx = g.ctx, ink = g.ink, T = g.T;
        if (!ink) return;
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.35;
        var bh = Math.max(2, T * 0.3);
        ctx.fillRect(g.x0, g.y0 + (T - bh) / 2, g.L, bh);
        ctx.globalAlpha = 1;
    } },
    { key: "underglow", label: "Underglow", about: "Underglow lets light spill toward your windows.",
      outside: function (g) {
        // a light spilling toward the windows, from under the shape
        var ctx = g.ctx, ink = g.ink, x0 = g.x0, L = g.L;
        if (!ink) return;
        ctx.save();
        // as soft as the room around the shape allows
        ctx.shadowBlur = Math.min(10, Math.max(2, (typeof g.p.margin === "number" ? g.p.margin : 8) * 1.3));
        ctx.shadowColor = ink;
        ctx.fillStyle = ink;
        var gy0 = g.inner === "end" ? g.y1 - 2 : g.y0;
        var inset0 = Math.min(Math.max(g.r, 4), L / 4);
        ctx.fillRect(x0 + inset0, gy0, L - 2 * inset0, 2);
        ctx.restore();
    } },
    { key: "spiderweb", label: "Spiderweb", about: "Spiderweb spins a web in two corners.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T, tone = g.tone;
        // a web in two opposite corners: threads fanning out, joined by sagging rings
        var webs = [[x0, y0, 1, 1], [x1, y1, -1, -1]];
        ctx.strokeStyle = tone;
        ctx.lineWidth = 0.6;
        for (var wb = 0; wb < webs.length; wb++) {
            var wx = webs[wb][0], wy = webs[wb][1], sx2 = webs[wb][2], sy2 = webs[wb][3];
            var reach = Math.min(T * 1.9, L * 0.45), spokes = 6;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            for (var sp = 0; sp <= spokes; sp++) {
                var ang = sp / spokes * Math.PI / 2;
                ctx.moveTo(wx, wy);
                ctx.lineTo(wx + sx2 * Math.cos(ang) * reach, wy + sy2 * Math.sin(ang) * reach);
            }
            ctx.stroke();
            ctx.globalAlpha = 0.38;
            for (var ring = 1; ring <= 5; ring++) {
                var rr = reach * ring / 5.4;
                ctx.beginPath();
                for (var sq = 0; sq < spokes; sq++) {
                    var a1 = sq / spokes * Math.PI / 2, a2 = (sq + 1) / spokes * Math.PI / 2, am = (a1 + a2) / 2;
                    var px1 = wx + sx2 * Math.cos(a1) * rr, py1 = wy + sy2 * Math.sin(a1) * rr;
                    var px2 = wx + sx2 * Math.cos(a2) * rr, py2 = wy + sy2 * Math.sin(a2) * rr;
                    // each thread sags a little toward the middle of the web
                    var sag = rr * 0.8;
                    if (sq === 0) ctx.moveTo(px1, py1);
                    ctx.quadraticCurveTo(wx + sx2 * Math.cos(am) * sag, wy + sy2 * Math.sin(am) * sag, px2, py2);
                }
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    } },
    { key: "wood", label: "Wood", about: "Wood has grain around a knot.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, L = g.L, T = g.T, seed = g.seed;
        // grain running along the shape, bending around a knot
        var rowsW = Math.max(5, Math.round(T / 3.5));
        var knotX = x0 + L * (0.25 + 0.5 * g.hash(1, seed)), knotY = y0 + T * (0.35 + 0.3 * g.hash(2, seed));
        for (var wr = 0; wr < rowsW; wr++) {
            var baseY = y0 + T * (wr + 0.5) / rowsW;
            ctx.strokeStyle = wr % 2 ? (p.dark || "rgba(0,0,0,0.3)") : (p.light || "rgba(255,255,255,0.2)");
            ctx.globalAlpha = wr % 2 ? 0.85 : 0.6;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (var wx2 = x0 - 2; wx2 <= x1 + 2; wx2 += 3) {
                var dk = (wx2 - knotX) / (T * 0.9);
                var push = Math.exp(-dk * dk) * T * 0.28 * (baseY < knotY ? -1 : 1) * (1 - Math.min(1, Math.abs(baseY - knotY) / T));
                var wy2 = baseY + Math.sin(wx2 / (9 + wr) + wr * 1.7 + seed) * 0.8 + push;
                if (wx2 === x0 - 2) ctx.moveTo(wx2, wy2); else ctx.lineTo(wx2, wy2);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = p.dark || "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.arc(knotX, knotY, Math.max(1.2, T * 0.08), 0, Math.PI * 2, false); ctx.stroke();
        ctx.globalAlpha = 1;
    } },
    { key: "terrazzo", label: "Terrazzo", about: "Terrazzo has chips of stone.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, seed = g.seed, tone = g.tone;
        // chips of stone in a few tones, scattered over the shape
        var chips = Math.round(L * T / 45);
        var tones = [tone, p.light || "rgba(255,255,255,0.4)", p.dark || "rgba(0,0,0,0.4)", p.second || tone];
        for (var cz = 0; cz < chips; cz++) {
            var cx2 = x0 + g.hash(cz * 3 + 1, seed) * L, cy2 = y0 + g.hash(cz * 3 + 2, seed) * T;
            var cs2 = 0.6 + g.hash(cz * 3 + 3, seed) * 1.9, rot = g.hash(cz + 50, seed) * Math.PI;
            ctx.fillStyle = tones[cz % tones.length];
            ctx.globalAlpha = 0.35 + 0.35 * g.hash(cz + 90, seed);
            ctx.beginPath();
            for (var cv = 0; cv < 4; cv++) {
                var ca = rot + cv * Math.PI / 2 + g.hash(cz * 7 + cv, seed) * 0.6;
                var cr = cs2 * (0.6 + 0.6 * g.hash(cz * 11 + cv, seed));
                if (cv === 0) ctx.moveTo(cx2 + Math.cos(ca) * cr, cy2 + Math.sin(ca) * cr);
                else ctx.lineTo(cx2 + Math.cos(ca) * cr, cy2 + Math.sin(ca) * cr);
            }
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
    } },
    { key: "crackle", label: "Crackle", about: "Crackle is a cracked glaze.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, seed = g.seed, tone = g.tone;
        // a cracked glaze: fine cracks that wander and branch
        var cracks = Math.max(3, Math.round(L / 22));
        for (var ck2 = 0; ck2 < cracks; ck2++) {
            var kx = x0 + g.hash(ck2 + 1, seed) * L, ky = y0 + g.hash(ck2 + 31, seed) * T;
            var kang = g.hash(ck2 + 61, seed) * Math.PI * 2;
            for (var pass2 = 0; pass2 < 2; pass2++) {
                ctx.strokeStyle = pass2 === 0 ? tone : (p.dark || "rgba(0,0,0,0.4)");
                ctx.globalAlpha = pass2 === 0 ? 0.45 : 0.8;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                var cxk = kx + pass2 * 0.6, cyk = ky + pass2 * 0.6, ca2 = kang;
                ctx.moveTo(cxk, cyk);
                for (var seg = 0; seg < 6; seg++) {
                    ca2 += (g.hash(ck2 * 13 + seg, seed) - 0.5) * 1.6;
                    cxk += Math.cos(ca2) * T * 0.32; cyk += Math.sin(ca2) * T * 0.32;
                    ctx.lineTo(cxk, cyk);
                }
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    } },
    { key: "topo", label: "Contours", about: "Contours draws the lines of a map.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, seed = g.seed, tone = g.tone;
        // contour lines of a little map, around a few hills
        var hills = Math.max(1, Math.round(L / (T * 3)));
        ctx.strokeStyle = tone;
        ctx.lineWidth = 0.6;
        for (var hl = 0; hl < hills; hl++) {
            var hx = x0 + L * (hl + 0.3 + 0.4 * g.hash(hl + 3, seed)) / hills, hy = y0 + T * (0.3 + 0.4 * g.hash(hl + 7, seed));
            for (var ring2 = 1; ring2 <= 7; ring2++) {
                var rad = ring2 * Math.max(2.2, T * 0.14);
                ctx.globalAlpha = 0.42 - ring2 * 0.035;
                ctx.beginPath();
                for (var ta = 0; ta <= 24; ta++) {
                    var tt = ta / 24 * Math.PI * 2;
                    var wob = 1 + 0.18 * Math.sin(tt * 3 + hl + ring2 * 0.4 + seed);
                    var tx = hx + Math.cos(tt) * rad * wob * 1.6, ty = hy + Math.sin(tt) * rad * wob;
                    if (ta === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
                }
                ctx.closePath(); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    } },
    { key: "nebula", label: "Nebula", about: "Nebula has clouds and stars.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, seed = g.seed, tone = g.tone;
        // soft clouds of color and a few faint stars
        var clouds = Math.max(2, Math.round(L / (T * 1.6)));
        for (var nb = 0; nb < clouds; nb++) {
            var nx = x0 + g.hash(nb + 5, seed) * L, ny = y0 + g.hash(nb + 15, seed) * T;
            var nr = T * (0.7 + g.hash(nb + 25, seed) * 1.1);
            var ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
            ng.addColorStop(0, nb % 2 ? tone : (p.splitColor || tone));
            ng.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = ng;
            ctx.globalAlpha = 0.45;
            ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
        }
        ctx.fillStyle = p.light || "rgba(255,255,255,0.6)";
        for (var st2 = 0; st2 < Math.round(L / 9); st2++) {
            ctx.globalAlpha = 0.4 + 0.5 * g.hash(st2 + 200, seed);
            ctx.fillRect(x0 + g.hash(st2 + 300, seed) * L, y0 + g.hash(st2 + 400, seed) * T, 0.8, 0.8);
        }
        ctx.globalAlpha = 1;
    } },
    { key: "leather", label: "Leather", about: "Leather has a pebbled grain.", noTexture: true,
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T,
            seed = g.seed;
        // a pebbled grain, darker toward the edges
        ctx.strokeStyle = p.light || "rgba(255,255,255,0.2)";
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.5;
        var pg = 3;
        for (var lx = x0 + 1; lx < x1; lx += pg)
            for (var ly = y0 + 1; ly < y1; ly += pg) {
                var jx = (g.hash(lx * 7 + ly, seed) - 0.5) * 1.6, jy = (g.hash(lx + ly * 5, seed) - 0.5) * 1.6;
                ctx.beginPath(); ctx.arc(lx + jx, ly + jy, 0.9 + g.hash(lx + ly, seed) * 0.5, 0, Math.PI * 2, false); ctx.stroke();
            }
        ctx.globalAlpha = 1;
        var vg2 = ctx.createLinearGradient(x0, y0, x0, y1);
        vg2.addColorStop(0, p.dark || "rgba(0,0,0,0.3)");
        vg2.addColorStop(0.3, "rgba(0,0,0,0)");
        vg2.addColorStop(0.7, "rgba(0,0,0,0)");
        vg2.addColorStop(1, p.dark || "rgba(0,0,0,0.3)");
        ctx.fillStyle = vg2;
        ctx.fillRect(x0, y0, L, T);
    } },
    { key: "stained", label: "Stained glass", about: "Stained glass has panes of color held by dark lead.",
      inside: function (g) {
        var ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, x1 = g.x1, y1 = g.y1, L = g.L, T = g.T,
            ink = g.ink, seed = g.seed;
        // stained glass: panes in a few tints, held together by dark lead
        var pw = Math.max(10, T * 1.1);
        var cols = Math.max(1, Math.round(L / pw));
        var cuts = [];   // the slanted lead lines across the shape, with their top and bottom x
        for (var cI = 0; cI <= cols; cI++) {
            var baseX = x0 + L * cI / cols;
            var lean2 = cI === 0 || cI === cols ? 0 : (g.hash(cI + 3, seed) - 0.5) * pw * 0.8;
            cuts.push([baseX + lean2, baseX - lean2]);
        }
        var paneTones = [ink || "rgba(255,255,255,0.3)", p.splitColor || ink, p.light || "rgba(255,255,255,0.3)",
                         p.second || ink, p.velvetSheen || ink];
        for (var pc = 0; pc < cols; pc++) {
            // each column is split once, at a height of its own
            var midY = y0 + T * (0.3 + 0.4 * g.hash(pc + 11, seed));
            var tl = cuts[pc][0], tr = cuts[pc + 1][0], bl = cuts[pc][1], br = cuts[pc + 1][1];
            var ml = tl + (bl - tl) * (midY - y0) / T, mr = tr + (br - tr) * (midY - y0) / T;
            var panes = [[[tl, y0], [tr, y0], [mr, midY], [ml, midY]], [[ml, midY], [mr, midY], [br, y1], [bl, y1]]];
            for (var pn = 0; pn < 2; pn++) {
                ctx.fillStyle = paneTones[Math.floor(g.hash(pc * 2 + pn + 40, seed) * paneTones.length) % paneTones.length];
                ctx.globalAlpha = 0.22 + 0.25 * g.hash(pc * 2 + pn + 80, seed);
                ctx.beginPath();
                for (var pv = 0; pv < 4; pv++) {
                    if (pv === 0) ctx.moveTo(panes[pn][pv][0], panes[pn][pv][1]);
                    else ctx.lineTo(panes[pn][pv][0], panes[pn][pv][1]);
                }
                ctx.closePath(); ctx.fill();
            }
            // the lead between the two panes
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = "rgba(8,6,4,1)";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(ml, midY); ctx.lineTo(mr, midY); ctx.stroke();
        }
        // the lead: a dark line with a faint bright edge beside it
        for (var lp = 0; lp < 2; lp++) {
            ctx.globalAlpha = lp === 0 ? 0.9 : 0.25;
            ctx.strokeStyle = lp === 0 ? "rgba(8,6,4,1)" : (p.light || "rgba(255,255,255,0.4)");
            ctx.lineWidth = lp === 0 ? 1.5 : 0.6;
            var lo2 = lp === 0 ? 0 : 1.1;
            ctx.beginPath();
            for (var cl = 1; cl < cols; cl++) { ctx.moveTo(cuts[cl][0] + lo2, y0); ctx.lineTo(cuts[cl][1] + lo2, y1); }
            ctx.stroke();
        }
        // a soft shine on the glass
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = p.light || "rgba(255,255,255,0.3)";
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(x0, y0 + 1.5); ctx.lineTo(x1, y0 + 1.5); ctx.stroke();
        ctx.globalAlpha = 1;
    } },
    { key: "shadow", label: "Only a shadow", about: "Only a shadow leaves just the shadow.", solid: false, noGradient: true, noTexture: true, noDepth: true, ownShadow: true,
      afterFill: function (g) {
        // only the shadow is kept, the shape itself is cut away
        var ctx = g.ctx;
        ctx.shadowBlur = 0;
        ctx.shadowColor = "rgba(0,0,0,0)";
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,1)";
        g.outline(g.x0, g.y0, g.L, g.T, g.r);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    } },
    { key: "clear", label: "Clear", about: "Clear shows nothing at all, so only the lines and ornaments are left.", fill: 0, solid: false, noFill: true, noGradient: true, noTexture: true, noDepth: true }
];

var byKey = {};
for (var i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
