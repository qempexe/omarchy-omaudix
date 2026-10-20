.pragma library

// Heartbeat: an ECG trace, one beat per band, as tall as that band is loud.
var visual = {
    key: "heartbeat",
    label: "Heartbeat",
    about: "An ECG trace, one beat per band, as tall as that band is loud.",
    draw(g) {
        const { w, h } = g;
        const beats = Math.round(g.clamp(w / 14, 4, 14));
        const shape = [[0, 0], [0.18, 0], [0.26, -0.18], [0.34, 0], [0.42, 0], [0.47, 0.22],
                       [0.54, -1], [0.62, 0.55], [0.68, 0], [0.78, 0], [0.86, -0.25], [0.94, 0], [1, 0]];
        const mid = h / 2, amp = mid - 1.5, sw = w / beats, xs = [], ys = [];
        for (let b = 0; b < beats; b++) {
            const v = Math.max(0.08, g.clamp(g.at(b, beats), 0, 1));
            shape.forEach(([sx, sy], k) => {
                if (b > 0 && k === 0) return;
                xs.push(b * sw + sx * sw);
                ys.push(mid + sy * amp * v);
            });
        }
        g.glowLine(xs, ys, false, 1.3);
    }
};
