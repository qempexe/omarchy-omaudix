.pragma library

// Turns a shape's outline into a row of points, so a line can walk all the way round
// it: waves, chains and beads follow slanted, pointed or curled ends as well as the
// long sides.
//
// trace(pathFn) runs pathFn(ctx) on a pretend canvas that writes down every point,
// with curves and arcs cut into short straight pieces. It returns
//   { pts: [[x, y], ...], len, cw }   the first closed outline, its length, and
//                                      whether it runs clockwise on the screen
// walk(tr, step, fn) calls fn(x, y, tx, ty, nx, ny, i, n) at n evenly spaced points,
// about `step` apart: the point, which way the outline runs there, and which way
// is inward.

function recorder() {
    var paths = [], cur = null, sx = 0, sy = 0, px = 0, py = 0;
    function start(x, y) { cur = [[x, y]]; paths.push(cur); sx = x; sy = y; px = x; py = y; }
    function to(x, y) {
        if (!cur) { start(x, y); return; }
        if (Math.abs(x - px) < 1e-6 && Math.abs(y - py) < 1e-6) return;
        cur.push([x, y]); px = x; py = y;
    }
    function arcPts(cx, cy, r, a0, a1, ccw) {
        var d = a1 - a0;
        if (ccw) { while (d > 0) d -= Math.PI * 2; if (d < -Math.PI * 2) d = -Math.PI * 2; }
        else { while (d < 0) d += Math.PI * 2; if (d > Math.PI * 2) d = Math.PI * 2; }
        var n = Math.max(2, Math.ceil(Math.abs(d) * Math.max(4, r) / 4));
        n = Math.min(n, 96);
        var first = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
        if (!cur) start(first[0], first[1]); else to(first[0], first[1]);
        for (var i = 1; i <= n; i++) {
            var a = a0 + d * i / n;
            to(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
    }
    return {
        paths: paths,
        beginPath: function () { paths.length = 0; cur = null; },
        moveTo: function (x, y) { start(x, y); },
        lineTo: function (x, y) { to(x, y); },
        closePath: function () { if (cur) { to(sx, sy); cur.closed = true; } },
        quadraticCurveTo: function (qx, qy, x, y) {
            var x0 = px, y0 = py, n = 14;
            for (var i = 1; i <= n; i++) {
                var t = i / n, u = 1 - t;
                to(u * u * x0 + 2 * u * t * qx + t * t * x, u * u * y0 + 2 * u * t * qy + t * t * y);
            }
        },
        bezierCurveTo: function (ax, ay, bx, by, x, y) {
            var x0 = px, y0 = py, n = 18;
            for (var i = 1; i <= n; i++) {
                var t = i / n, u = 1 - t;
                to(u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x,
                   u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y);
            }
        },
        arc: function (cx, cy, r, a0, a1, ccw) { arcPts(cx, cy, r, a0, a1, ccw === true); },
        arcTo: function (x1, y1, x2, y2, r) {
            var x0 = px, y0 = py;
            var ax = x0 - x1, ay = y0 - y1, bx = x2 - x1, by = y2 - y1;
            var la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by);
            if (!(r > 0) || la < 1e-6 || lb < 1e-6) { to(x1, y1); return; }
            ax /= la; ay /= la; bx /= lb; by /= lb;
            var cosT = ax * bx + ay * by;
            if (cosT > 0.99999 || cosT < -0.99999) { to(x1, y1); return; }
            var theta = Math.acos(cosT), d = r / Math.tan(theta / 2);
            var t1x = x1 + ax * d, t1y = y1 + ay * d, t2x = x1 + bx * d, t2y = y1 + by * d;
            var mx = ax + bx, my = ay + by, ml = Math.sqrt(mx * mx + my * my);
            var k = r / Math.sin(theta / 2);
            var cx = x1 + mx / ml * k, cy = y1 + my / ml * k;
            to(t1x, t1y);
            var a0 = Math.atan2(t1y - cy, t1x - cx), a1 = Math.atan2(t2y - cy, t2x - cx);
            var dd = a1 - a0;
            while (dd > Math.PI) dd -= Math.PI * 2;
            while (dd < -Math.PI) dd += Math.PI * 2;
            arcPts(cx, cy, r, a0, a0 + dd, dd < 0);
        },
        rect: function (x, y, w, h) { start(x, y); to(x + w, y); to(x + w, y + h); to(x, y + h); to(x, y); cur.closed = true; },
        ellipse: function (x, y, w, h) {
            var cx = x + w / 2, cy = y + h / 2, n = 64;
            start(cx + w / 2, cy);
            for (var i = 1; i <= n; i++) { var a = i / n * Math.PI * 2; to(cx + Math.cos(a) * w / 2, cy + Math.sin(a) * h / 2); }
            cur.closed = true;
        },
        // drawing calls a path function might make: nothing to write down
        save: function () {}, restore: function () {}, translate: function () {}, rotate: function () {}, scale: function () {}
    };
}

function trace(pathFn) {
    var rec = recorder();
    try { pathFn(rec); } catch (e) { return { pts: [], len: 0, cw: true }; }
    var best = null;
    for (var i = 0; i < rec.paths.length; i++) if (!best || rec.paths[i].length > best.length) best = rec.paths[i];
    var pts = best || [];
    // a closed outline ends where it starts: drop the copy
    if (pts.length > 2) {
        var a = pts[0], b = pts[pts.length - 1];
        if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) pts = pts.slice(0, pts.length - 1);
    }
    var len = 0, area = 0;
    for (var j = 0; j < pts.length; j++) {
        var p = pts[j], q = pts[(j + 1) % pts.length];
        len += Math.sqrt((q[0] - p[0]) * (q[0] - p[0]) + (q[1] - p[1]) * (q[1] - p[1]));
        area += p[0] * q[1] - q[0] * p[1];
    }
    return { pts: pts, len: len, cw: area >= 0 };
}

function walk(tr, step, fn) {
    var pts = tr.pts, m = pts.length;
    if (m < 3 || !(tr.len > 0)) return 0;
    var n = Math.max(3, Math.round(tr.len / Math.max(0.5, step)));
    var each = tr.len / n;
    var seg = 0, segStart = 0;
    function segLen(i) { var p = pts[i], q = pts[(i + 1) % m]; return Math.sqrt((q[0] - p[0]) * (q[0] - p[0]) + (q[1] - p[1]) * (q[1] - p[1])); }
    var sl = segLen(0);
    for (var k = 0; k < n; k++) {
        var want = k * each;
        while (segStart + sl < want && seg < m - 1) { segStart += sl; seg++; sl = segLen(seg); }
        var p = pts[seg], q = pts[(seg + 1) % m];
        var t = sl > 0 ? (want - segStart) / sl : 0;
        var tx = sl > 0 ? (q[0] - p[0]) / sl : 1, ty = sl > 0 ? (q[1] - p[1]) / sl : 0;
        var nx = tr.cw ? -ty : ty, ny = tr.cw ? tx : -tx;
        fn(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, tx, ty, nx, ny, k, n);
    }
    return n;
}
