.pragma library

// Bars: one bar per band, growing up from the bottom.
var visual = {
    key: "bars",
    label: "Bars",
    about: "One bar per band, growing up from the bottom.",
    draw(g) {
        const { ctx, h } = g;
        const b = g.bands();
        for (let i = 0; i < b.n; i++) {
            const v = g.clamp(g.at(i, b.n), 0, 1);
            const bh = Math.max(2, v * h);
            ctx.fillStyle = g.color(i / (b.n - 1), v);
            ctx.fillRect(i * (b.bw + b.gap), h - bh, b.bw, bh);
        }
    }
};
