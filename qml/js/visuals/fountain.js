.pragma library

// Fountain: every beat throws sparks up from the band that made it, and they fall
// back down. Loud bands throw them higher.
var visual = {
    key: "fountain",
    label: "Fountain",
    about: "Sparks thrown up by each band, higher the louder it is, falling back down.",
    draw(g) {
        const { ctx, w, h, mem } = g;
        if (!mem.parts) { mem.parts = []; mem.seed = 0; }
        if (mem.last !== g.levels) {
            mem.last = g.levels;
            const n = Math.max(6, Math.min(24, Math.floor(w / 5)));
            // move what is in the air
            for (const p of mem.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.32; p.life -= 1; }
            mem.parts = mem.parts.filter((p) => p.life > 0 && p.y < h + 2);
            // and throw new ones
            for (let i = 0; i < n; i++) {
                const v = g.clamp(g.at(i, n), 0, 1);
                mem.seed++;
                if (v < 0.25 || g.hash(mem.seed, i) > v * 0.9) continue;
                const t = n > 1 ? i / (n - 1) : 0.5;
                mem.parts.push({
                    x: (i + 0.5) * w / n, y: h - 1, t: t, v: v,
                    vx: (g.hash(mem.seed, 3) - 0.5) * 0.9,
                    vy: -(1.2 + v * Math.sqrt(h) * 0.9),
                    life: 26
                });
            }
            if (mem.parts.length > 160) mem.parts = mem.parts.slice(-160);
        }
        // a low glowing floor where they come from
        ctx.fillStyle = g.gradient(0.25);
        ctx.fillRect(0, h - 1.2, w, 1.2);
        for (const p of mem.parts) {
            const r = 0.6 + p.v * 1.3;
            ctx.fillStyle = g.color(p.t, p.v, Math.min(1, p.life / 14));
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
};
