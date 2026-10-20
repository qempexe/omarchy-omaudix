import QtQuick
import "../js/Style.js" as Style
import "../js/Paint.js" as Paint

// The plate behind the widget: one shape with its ends, surface, edge and ornaments,
// drawn by js/Paint.js. It is a little bigger than the plate itself, so a shadow or a
// glow has room; the parent places it with `plateWidth` and `plateHeight`.
Canvas {
    id: root

    property var cfg: ({})
    property var pal: ({})              // { bg, fg, ac, border, borderAngle }
    property string edge: "top"         // the side of the screen the bar is on
    property real plateWidth: 100       // along the bar
    property real plateHeight: 20       // across it
    property real room: 999             // how far it may reach past the plate, across the bar

    readonly property bool vertical: Style.isVertical(edge)
    // a shadow or glow cut off by the bar's own edge looks like a box: keep it inside
    readonly property real margin: Math.max(1, Math.min(Style.marginFor(cfg), room))

    width: (vertical ? plateHeight : plateWidth) + 2 * margin
    height: (vertical ? plateWidth : plateHeight) + 2 * margin
    renderTarget: Canvas.Image

    readonly property string key: JSON.stringify([cfg, pal, edge, width, height])
    onKeyChanged: requestPaint()
    onVisibleChanged: if (visible) requestPaint()

    onPaint: {
        const ctx = getContext("2d")
        if (width < 4 || height < 4) { ctx.reset(); return }
        try { Paint.paint(ctx, Style.params(root.cfg, root.pal, width, height, root.margin, root.edge)) }
        catch (e) { ctx.reset(); console.warn("Omaudix: plate: " + e) }
    }
}
