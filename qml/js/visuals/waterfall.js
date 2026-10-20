.pragma library

// Waterfall: a spectrogram. Each frame becomes a new line at the top and the
// older ones slide down, so you see the last moments of the song as a picture.
var visual = {
    key: "waterfall",
    label: "Waterfall",
    about: "A spectrogram: every frame is a new line at the top, older ones slide down.",
    draw(g) {
        const { ctx, w, h, mem } = g;
        const cols = Math.max(4, Math.min(48, Math.floor(w / 3)));
        const rowsMax = Math.max(3, Math.floor(h / 2));
        // only a new frame adds a line; a repaint for any other reason draws the same picture
        if (mem.last !== g.levels || mem.cols !== cols) {
            if (mem.cols !== cols) mem.rows = [];
            mem.cols = cols;
            mem.last = g.levels;
            const line = [];
            for (let i = 0; i < cols; i++) line.push(g.clamp(g.at(i, cols), 0, 1));
            mem.rows = [line].concat(mem.rows || []).slice(0, rowsMax);
        }
        const cw = w / cols, rh = h / rowsMax;
        mem.rows.forEach((line, r) => {
            const age = 1 - r / rowsMax;
            for (let i = 0; i < cols; i++) {
                const v = line[i];
                if (v < 0.04) continue;
                ctx.fillStyle = g.color(i / (cols - 1), v, (0.15 + 0.85 * v) * age);
                ctx.fillRect(i * cw, r * rh, Math.max(1, cw - 0.5), Math.max(1, rh - 0.4));
            }
        });
    }
};
