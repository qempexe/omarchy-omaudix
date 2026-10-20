.pragma library

// LED: a segmented meter, lit from the bottom.
var visual = {
    key: "led",
    label: "LED",
    about: "A segmented meter, lit from the bottom.",
    draw(g) {
        const { ctx, h } = g;
        const b = g.bands();
        const segs = Math.max(3, Math.floor(h / 3.5)), segH = h / segs;
        for (let i = 0; i < b.n; i++) {
            const v = g.clamp(g.at(i, b.n), 0, 1);
            const lit = Math.round(v * segs);
            ctx.fillStyle = g.color(i / (b.n - 1), v);
            for (let s = 0; s < segs; s++) {
                ctx.globalAlpha = s < lit ? 1.0 : 0.14;
                ctx.fillRect(i * (b.bw + b.gap), h - (s + 1) * segH + 1, b.bw, Math.max(1, segH - 1));
            }
        }
        ctx.globalAlpha = 1.0;
    }
};
