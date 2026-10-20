.pragma library

// The ends of a shape. One entry per kind of end in the settings, in the order
// the tiles show.
//
// An end is drawn from a list of points written for the LEFT end, measured inward
// from it: u = how far into the shape, v = 0 at the top and T at the bottom. The
// left end is walked from the bottom up; the right end uses the same kind of list,
// mirrored. Between two points the link is a straight line (null), a round corner
// at a point ({ arc: [u, v], r }) or a curve pulled toward a point ({ q: [u, v] }).
//
// entry fields:
//   key, label      the saved value and the name on the tile
//   about           one sentence for the settings hint, shown when it's picked
//   form(side, dir, inner)
//                   which form this end takes on one side: side "L" or "R",
//                   dir "right" | "left" | "both", inner "start" | "end" (the side
//                   that faces the windows). Returns a key of `forms` below
//   pointing        true when Pointing changes it
//   room, extraMargin, pad, ears
//                   spacing hints for shapes laid out in a row; the widget measures
//                   its ends itself (Style.endRoom) and doesn't need them
//   afterFill(g)    optional drawing right after the fill (Folded corner's flaps)
//   onTop(g)        optional drawing on top of everything

// a form leaning one way: "Top" or "Bottom" is the side of the end that is pulled in
function leaning(base, side, dir, inner) {
    var left = side === "L";
    if (dir === "both") return base + (inner === "start" ? "Top" : "Bottom");   // narrow toward the windows
    if (dir === "left") return base + (left ? "Bottom" : "Top");
    return base + (left ? "Top" : "Bottom");                                      // right: leans like /
}
// one form at the end it points to, another at the other end
function pointed(front, back, side, dir) {
    if (dir === "both") return front;
    if (dir === "left") return side === "L" ? front : back;
    return side === "L" ? back : front;
}

// sizes most forms are built from, for a shape T thick and L long
function sizes(T, L) {
    return { s: Math.min(T * 0.5, L / 3),        // how deep slants, points and notches go
             c: Math.min(T / 3, L / 4),          // chamfer size
             big: Math.min(T / 2, L / 2),        // leaf corners
             m: T / 2 };
}

