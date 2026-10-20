.pragma library

// Stellar: little stars, one per band, that swell and sparkle with the music.
var visual = {
    key: "stellar",
    label: "Stellar",
    about: "Little stars, one per band, that swell and sparkle with the music.",
    draw(g) {
        const { ctx, w, h } = g;
        const n = Math.max(8, Math.min(18, Math.floor(w / 5)));
        ctx.lineCap = "round";
        for (let i = 0; i < n; i++) {
            const v = g.clamp(g.at(i, n), 0, 1);
            const x = (i + 0.2 + 0.6 * g.frac(Math.sin(i * 12.9898) * 43758.5453)) * w / n;
            const y = 2.5 + g.frac(Math.sin(i * 78.233) * 12345.6789) * (h - 5);
            const r = 0.7 + v * 2.0;
            const t = i / (n - 1);
            ctx.fillStyle = g.color(t, v, 0.25 + 0.75 * v);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fill();
            if (v > 0.65) {
                const len = r * 2.6;
                ctx.strokeStyle = g.color(t, v, 0.85);
                ctx.lineWidth = 0.9;
                ctx.beginPath();
                ctx.moveTo(x - len, y);
                ctx.lineTo(x + len, y);
                ctx.moveTo(x, Math.max(0.5, y - len));
                ctx.lineTo(x, Math.min(h - 0.5, y + len));
                ctx.stroke();
            }
        }
    }
};
