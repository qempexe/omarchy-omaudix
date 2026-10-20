.pragma library
.import "../Draw.js" as Draw

var color = {
    key: "heat",
    label: "Heat",
    about: "Cool blue when quiet, through yellow, to red when loud.",
    at(t, v, c) {
        const x = v >= 0 ? v : (typeof c.level === "number" ? c.level : 0.5);
        return Draw.hsl(0.62 * (1 - Math.max(0, Math.min(1, x))), 0.85, 0.58);
    }
};