// every form: function (T, L, rt, rb) -> { pts, links }. rt and rb are the top and
// bottom corner radius (0 where the shape touches the screen edge or is square)
var forms = {
    round: function (T, L, rt, rb) {
        var pts = [], links = [];
        if (rb > 0) { pts.push([rb, T]); pts.push([0, T - rb]); links.push({ arc: [0, T], r: rb }); }
        else pts.push([0, T]);
        if (rt > 0) { links.push(null); pts.push([0, rt]); pts.push([rt, 0]); links.push({ arc: [0, 0], r: rt }); }
        else { links.push(null); pts.push([0, 0]); }
        return { pts: pts, links: links };
    },
    roundBoth: function (T, L) { var k = sizes(T, L); return forms.round(T, L, k.big, k.big); },
    square: function (T) { return { pts: [[0, T], [0, 0]], links: [null] }; },
    insetTop: function (T, L) { var k = sizes(T, L); return { pts: [[0, T], [k.s, 0]], links: [null] }; },
    insetBottom: function (T, L) { var k = sizes(T, L); return { pts: [[k.s, T], [0, 0]], links: [null] }; },
    point: function (T, L) { var k = sizes(T, L); return { pts: [[k.s, T], [0, k.m], [k.s, 0]], links: [null, null] }; },
    notch: function (T, L) { var k = sizes(T, L); return { pts: [[0, T], [k.s, k.m], [0, 0]], links: [null, null] }; },
    chamfer: function (T, L) {
        var c = sizes(T, L).c;
        return { pts: [[c, T], [0, T - c], [0, c], [c, 0]], links: [null, null, null] };
    },
    bite: function (T) { return { pts: [[0, T], [0, 0]], links: [{ q: [T * 0.45, T / 2] }] }; },
    stepTop: function (T, L) {
        var k = sizes(T, L);
        return { pts: [[0, T], [0, k.m], [k.s * 0.6, k.m], [k.s * 0.6, 0]], links: [null, null, null] };
    },
    stepBottom: function (T, L) {
        var k = sizes(T, L);
        return { pts: [[k.s * 0.6, T], [k.s * 0.6, k.m], [0, k.m], [0, 0]], links: [null, null, null] };
    },
    roundTop: function (T, L) {
        var big = sizes(T, L).big;
        return { pts: [[0, T], [0, big], [big, 0]], links: [null, { arc: [0, 0], r: big }] };
    },
    roundBottom: function (T, L) {
        var big = sizes(T, L).big;
        return { pts: [[big, T], [0, T - big], [0, 0]], links: [{ arc: [0, T], r: big }, null] };
    },
    zigzag: function (T, L) {
        var z = Math.min(T * 0.3, L / 6), m = T / 2;
        return { pts: [[0, T], [z, T * 0.75], [0, m], [z, T * 0.25], [0, 0]], links: [null, null, null, null] };
    },
    scallop: function (T, L) {
        var w = Math.min(T * 0.35, L / 6);
        return { pts: [[0, T], [0, T / 2], [0, 0]], links: [{ q: [w, T * 0.75] }, { q: [w, T * 0.25] }] };
    },
    bulge: function (T, L) {
        var bl = Math.min(T * 0.3, L / 6);
        return { pts: [[bl, T], [bl, 0]], links: [{ q: [-bl, T / 2] }] };
    },
    // a round knob sticking out of the middle, like a puzzle piece
    puzzle: function (T, L) {
        var n = Math.min(T * 0.2, L / 8), kb = n * 1.7, m = T / 2;
        return { pts: [[kb, T], [kb, m + n * 0.55], [0, m], [kb, m - n * 0.55], [kb, 0]],
                 links: [null, { q: [kb * 0.05, m + n * 1.9] }, { q: [kb * 0.05, m - n * 1.9] }, null] };
    },
    // a curly brace, pointing out at the middle
    brace: function (T, L) {
        var bb = Math.min(T * 0.42, L / 5), m = T / 2;
        return { pts: [[bb, T], [bb * 0.4, m + bb * 0.55], [0, m], [bb * 0.4, m - bb * 0.55], [bb, 0]],
                 links: [{ q: [bb * 0.4, T] }, null, null, { q: [bb * 0.4, 0] }] };
    },
    // a soft S from the bottom to the top
    wave: function (T, L) {
        var wv = Math.min(T * 0.7, L / 4), m = T / 2;
        return { pts: [[0, T], [wv / 2, m], [wv, 0]], links: [{ q: [0, m] }, { q: [wv, m] }] };
    },
    // a square notch in the middle, like a battlement
    castle: function (T, L) {
        var cn = Math.min(T * 0.28, L / 6), ch = T * 0.2, m = T / 2;
        return { pts: [[0, T], [0, m + ch], [cn, m + ch], [cn, m - ch], [0, m - ch], [0, 0]],
                 links: [null, null, null, null, null] };
    },
    // an onion dome on its side: a round bulb that pulls in to a sharp tip
    dome: function (T, L) {
        var od = Math.min(T * 0.85, L / 4), m = T / 2;
        return { pts: [[od, T], [od * 0.18, T * 0.64], [0, m], [od * 0.18, T * 0.36], [od, 0]],
                 links: [{ q: [-od * 0.3, T * 0.96] }, { q: [od * 0.32, T * 0.56] }, { q: [od * 0.32, T * 0.44] }, { q: [-od * 0.3, T * 0.04] }] };
    },
    corbelTop: function (T, L) {
        var cbt = Math.min(T * 0.7, L / 4);
        return { pts: [[0, T], [0, T * 0.58], [cbt * 0.45, T * 0.3], [cbt, 0]],
                 links: [null, { q: [0, T * 0.3] }, { q: [cbt * 0.45, 0] }] };
    },
    corbelBottom: function (T, L) {
        var cbb = Math.min(T * 0.7, L / 4);
        return { pts: [[cbb, T], [cbb * 0.45, T * 0.7], [0, T * 0.42], [0, 0]],
                 links: [{ q: [cbb * 0.45, T] }, { q: [0, T * 0.7] }, null] };
    },
    // corners scooped inward, like an old picture frame
    cartouche: function (T, L) {
        var ck = Math.min(T * 0.32, L / 5);
        return { pts: [[ck, T], [0, T - ck], [0, ck], [ck, 0]], links: [{ q: [ck, T - ck] }, null, { q: [ck, ck] }] };
    },
    // a lily: a pointed middle petal between two small round ones
    fleur: function (T, L) {
        var fb = Math.min(T * 0.55, L / 5), m = T / 2;
        return { pts: [[fb, T], [fb, T * 0.68], [0, m], [fb, T * 0.32], [fb, 0]],
                 links: [{ q: [fb * 0.35, T * 0.98] }, { q: [fb * 0.2, T * 0.72] }, { q: [fb * 0.2, T * 0.28] }, { q: [fb * 0.35, T * 0.02] }] };
    },
    // a thin spike out of the middle
    needle: function (T, L) {
        var nd = Math.min(T * 0.6, L / 5), nw = Math.max(1, T * 0.06), m = T / 2;
        return { pts: [[nd, T], [nd, m + nw * 2], [0, m], [nd, m - nw * 2], [nd, 0]], links: [null, null, null, null] };
    },
    // three soft bumps sticking out
    cloud: function (T, L) {
        var cb = Math.min(T * 0.3, L / 8), m = T / 2;
        return { pts: [[cb, T], [cb, T * 0.66], [cb, T * 0.34], [cb, 0]],
                 links: [{ q: [-cb * 0.9, T * 0.83] }, { q: [-cb * 1.3, m] }, { q: [-cb * 0.9, T * 0.17] }] };
    },
    ogive: function (T, L) {
        var og = Math.min(T * 0.9, L / 4), m = T / 2;
        return { pts: [[og, T], [0, m], [og, 0]], links: [{ q: [og * 0.45, T] }, { q: [og * 0.45, 0] }] };
    },
    foldTop: function (T, L) {
        var ft = Math.min(T * 0.45, L / 4);
        return { pts: [[0, T], [0, ft], [ft, 0]], links: [null, null] };
    },
    foldBottom: function (T, L) {
        var fb = Math.min(T * 0.45, L / 4);
        return { pts: [[fb, T], [0, T - fb], [0, 0]], links: [null, null] };
    },
    // three square teeth
    teeth: function (T, L) {
        var td = Math.min(T * 0.22, L / 8), tq = T / 5;
        return { pts: [[0, T], [0, T - tq], [td, T - tq], [td, T - 2 * tq], [0, T - 2 * tq], [0, 2 * tq],
                       [td, 2 * tq], [td, tq], [0, tq], [0, 0]],
                 links: [null, null, null, null, null, null, null, null, null] };
    },
    // corners stepped in twice, like an engraved brass plate
    plaque: function (T, L) {
        var c = Math.min(T * 0.32, L / 5), d = c / 2;
        return { pts: [[c, T], [c, T - d], [d, T - d], [d, T - c], [0, T - c], [0, c], [d, c], [d, d], [c, d], [c, 0]],
                 links: [null, null, null, null, null, null, null, null, null] };
    },
    // half an ellipse, longer than a round end
    oval: function (T, L) {
        var o = Math.min(T * 0.9, L / 4);
        return { pts: [[o, T], [0, T / 2], [o, 0]], links: [{ q: [0, T] }, { q: [0, 0] }] };
    },
    // a perforated edge, like a postage stamp
    stamp: function (T, L) {
        var b = Math.min(T * 0.1, L / 10, 3), n = Math.max(3, Math.round(T / 6)), pts = [], links = [];
        for (var i = 0; i <= n; i++) { pts.push([0, T - T * i / n]); if (i > 0) links.push({ q: [b * 2, T - T * (i - 0.5) / n] }); }
        return { pts: pts, links: links };
    },
    swoopTop: function (T, L) {
        var sw = Math.min(T * 1.1, L / 3);
        return { pts: [[0, T], [sw, 0]], links: [{ q: [0, 0] }] };
    },
    swoopBottom: function (T, L) {
        var sb = Math.min(T * 1.1, L / 3);
        return { pts: [[sb, T], [0, 0]], links: [{ q: [0, T] }] };
    }
};

