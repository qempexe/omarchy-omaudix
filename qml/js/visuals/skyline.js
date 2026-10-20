.pragma library

// Skyline: a row of buildings, one per band, as tall as the band is loud, with
// their windows lighting up from the street.
var visual = {
    key: "skyline",
    label: "Skyline",
    about: "A city at night: one building per band, its windows lit as loud as the band.",
    draw(g) {
        const { ctx, w, h } = g;
        const n = Math.max(5, Math.min(18, Math.floor(w / 6)));
        // buildings of different widths that never change, so the city stays the same
        let total = 0;
        const widths = [];
        for (let i = 0; i < n; i++) { const k = 0.7 + g.hash(i, 7) * 0.8; widths.push(k); total += k; }
        let x = 0;
        for (let i = 0; i < n; i++) {
            const bw = widths[i] / total * w;
            const t = n > 1 ? i / (n - 1) : 0.5;
            const v = g.clamp(g.at(i, n), 0, 1);
            const floor = 0.25 + 0.7 * g.hash(i, 3);           // its height when silent
            const bh = Math.max(3, h * (0.3 + 0.7 * Math.max(v, floor * 0.45)));
            const left = x + 0.5, width = Math.max(1, bw - 1);
            ctx.fillStyle = g.color(t, -1, 0.3);
            ctx.fillRect(left, h - bh, width, bh);
            // windows: columns of small squares, lit from the bottom up to the level
            const cols = Math.max(1, Math.floor(width / 3));
            const rows = Math.max(1, Math.floor((bh - 2) / 3));
            const lit = Math.round(v * rows);
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const on = r < lit && g.hash(i * 31 + c, r) > 0.25;
                if (!on) continue;
                ctx.fillStyle = g.color(t, v, 0.55 + 0.45 * v);
                ctx.fillRect(left + 1 + c * 3, h - 2.5 - r * 3, 1.4, 1.4);
            }
            x += bw;
        }
        // the street
        ctx.fillStyle = g.gradient(0.5);
        ctx.fillRect(0, h - 0.8, w, 0.8);
    }
};
