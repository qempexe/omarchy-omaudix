.pragma library

// Ripple: a travelling sine as tall as the spectrum, with a faint reflection.
var visual = {
    key: "ripple",
    label: "Ripple",
    about: "A travelling sine as tall as the spectrum, with a faint reflection.",
    draw(g) {
        const { ctx, w, h } = g;
        const n = Math.max(8, Math.min(80, Math.floor(w / 1.2)));
        const mid = h / 2, xs = [], up = [], down = [];
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const amp = (0.12 + 0.88 * g.clamp(g.at(i, n), 0, 1)) * (mid - 1.5);
            const s = Math.sin(t * 2 * Math.PI * 2.4 - g.st.phase) * amp;
            xs.push(t * w);
            up.push(mid + s);
            down.push(mid - s);
        }
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = g.gradient();
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        g.smooth(xs, down);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        g.smooth(xs, up);
        ctx.stroke();
    }
};
