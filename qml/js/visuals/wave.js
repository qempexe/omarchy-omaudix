.pragma library

// Wave: a smooth blob, as thick as the music is loud.
var visual = {
    key: "wave",
    label: "Wave",
    about: "A smooth blob, as thick as the music is loud.",
    draw(g) {
        const { ctx, w, h } = g;
        const pts = 24, mid = h / 2, xs = [], ys = [];
        for (let i = 0; i < pts; i++) {
            xs.push(i * w / (pts - 1));
            ys.push(mid - Math.max(1, g.clamp(g.at(i, pts), 0, 1) * (mid - 1)));
        }
        for (let i = pts - 1; i >= 0; i--) {
            xs.push(i * w / (pts - 1));
            ys.push(2 * mid - ys[i]);
        }
        ctx.fillStyle = g.gradient();
        ctx.beginPath();
        g.smooth(xs, ys);
        ctx.closePath();
        ctx.fill();
    }
};
