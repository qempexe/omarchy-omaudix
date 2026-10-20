.pragma library
.import "../Draw.js" as Draw

var color = {
    key: "gradient",
    label: "Gradient",
    about: "From your first custom color on the left to the second on the right.",
    uses: ["customColor", "customColor2"],
    at(t, v, c) {
        const a = c.custom || c.fg, b = c.custom2 || c.accent || c.fg;
        return Draw.mix(a, b, t);
    }
};
