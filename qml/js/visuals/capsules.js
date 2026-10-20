.pragma library

// Capsules: thin rounded pills growing out from the middle.
var visual = {
    key: "capsules",
    label: "Capsules",
    about: "Thin rounded pills growing out from the middle.",
    draw(g) {
        const { ctx, w, h } = g;
        const b = g.bands();
        const bw = Math.max(1.5, Math.min(b.bw, 5));
        const step = b.n > 1 ? (w - bw) / (b.n - 1) : 0;
        ctx.lineWidth = bw;
        ctx.lineCap = "round";
        for (let i = 0; i < b.n; i++) {
            const v = g.clamp(g.at(i, b.n), 0, 1);
            const len = Math.max(0, Math.max(bw, v * h) - bw);
            const x = bw / 2 + i * step;
            ctx.strokeStyle = g.color(i / (b.n - 1), v);
            ctx.beginPath();
            ctx.moveTo(x, h / 2 - len / 2);
            ctx.lineTo(x, h / 2 + len / 2);
            ctx.stroke();
        }
    }
};
