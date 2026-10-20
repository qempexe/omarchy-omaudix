.pragma library

// Meter: a level meter with a falling peak marker.
var visual = {
    key: "meter",
    label: "Meter",
    about: "A level meter with a falling peak marker.",
    draw(g) {
        const { ctx, w, h, st } = g;
        const th = Math.max(3, h * 0.34), cy = h / 2, x0 = th / 2;
        const span = Math.max(1, w - th);
        ctx.lineCap = "round";
        ctx.lineWidth = th;
        ctx.strokeStyle = g.color(0.5, -1, 0.14);
        ctx.beginPath();
        ctx.moveTo(x0, cy);
        ctx.lineTo(x0 + span, cy);
        ctx.stroke();
        ctx.strokeStyle = g.gradient();
        ctx.beginPath();
        ctx.moveTo(x0, cy);
        ctx.lineTo(x0 + g.clamp(st.level, 0, 1) * span, cy);
        ctx.stroke();
        ctx.fillStyle = g.color(1, st.peakLevel, 0.9);
        ctx.fillRect(x0 + g.clamp(st.peakLevel, 0, 1) * span - 1, cy - th / 2 - 1.5, 2, th + 3);
    }
};
