.pragma library

// Mirror: bars that grow up and down from the middle.
var visual = {
    key: "mirror",
    label: "Mirror",
    about: "Bars that grow up and down from the middle.",
    draw(g) {
        const { ctx, h } = g;
        const b = g.bands();
        for (let i = 0; i < b.n; i++) {
            const v = g.clamp(g.at(i, b.n), 0, 1);
            const bh = Math.max(2, v * h);
            ctx.fillStyle = g.color(i / (b.n - 1), v);
            ctx.fillRect(i * (b.bw + b.gap), (h - bh) / 2, b.bw, bh);
        }
    }
};
