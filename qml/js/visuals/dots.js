.pragma library

// Dots: one dot per band, riding up and down.
var visual = {
    key: "dots",
    label: "Dots",
    about: "One dot per band, riding up and down.",
    draw(g) {
        const { ctx, h } = g;
        const b = g.bands();
        const r = Math.max(1.2, Math.min(b.bw / 2, 3));
        for (let i = 0; i < b.n; i++) {
            const v = g.clamp(g.at(i, b.n), 0, 1);
            ctx.fillStyle = g.color(i / (b.n - 1), v);
            ctx.beginPath();
            ctx.arc(i * (b.bw + b.gap) + b.bw / 2, h - r - v * (h - 2 * r), r, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
};
