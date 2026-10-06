import QtQuick
import qs.Commons
import qs.Ui

Row {
    id: root

    property var bar: null
    property var service: null

    spacing: Style.space(3)

    readonly property bool playing: service ? service.playing : false
    readonly property var player: service ? service.player : null

    // Tooltips are shown/hidden here so a click always dismisses them.
    function tip(item, on, text) {
        if (!bar) return
        if (on) bar.showTooltip(item, text)
        else bar.hideTooltip(item)
    }

    function can(action) {
        if (!player) return false
        if (action === "previous") return !!player.canGoPrevious
        if (action === "next") return !!player.canGoNext
        return !!(player.canTogglePlaying || player.canPlay || player.canPause)
    }

    Button {
        id: prevBtn
        enabled: root.can("previous")
        opacity: enabled ? 1 : 0.35
        iconText: "\uDB81\uDCAE"
        foreground: root.bar ? root.bar.barForeground : Color.foreground
        fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
        iconSize: Style.font.body
        horizontalPadding: Style.space(3)
        verticalPadding: Style.space(2)
        HoverHandler { onHoveredChanged: root.tip(prevBtn, hovered, "Previous") }
        onClicked: {
            root.tip(prevBtn, false, "")
            if (root.service) root.service.runAction("previous")
        }
    }

    Button {
        id: playBtn
        enabled: root.can("playPause")
        opacity: enabled ? 1 : 0.35
        iconText: root.playing ? "\uDB80\uDFE4" : "\uDB81\uDC0A"
        foreground: root.bar ? root.bar.barForeground : Color.foreground
        fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
        iconSize: Style.font.body
        horizontalPadding: Style.space(4)
        verticalPadding: Style.space(2)
        HoverHandler { onHoveredChanged: root.tip(playBtn, hovered, root.playing ? "Pause" : "Play") }
        onClicked: {
            root.tip(playBtn, false, "")
            if (root.service) root.service.runAction("playPause")
        }
    }

    Button {
        id: nextBtn
        enabled: root.can("next")
        opacity: enabled ? 1 : 0.35
        iconText: "\uDB81\uDCAD"
        foreground: root.bar ? root.bar.barForeground : Color.foreground
        fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
        iconSize: Style.font.body
        horizontalPadding: Style.space(3)
        verticalPadding: Style.space(2)
        HoverHandler { onHoveredChanged: root.tip(nextBtn, hovered, "Next") }
        onClicked: {
            root.tip(nextBtn, false, "")
            if (root.service) root.service.runAction("next")
        }
    }
}
