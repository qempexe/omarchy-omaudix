.pragma library

// Steps: a blocky staircase silhouette.
var visual = {
    key: "steps",
    label: "Steps",
    about: "A blocky staircase silhouette.",
    draw(g) {
        const { ctx, w, h } = g;
        const n = 16, sw = w / n, top = [];
        ctx.fillStyle = g.gradient();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < n; i++) {
            const y = h - Math.max(1.5, g.clamp(g.at(i, n), 0, 1) * (h - 1));
            top.push(y);
            ctx.lineTo(i * sw, y);
            ctx.lineTo((i + 1) * sw, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = g.gradient();
        ctx.lineWidth = 1.4;
        ctx.lineJoin = "miter";
        ctx.lineCap = "butt";
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            if (i === 0) ctx.moveTo(0, top[0]); else ctx.lineTo(i * sw, top[i]);
            ctx.lineTo((i + 1) * sw, top[i]);
        }
        ctx.stroke();
    }
};
