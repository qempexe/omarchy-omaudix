.pragma library

// Orb: a pulsing sphere: the core swells with loudness, the rings with the bass.
var visual = {
    key: "orb",
    label: "Orb",
    about: "A pulsing sphere: the core swells with loudness, the rings with the bass.",
    square: true,
    draw(g) {
        const { ctx, w, h, st } = g;
        const size = Math.min(w, h), cx = w / 2, cy = h / 2, lim = size / 2 - 0.5;
        const level = g.clamp(st.level, 0, 1), bass = g.clamp(st.bass, 0, 1);
        const r = Math.min(lim, size * 0.15 + level * size * 0.26);
        const rings = [[Math.min(lim, r + size * 0.07 + bass * size * 0.06), 0.4],
                       [Math.min(lim, r + size * 0.15 + bass * size * 0.1), 0.18]];
        ctx.lineWidth = 1;
        for (const [rr, alpha] of rings) {
            ctx.strokeStyle = g.color(0.7, bass, alpha);
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.fillStyle = g.color(0.3 + 0.6 * level, level, 0.95);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
    }
};
