.pragma library

// Scope: a real oscilloscope: the sound wave itself.
var visual = {
    key: "scope",
    label: "Scope",
    about: "A real oscilloscope: the sound wave itself.",
    scope: true,
    draw(g) {
        const { ctx, w, h } = g;
        const cnt = 48, cy = h / 2, xs = [], ys = [];
        for (let i = 0; i < cnt; i++) {
            xs.push(i * w / (cnt - 1));
            ys.push(cy - g.clamp(g.at(i, cnt), -1, 1) * (cy - 1));
        }
        ctx.strokeStyle = g.gradient();
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        g.smooth(xs, ys);
        ctx.stroke();
    }
};
