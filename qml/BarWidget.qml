import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "bar"
import "panel"
import "js/Visuals.js" as Visuals
import "js/Schema.js" as Schema

BarWidget {
    id: root

    moduleName: "io.github.qempexe.omaudix"

    readonly property var service: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
    readonly property bool hasMedia: service ? service.hasMedia : false
    readonly property bool playing: service ? service.playing : false

    // ---- settings ---------------------------------------------------------------
    // Every setting, checked: the defaults, then this widget's entry in shell.json,
    // then what was changed in the settings panel (saved by the service).
    readonly property var cfg: Schema.resolve(root.settings, service ? service.local : null)

    // Album art URL, empty when nothing is playing.
    readonly property string albumArt: service ? service.albumArt : ""

    // ---- derived state -----------------------------------------------------
    readonly property string effStyle: service && service.styleOverride !== "" ? service.styleOverride : cfg.vizStyle
    // Always on the bar by default (idle placeholder when nothing plays);
    // "Hide when paused" is the opt-out.
    readonly property bool shouldShow: cfg.hideWhenPaused ? (hasMedia && playing) : true
    readonly property bool vizLeft: cfg.vizSide === "left" || cfg.vizSide === "both"
    readonly property bool vizRight: cfg.vizSide === "right" || cfg.vizSide === "both"
    readonly property real vizHeight: Style.space(18)
    readonly property real vizItemWidth: Visuals.isSquare(effStyle) ? vizHeight + Style.space(2) : cfg.vizWidth
    readonly property color fg: bar ? bar.barForeground : Color.foreground
    readonly property string fontName: bar ? bar.fontFamily : Style.font.family

    readonly property string label: {
        if (!service || !service.hasMedia) return "Nothing playing"
        const t = service.title, a = service.artist, sep = cfg.separator
        if (cfg.textFormat === "title") return t !== "" ? t : a
        if (cfg.textFormat === "artist") return a !== "" ? a : t
        if (t === "" || a === "") return t !== "" ? t : a
        return cfg.textFormat === "title-artist" ? t + sep + a : a + sep + t
    }

    visible: shouldShow
    implicitWidth: shouldShow
        ? (vertical ? barSize : horizontalContent.implicitWidth + Style.space(10)) : 0
    implicitHeight: shouldShow
        ? (vertical ? verticalContent.implicitHeight + Style.space(10) : barSize) : 0

    // ---- talk to the shared service ------------------------------------------
    readonly property bool wantsViz: shouldShow && cfg.vizSide !== "hidden"
    property var registeredWith: null

    readonly property string configKey: [effStyle, cfg.barCount, cfg.fps, cfg.sensitivity, cfg.smoothing, cfg.engine].join("|")

    function pushConfig() {
        if (!service || registeredWith !== service) return
        service.configure({
            style: effStyle, bars: cfg.barCount, fps: cfg.fps,
            gain: cfg.sensitivity, smooth: cfg.smoothing, engine: cfg.engine
        })
    }

    function syncRegistration() {
        const want = wantsViz ? service : null
        if (registeredWith === want) return
        if (registeredWith) {
            try { registeredWith.unregister() } catch (e) { }
        }
        registeredWith = want
        if (want) {
            want.register()
            pushConfig()
        }
    }

    // Tell the shared service which player to follow.
    function pushPlayer() {
        if (!service) return
        service.preferred = cfg.player
        service.pauseOthers = cfg.pauseOthers
    }

    // Wheel over the widget: step through the styles and keep the choice.
    function stepStyle(step) {
        const list = Visuals.keys
        let i = list.indexOf(effStyle)
        if (i < 0) i = 0
        const next = list[(i + (step < 0 ? list.length - 1 : 1)) % list.length]
        if (service) service.setSetting("vizStyle", next)
    }

    readonly property string playerKey: cfg.player + "|" + cfg.pauseOthers
    onWantsVizChanged: syncRegistration()
    onServiceChanged: { syncRegistration(); pushPlayer() }
    onPlayerKeyChanged: pushPlayer()
    onConfigKeyChanged: Qt.callLater(pushConfig)
    Component.onCompleted: { syncRegistration(); pushPlayer() }
    Component.onDestruction: {
        if (registeredWith) {
            try { registeredWith.unregister() } catch (e) { }
        }
    }

    // Tooltips for the small buttons are driven here so they can be dismissed on
    // click (the built-in ones could stay stuck on screen after a press).
    function tip(item, on, text) {
        if (!bar) return
        if (on) bar.showTooltip(item, text)
        else bar.hideTooltip(item)
    }

    function tooltipLine() {
        if (!service || !service.hasMedia) return "Omaudix: nothing playing"
        return service.artist !== "" && service.title !== ""
            ? service.title + " — " + service.artist : label
    }

    // ---- horizontal layout --------------------------------------------------
    Row {
        id: horizontalContent
        visible: !root.vertical
        anchors.centerIn: parent
        spacing: root.cfg.compactText ? Style.space(1) : Style.space(6)

        Controls {
            visible: root.cfg.showControls && root.cfg.controlsSide === "left"
            bar: root.bar
            service: root.service
            anchors.verticalCenter: parent.verticalCenter
        }

        Item {
            id: mediaArea
            width: mediaRow.implicitWidth
            height: Math.max(Style.space(24), mediaRow.implicitHeight)
            anchors.verticalCenter: parent.verticalCenter

            Row {
                id: mediaRow
                anchors.centerIn: parent
                spacing: Style.space(6)

        Cover {
                    width: root.cfg.coverSize
                    height: root.cfg.coverSize
                    source: root.albumArt
                    ink: root.fg
                    visible: root.cfg.coverSide === "left"
                    anchors.verticalCenter: parent.verticalCenter
                }

                Visualizer {
                    width: root.vizItemWidth
                    height: root.vizHeight
                    levels: root.service ? root.service.levels : []
                    vizStyle: root.effStyle
                    colorMode: root.cfg.colorMode
                    customColor: root.cfg.customColor
                    foreground: root.fg
                    count: root.cfg.barCount
                    visible: root.vizLeft
                    anchors.verticalCenter: parent.verticalCenter
                }

        Cover {
                    width: root.cfg.coverSize
                    height: root.cfg.coverSize
                    source: root.albumArt
                    ink: root.fg
                    visible: root.cfg.coverSide === "center"
                    anchors.verticalCenter: parent.verticalCenter
                }

                MarqueeText {
                    id: marquee
                    visible: root.cfg.showText
                    // compact: only as wide as the title, up to textWidth;
                    // longer titles fill textWidth and scroll as before
                    width: !root.cfg.showText ? 0
                        : root.cfg.compactText ? Math.min(root.cfg.textWidth, Math.ceil(marquee.naturalWidth) + 1)
                        : root.cfg.textWidth
                    text: root.label
                    color: root.fg
                    fontFamily: root.fontName
                    fontPixelSize: Style.font.bodySmall
                    direction: root.cfg.scrollDirection
                    speed: root.cfg.scrollSpeed
                    pause: root.cfg.scrollPause
                    align: root.cfg.textAlign
                    anchors.verticalCenter: parent.verticalCenter
                }

                Visualizer {
                    width: root.vizItemWidth
                    height: root.vizHeight
                    levels: root.service ? root.service.levels : []
                    vizStyle: root.effStyle
                    colorMode: root.cfg.colorMode
                    customColor: root.cfg.customColor
                    foreground: root.fg
                    count: root.cfg.barCount
                    visible: root.vizRight
                    flip: root.cfg.vizSide === "both"
                    anchors.verticalCenter: parent.verticalCenter
                }

        Cover {
                    width: root.cfg.coverSize
                    height: root.cfg.coverSize
                    source: root.albumArt
                    ink: root.fg
                    visible: root.cfg.coverSide === "right"
                    anchors.verticalCenter: parent.verticalCenter
                }
            }

            MouseArea {
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                acceptedButtons: Qt.LeftButton | Qt.MiddleButton | Qt.RightButton

                onClicked: function(mouse) {
                    if (mouse.button === Qt.RightButton) {
                        settingsPopup.toggle()
                        return
                    }
                    if (!root.service) return
                    if (mouse.button === Qt.MiddleButton) root.service.runAction("next")
                    else if (root.cfg.clickAction === "playPause") root.service.runAction("playPause")
                    else if (root.cfg.clickAction === "next") root.service.runAction("next")
                }

                onWheel: function(wheel) {
                    if (!root.service || root.cfg.wheelAction === "none") return
                    const up = wheel.angleDelta.y > 0
                    if (root.cfg.wheelAction === "style") root.stepStyle(up ? -1 : 1)
                    else root.service.runAction(up ? "previous" : "next")
                }

                onEntered: if (root.bar) root.bar.showTooltip(root, root.tooltipLine())
                onExited: if (root.bar) root.bar.hideTooltip(root)
            }
        }

        Controls {
            visible: root.cfg.showControls && root.cfg.controlsSide === "right"
            bar: root.bar
            service: root.service
            anchors.verticalCenter: parent.verticalCenter
        }

        Button {
            id: gearH
            visible: true
            iconText: "󰒓"
            foreground: root.fg
            fontFamily: root.fontName
            iconSize: Style.font.body
            horizontalPadding: Style.space(3)
            verticalPadding: Style.space(2)
            anchors.verticalCenter: parent.verticalCenter
            HoverHandler { onHoveredChanged: root.tip(gearH, hovered, "Omaudix settings") }
            onClicked: {
                root.tip(gearH, false, "")
                settingsPopup.toggle()
            }
        }
    }

    // ---- vertical bar: play button plus a rotated visualizer ---------------------
    Column {
        id: verticalContent
        visible: root.vertical
        anchors.centerIn: parent
        spacing: Style.space(3)

        Cover {
            width: root.cfg.coverSize
            height: root.cfg.coverSize
            source: root.albumArt
            ink: root.fg
            visible: root.cfg.coverSide !== "hidden"
            anchors.horizontalCenter: parent.horizontalCenter
        }

        Button {
            visible: root.cfg.showControls
            iconText: root.playing ? "󰏤" : "󰐊"
            foreground: root.fg
            fontFamily: root.fontName
            iconSize: Style.font.body
            horizontalPadding: Style.space(3)
            verticalPadding: Style.space(2)
            onClicked: if (root.service) root.service.runAction("playPause")
        }

        Item {
            visible: root.cfg.vizSide !== "hidden"
            width: Style.space(20)
            height: Style.space(54)

            Visualizer {
                anchors.centerIn: parent
                width: parent.height
                height: parent.width
                rotation: 90
                levels: root.service ? root.service.levels : []
                vizStyle: root.effStyle
                colorMode: root.cfg.colorMode
                customColor: root.cfg.customColor
                foreground: root.fg
                count: 12
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: if (root.service) root.service.runAction("playPause")
            }
        }

        Button {
            id: gearV
            visible: true
            iconText: "󰒓"
            foreground: root.fg
            fontFamily: root.fontName
            iconSize: Style.font.body
            horizontalPadding: Style.space(3)
            verticalPadding: Style.space(2)
            HoverHandler { onHoveredChanged: root.tip(gearV, hovered, "Omaudix settings") }
            onClicked: {
                root.tip(gearV, false, "")
                settingsPopup.toggle()
            }
        }
    }

    // ---- settings popup --------------------------------------------------------
    SettingsPopup {
        id: settingsPopup
        svc: root.service
        shellSettings: root.settings
        cfg: root.cfg
        anchorItem: root
        barObject: root.bar
        vertical: root.vertical
        fg: root.fg
        fontFamily: root.fontName
    }
}
