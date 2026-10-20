.pragma library

// The main colors of a cover, from its pixels: [r, g, b, a, r, g, b, a, ...] as a
// canvas gives them. Colors are put in buckets, near-greys and near-blacks count for
// less, and up to `max` colors come back that differ enough from each other, the most
// present first, as [[r, g, b], ...].

function colorsOf(data, max) {
    const want = max || 3;
    const n = data ? data.length : 0;
    if (n < 4) return [];
    const buckets = {};
    for (let i = 0; i + 3 < n; i += 4) {
        if (data[i + 3] < 128) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
        const sat = hi === 0 ? 0 : (hi - lo) / hi;
        // dull pixels still count, but bright, colorful ones say more about a cover
        const weight = 0.15 + sat * (0.4 + hi / 255);
        const key = (r >> 5) + "," + (g >> 5) + "," + (b >> 5);
        const bk = buckets[key] || (buckets[key] = { w: 0, r: 0, g: 0, b: 0 });
        bk.w += weight; bk.r += r * weight; bk.g += g * weight; bk.b += b * weight;
    }
    const list = Object.keys(buckets).map((k) => {
        const bk = buckets[k];
        return { w: bk.w, c: [bk.r / bk.w, bk.g / bk.w, bk.b / bk.w] };
    }).sort((a, b) => b.w - a.w);
    const out = [];
    for (const item of list) {
        const far = out.every((c) => Math.abs(c[0] - item.c[0]) + Math.abs(c[1] - item.c[1]) + Math.abs(c[2] - item.c[2]) > 90);
        if (far) out.push(item.c.map((x) => Math.round(x)));
        if (out.length >= want) break;
    }
    // too dark to see on a bar: lift it a little
    return out.map((c) => {
        const l = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
        if (l >= 0.28) return c;
        const k = (0.28 - l) / (1 - l);
        return c.map((x) => Math.round(x + (255 - x) * k));
    });
}
