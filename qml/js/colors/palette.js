.pragma library
.import "../Draw.js" as Draw

var color = {
    key: "palette",
    label: "Palette",
    about: "Your theme's own colors, one after the other across the visual.",
    at(t, v, c) { return Draw.along(c.palette, t) || c.fg; }
};
