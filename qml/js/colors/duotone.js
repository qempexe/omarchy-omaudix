.pragma library

var color = {
    key: "duotone",
    label: "Duotone",
    about: "Two colors: quiet parts in your text color, loud parts in the theme's accent.",
    at(t, v, c) {
        const loud = v >= 0 ? v > 0.5 : t > 0.5;
        return loud ? (c.accent || c.fg) : c.fg;
    }
};
