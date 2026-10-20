.pragma library

// Area: a filled mountain with a bright ridge.
var visual = {
    key: "area",
    label: "Area",
    about: "A filled mountain with a bright ridge.",
    draw(g) {
        const { ctx, w, h } = g;
        const pts = 24, xs = [], ys = [];
        for (let i = 0; i < pts; i++) {
            xs.push(i * w / (pts - 1));
            ys.push(h - Math.max(1.5, g.clamp(g.at(i, pts), 0, 1) * (h - 1)));
        }
        ctx.fillStyle = g.gradient();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        g.smooth(xs, ys);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = g.gradient();
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        g.smooth(xs, ys);
        ctx.stroke();
    }
};
