.pragma library
.import "visuals/bars.js" as Bars
.import "visuals/mirror.js" as Mirror
.import "visuals/wave.js" as Wave
.import "visuals/scope.js" as Scope
.import "visuals/dots.js" as Dots
.import "visuals/led.js" as Led
.import "visuals/ring.js" as Ring
.import "visuals/area.js" as Area
.import "visuals/peaks.js" as Peaks
.import "visuals/capsules.js" as Capsules
.import "visuals/steps.js" as Steps
.import "visuals/neon.js" as Neon
.import "visuals/lightning.js" as Lightning
.import "visuals/heartbeat.js" as Heartbeat
.import "visuals/ripple.js" as Ripple
.import "visuals/helix.js" as Helix
.import "visuals/comet.js" as Comet
.import "visuals/stellar.js" as Stellar
.import "visuals/meter.js" as Meter
.import "visuals/orb.js" as Orb
.import "visuals/waterfall.js" as Waterfall
.import "visuals/fountain.js" as Fountain
.import "visuals/vinyl.js" as Vinyl
.import "visuals/skyline.js" as Skyline

// Every visualizer style, in the order the settings show them. Each one lives in its
// own file under visuals/ (see CONTRIBUTING.md): adding a style is one new file and
// one line here.

var list = [
    Bars.visual,
    Mirror.visual,
    Wave.visual,
    Scope.visual,
    Dots.visual,
    Led.visual,
    Ring.visual,
    Area.visual,
    Peaks.visual,
    Capsules.visual,
    Steps.visual,
    Neon.visual,
    Lightning.visual,
    Heartbeat.visual,
    Ripple.visual,
    Helix.visual,
    Comet.visual,
    Stellar.visual,
    Meter.visual,
    Orb.visual,
    Waterfall.visual,
    Fountain.visual,
    Vinyl.visual,
    Skyline.visual
];

var byKey = {};
var keys = [];
var labels = {};
var abouts = {};
for (var i = 0; i < list.length; i++) {
    byKey[list[i].key] = list[i];
    keys.push(list[i].key);
    labels[list[i].key] = list[i].label;
    abouts[list[i].key] = list[i].about;
}

// styles that stay square whatever width is set
function isSquare(key) { return !!(byKey[key] && byKey[key].square); }
// styles that draw the sound wave itself and need the scope capture
function isScope(key) { return !!(byKey[key] && byKey[key].scope); }
