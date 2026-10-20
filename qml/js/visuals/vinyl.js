.pragma library

// Vinyl: a record that turns while the music plays, faster when it gets loud,
// with the spectrum standing round its rim.
var visual = {
    key: "vinyl",
    label: "Vinyl",
    about: "A turning record, faster when the music gets loud, with the spectrum round its rim.",
    square: true,
    draw(g) {
        const { ctx, w, h, mem, st } = g;
        const size = Math.min(w, h), cx = w / 2, cy = h / 2;
        if (mem.last !== g.levels) {
            mem.last = g.levels;
            mem.angle = ((mem.angle || 0) + 0.12 + st.level * 0.35) % (2 * Math.PI);
        }
        const a = mem.angle || 0;
        const disc = size * 0.36;
        // the spectrum round the rim
        const spokes = 20, half = spokes / 2;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, size * 0.05);
        for (let i = 0; i < spokes; i++) {
            const idx = i < half ? i : spokes - 1 - i;
            const v = g.clamp(g.at(idx, half), 0, 1);
            const ang = i / spokes * 2 * Math.PI - Math.PI / 2;
            const r0 = disc + size * 0.03, r1 = r0 + Math.max(0.6, v * (size / 2 - r0 - 0.4));
            ctx.strokeStyle = g.color(idx / (half - 1), v, 0.45 + 0.55 * v);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
            ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
            ctx.stroke();
        }
        // the record and its grooves
        ctx.fillStyle = g.color(0.5, -1, 0.16);
        ctx.beginPath();
        ctx.arc(cx, cy, disc, 0, 2 * Math.PI);
        ctx.fill();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = g.color(0.5, -1, 0.35);
        for (const k of [0.82, 0.64]) {
            ctx.beginPath();
            ctx.arc(cx, cy, disc * k, 0, 2 * Math.PI);
            ctx.stroke();
        }
        // light catching the grooves, turning with the record
        ctx.lineWidth = Math.max(0.8, size * 0.04);
        ctx.strokeStyle = g.color(0.8, st.level, 0.8);
        ctx.beginPath();
        ctx.arc(cx, cy, disc * 0.72, a, a + 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, disc * 0.72, a + Math.PI, a + Math.PI + 0.9);
        ctx.stroke();
        // the label
        ctx.fillStyle = g.color(0.3, st.bass);
        ctx.beginPath();
        ctx.arc(cx, cy, disc * 0.36, 0, 2 * Math.PI);
        ctx.fill();
    }
};
