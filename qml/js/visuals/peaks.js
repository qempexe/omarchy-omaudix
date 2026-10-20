.pragma library

// Peaks: bars with a little cap that hangs at the top and falls slowly.
var visual = {
    key: "peaks",
    label: "Peaks",
    about: "Bars with a little cap that hangs at the top and falls slowly.",
    draw(g) {
        const { ctx, h } = g;
        const b = g.bands();
        const capH = Math.max(1.5, h * 0.1);
        for (let i = 0; i < b.n; i++) {
            const x = i * (b.bw + b.gap), t = i / (b.n - 1);
            const v = g.clamp(g.at(i, b.n), 0, 1);
            const bh = Math.max(1.5, v * (h - capH - 1));
            ctx.fillStyle = g.color(t, v, 0.8);
            ctx.fillRect(x, h - bh, b.bw, bh);
            const p = g.clamp(g.peak(i, b.n), 0, 1);
            ctx.fillStyle = g.color(t, p);
            ctx.fillRect(x, h - Math.max(bh + 1, p * (h - capH - 1)) - capH, b.bw, capH);
        }
    }
};
