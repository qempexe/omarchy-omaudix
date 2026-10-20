.pragma library

// Comet: a bright head that sits where the energy is, dragging a tail.
var visual = {
    key: "comet",
    label: "Comet",
    about: "A bright head that sits where the energy is, dragging a tail.",
    draw(g) {
        const { ctx, w, h, st } = g;
        const cy = h / 2;
        const r = 1.5 + st.level * 2.6;
        const hx = r + g.clamp(st.centre, 0, 1) * Math.max(0, w - 2 * r);
        const tx = Math.max(0, hx - w * 0.5);
        ctx.lineCap = "round";
        ctx.lineWidth = 1;
        ctx.strokeStyle = g.color(0.5, -1, 0.22);
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
        if (hx - tx > 1) {
            const tail = ctx.createLinearGradient(tx, 0, hx, 0);
            tail.addColorStop(0, g.color(0.2, -1, 0));
            tail.addColorStop(1, g.color(0.8, st.level, 0.9));
            ctx.strokeStyle = tail;
            ctx.lineWidth = Math.max(1.2, r * 0.9);
            ctx.beginPath();
            ctx.moveTo(tx, cy);
            ctx.lineTo(hx, cy);
            ctx.stroke();
        }
        ctx.fillStyle = g.color(1, st.level);
        for (const [rr, alpha] of [[r * 2.3, 0.18], [r * 1.6, 0.32], [r, 1.0]]) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(hx, cy, Math.min(rr, h / 2), 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
};
