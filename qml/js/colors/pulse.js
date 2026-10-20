.pragma library
.import "../Draw.js" as Draw

var color = {
    key: "pulse",
    label: "Pulse",
    about: "Your theme's accent, flaring brighter on every beat.",
    at(t, v, c) {
        const level = Math.max(0, Math.min(1, typeof c.level === "number" ? c.level : 0));
        const base = c.accent || c.fg;
        const lit = Draw.mix(base, [255, 255, 255], level * 0.45);
        return [lit[0], lit[1], lit[2], 0.45 + 0.55 * level];
    }
};
