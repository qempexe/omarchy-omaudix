.pragma library

// Ring: spokes round a circle, one per band.
var visual = {
    key: "ring",
    label: "Ring",
    about: "Spokes round a circle, one per band.",
    square: true,
    draw(g) {
        const { ctx, w, h } = g;
        const size = Math.min(w, h), cx = w / 2, cy = h / 2;
        const r0 = size * 0.26, maxLen = size / 2 - r0 - 0.5;
        const spokes = 24, half = spokes / 2;
        ctx.lineWidth = Math.max(1.2, size * 0.07);
        ctx.lineCap = "round";
        for (let i = 0; i < spokes; i++) {
            const idx = i < half ? i : spokes - 1 - i;
            const v = g.clamp(g.at(idx, half), 0, 1);
            const len = Math.max(1, v * maxLen);
            const ang = i / spokes * 2 * Math.PI - Math.PI / 2;
            ctx.strokeStyle = g.color(idx / (half - 1), v);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
            ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len));
            ctx.stroke();
        }
    }
};
