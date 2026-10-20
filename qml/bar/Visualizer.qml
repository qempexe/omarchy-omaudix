import QtQuick
import "../js/Draw.js" as Draw
import "../js/Visuals.js" as Visuals
import "../js/Colors.js" as Colors

// Draws one visualizer from an array of levels.
//   spectrum styles: levels are 0..1
//   scope style:     levels are -1..1
//
// The styles live in js/visuals/ and the color modes in js/colors/; this item only
// keeps the motion between frames and hands each frame to the chosen style.
Item {
    id: root

    property var levels: []
    property string vizStyle: "bars"
    property string colorMode: "theme"
    property string customColor: "#7aa2f7"
    property color foreground: "white"
    property int count: 20              // bands drawn by bar-like styles
    property bool flip: false           // mirror horizontally (right-hand copy)

    // loudness, bass, where the energy sits... advanced once per audio frame, so
    // nothing moves while the music is paused
    property var st: Draw.freshState()
    // what the current style keeps between frames
    property var mem: ({})

    implicitWidth: 72
    implicitHeight: 18

    function rgbOf(c) { return [c.r * 255, c.g * 255, c.b * 255] }

    readonly property var colorCtx: ({
        fg: rgbOf(root.foreground),
        custom: Draw.hex(root.customColor)
    })

    onLevelsChanged: { Draw.advance(root.st, root.levels); canvas.requestPaint() }
    onVizStyleChanged: { root.mem = ({}); canvas.requestPaint() }
    onColorModeChanged: canvas.requestPaint()
    onColorCtxChanged: canvas.requestPaint()
    onCountChanged: canvas.requestPaint()
    onFlipChanged: canvas.requestPaint()
    onWidthChanged: canvas.requestPaint()
    onHeightChanged: canvas.requestPaint()
    Component.onCompleted: { Draw.advance(root.st, root.levels); canvas.requestPaint() }

    Canvas {
        id: canvas
        anchors.fill: parent
        renderTarget: Canvas.Image

        onPaint: {
            const ctx = getContext("2d")
            ctx.reset()
            const w = width, h = height
            if (w < 2 || h < 2) return
            if (root.flip) {
                ctx.translate(w, 0)
                ctx.scale(-1, 1)
            }
            const style = Visuals.byKey[root.vizStyle] || Visuals.byKey.bars
            const mode = root.colorMode
            const g = Draw.make({
                ctx: ctx, w: w, h: h, levels: root.levels, st: root.st, mem: root.mem,
                count: root.count, colorCtx: root.colorCtx,
                colorAt: (t, v, c) => Colors.at(mode, t, v, c)
            })
            try { style.draw(g) } catch (e) { console.warn("Omaudix: " + style.key + ": " + e) }
        }
    }
}
