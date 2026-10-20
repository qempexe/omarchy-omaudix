.pragma library

// Helix: two twisting strands joined by rungs.
var visual = {
    key: "helix",
    label: "Helix",
    about: "Two twisting strands joined by rungs.",
    draw(g) {
        const { ctx, w, h } = g;
        const n = Math.max(12, Math.min(96, Math.floor(w / 1.5)));
        const mid = h / 2, xs = [], a = [], b = [];
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const amp = (0.2 + 0.8 * g.clamp(g.at(i, n), 0, 1)) * (mid - 1.5);
            const s = Math.sin(t * 2 * Math.PI * 1.6 + g.st.phase) * amp;
            xs.push(t * w);
            a.push(mid + s);
            b.push(mid - s);
        }
        ctx.strokeStyle = g.gradient();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        for (let i = 2; i < n - 1; i += 4) {
            ctx.moveTo(xs[i], a[i]);
            ctx.lineTo(xs[i], b[i]);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        g.smooth(xs, a);
        ctx.stroke();
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        g.smooth(xs, b);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
};