// the folded-over corners of "folded" ends: a darker triangle with a light crease
function flaps(g) {
    var ctx = g.ctx, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T, p = g.p;
    var dark = p.dark || "rgba(0,0,0,0.3)", light = p.light || "rgba(255,255,255,0.2)";
    var f = Math.min(T * 0.45, L / 4);
    var x1 = x0 + L, y1 = y0 + T;
    var formsNow = [byKey.folded.form("L", g.dir, g.inner), byKey.folded.form("R", g.dir, g.inner)];
    for (var i = 0; i < 2; i++) {
        var form = formsNow[i];
        if (form !== "foldTop" && form !== "foldBottom") continue;
        var left = i === 0;
        var cx = left ? x0 : x1, sx = left ? 1 : -1;
        var top = form === "foldTop";
        var cy = top ? y0 : y1, sy = top ? 1 : -1;
        // the flap: the corner turned inward
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * f);
        ctx.lineTo(cx + sx * f, cy);
        ctx.lineTo(cx + sx * f, cy + sy * f);
        ctx.closePath();
        ctx.fillStyle = dark;
        ctx.fill();
        ctx.strokeStyle = light;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * f);
        ctx.lineTo(cx + sx * f, cy);
        ctx.stroke();
    }
}

function fixed(name) { return function () { return name; }; }

