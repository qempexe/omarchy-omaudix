.pragma library

// Neon: a glowing spectrum line.
var visual = {
    key: "neon",
    label: "Neon",
    about: "A glowing spectrum line.",
    draw(g) {
        const { w, h } = g;
        const n = 28, xs = [], ys = [];
        for (let i = 0; i < n; i++) {
            xs.push(i * w / (n - 1));
            ys.push(h - 2.5 - g.clamp(g.at(i, n), 0, 1) * (h - 5));
        }
        g.glowLine(xs, ys, true, 1.3);
    }
};
