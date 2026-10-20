.pragma library

var color = {
    key: "theme",
    label: "Theme",
    about: "The bar's own text color.",
    at(t, v, c) { return c.fg; }
};