var list = [
    { key: "rounded", label: "Rounded", about: "Rounded ends follow the Roundness setting.", form: fixed("round"), ears: true },
    { key: "capsule", label: "Capsule", about: "Capsule is fully round at both ends.", form: fixed("round"), ears: true, room: { thick: 0.08 } },
    { key: "square", label: "Square", about: "Square is a plain rectangle.", form: fixed("square"), ears: true },
    { key: "chamfer", label: "Cut corners", about: "Cut corners clips the corners at an angle.", form: fixed("chamfer"), room: { deep: 0.12 }, extraMargin: true },
    { key: "slant", label: "Slanted", about: "Slanted leans its ends, like a parallelogram.", pointing: true, room: { deep: 0.25 }, extraMargin: true,
      form: function (side, dir, inner) { return leaning("inset", side, dir, inner); } },
    { key: "arrow", label: "Arrows", about: "Arrows point one way, or both.", pointing: true, room: { deep: 0.25 }, extraMargin: true,
      form: function (side, dir) { return pointed("point", "notch", side, dir); } },
    { key: "ribbon", label: "Ribbon", about: "Ribbon has a notch cut into each end.", form: fixed("notch"), room: { deep: 0.3 }, extraMargin: true },
    { key: "bite", label: "Scooped", about: "Scooped hollows out each end.", form: fixed("bite"), room: { deep: 0.3 } },
    { key: "leaf", label: "Leaf", about: "Leaf rounds two opposite corners and keeps the others sharp.", pointing: true, room: { deep: 0.25 }, extraMargin: true,
      form: function (side, dir) {
          if (dir === "both") return "roundBoth";
          if (dir === "left") return side === "L" ? "roundBottom" : "roundTop";
          return side === "L" ? "roundTop" : "roundBottom";
      } },
    { key: "stepped", label: "Stepped", about: "Stepped steps in halfway across.", pointing: true, room: { deep: 0.25 }, extraMargin: true,
      form: function (side, dir, inner) { return leaning("step", side, dir, inner); } },
    { key: "tab", label: "Tab", about: "Tab rounds the end it points to and keeps the other square.", pointing: true, room: { deep: 0.25 },
      form: function (side, dir) { return pointed("roundBoth", "square", side, dir); } },
    { key: "drop", label: "Drop", about: "Drop points one way and is round at the back.", pointing: true, room: { deep: 0.25 }, extraMargin: true,
      form: function (side, dir) { return pointed("point", "roundBoth", side, dir); } },
    // a sail: one corner sweeps across the whole height
    { key: "swoop", label: "Sail", about: "Sail sweeps one corner across the whole thickness.", pointing: true, room: { deep: 0.4 }, extraMargin: true,
      form: function (side, dir, inner) { return leaning("swoop", side, dir, inner); } },
    // a rounded back and a curved point in front
    { key: "bullet", label: "Bullet", about: "Bullet has a curved point in front and a round back.", pointing: true, room: { deep: 0.4 }, extraMargin: true,
      form: function (side, dir) { return pointed("ogive", "roundBoth", side, dir); } },
    // one corner folded over, like a page
    { key: "folded", label: "Folded corner", about: "Folded corner turns a corner over, like a page.", pointing: true, room: { deep: 0.3 }, extraMargin: true, afterFill: flaps,
      form: function (side, dir, inner) {
          if (dir === "both") return "fold" + (inner === "start" ? "Bottom" : "Top");
          return pointed("foldTop", "square", side, dir);
      } },
    { key: "zigzag", label: "Zigzag", about: "Zigzag cuts each end in a zigzag.", form: fixed("zigzag"), room: { deep: 0.3 }, extraMargin: true },
    { key: "scallop", label: "Scalloped", about: "Scalloped has two round bites in each end.", form: fixed("scallop"), room: { deep: 0.3 }, extraMargin: true },
    { key: "bulge", label: "Bulging", about: "Bulging swells out at each end.", form: fixed("bulge"), extraMargin: true },
    { key: "wave", label: "Wave", about: "Wave runs a soft S across each end.", form: fixed("wave"), room: { deep: 0.3 }, extraMargin: true },
    { key: "brace", label: "Braces", about: "Braces puts the shape between curly brackets.", form: fixed("brace"), room: { deep: 0.3 }, extraMargin: true },
    { key: "castle", label: "Battlement", about: "Battlement cuts a square notch in each end.", form: fixed("castle"), room: { deep: 0.3 }, extraMargin: true },
    { key: "teeth", label: "Teeth", about: "Teeth gives each end three square teeth.", form: fixed("teeth"), room: { deep: 0.3 }, extraMargin: true },
    { key: "puzzle", label: "Puzzle", about: "Puzzle has a knob on each end, like a puzzle piece.", form: fixed("puzzle"), room: { deep: 0.4 }, extraMargin: true },
    { key: "needle", label: "Needle", about: "Needle shoots a thin spike out of each end.", form: fixed("needle"), room: { deep: 0.4 }, extraMargin: true },
    { key: "cloud", label: "Cloud", about: "Cloud puffs out three soft bumps at each end.", form: fixed("cloud"), room: { deep: 0.4 }, extraMargin: true },
    { key: "cartouche", label: "Cartouche", about: "Cartouche scoops the corners in, like an old picture frame.", form: fixed("cartouche"), room: { deep: 0.3 }, extraMargin: true },
    { key: "fleur", label: "Fleur", about: "Fleur ends in a lily: a pointed petal between two round ones.", form: fixed("fleur"), room: { deep: 0.4 }, extraMargin: true },
    { key: "plaque", label: "Plaque", about: "Plaque steps in at the corners, like an engraved brass plate.",
      form: fixed("plaque"), room: { deep: 0.3 }, extraMargin: true },
    { key: "oval", label: "Oval", about: "Oval ends in half an ellipse, longer than a round end.",
      form: fixed("oval"), room: { deep: 0.35 }, extraMargin: true },
    { key: "stamp", label: "Stamp", about: "Stamp has perforated ends, like a postage stamp.",
      form: fixed("stamp"), room: { deep: 0.12 } },
    { key: "dome", label: "Onion dome", about: "Onion dome swells into a bulb with a sharp tip, on its side.", form: fixed("dome"), room: { deep: 0.45 }, extraMargin: true },
    // a carved molding: two rounds stepping in toward one side
    { key: "corbel", label: "Corbel", about: "Corbel steps two rounds in toward one side, like a carved molding.", pointing: true, room: { deep: 0.3 }, extraMargin: true,
      form: function (side, dir, inner) { return leaning("corbel", side, dir, inner); } }
];

var byKey = {};
for (var i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
