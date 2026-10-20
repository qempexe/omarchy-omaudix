.pragma library

// Lightning: a jagged bolt through the middle.
var visual = {
    key: "lightning",
    label: "Lightning",
    about: "A jagged bolt through the middle.",
    draw(g) {
        const { w, h } = g;
        const n = 16, mid = h / 2, xs = [0], ys = [mid];
        for (let i = 0; i < n; i++) {
            const v = Math.max(0.08, g.clamp(g.at(i, n), 0, 1));
            xs.push((i + 0.5) * w / n);
            ys.push(mid + (i % 2 === 0 ? -1 : 1) * v * (mid - 2.5));
        }
        xs.push(w);
        ys.push(mid);
        g.glowLine(xs, ys, false, 1.3);
    }
};
