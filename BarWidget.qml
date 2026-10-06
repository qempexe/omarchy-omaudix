import QtQuick
import Quickshell
import qs.Commons
import qs.Ui

BarWidget {
    id: root

    moduleName: "io.github.qempexe.omaudix"

    readonly property var service: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
    readonly property bool hasMedia: service ? service.hasMedia : false
    readonly property bool playing: service ? service.playing : false

    // ---- local settings overrides (popup) ----------------------------------
    SettingsStore { id: settingsStore }

    // Local override wins over `omarchy bar set`/manifest.
    function over(key, fallback) {
        var v = settingsStore.get(key)
        return v === null ? fallback : v
    }

    // ---- settings: every key read here is declared in manifest.json --------
    readonly property var styleChoices: ["bars", "mirror", "wave", "scope", "dots", "led", "ring", "area"]

    readonly property string styleSetting: pick(over("vizStyle", setting("vizStyle", "bars")), styleChoices, "bars")
    readonly property string vizSide: pick(over("vizSide", setting("vizSide", "left")), ["left", "right", "both", "hidden"], "left")
    readonly property int vizWidth: whole(over("vizWidth", setting("vizWidth", 72)), 24, 240, 72)
    readonly property int barCount: whole(over("barCount", setting("barCount", 20)), 6, 64, 20)
    readonly property string colorMode: pick(over("colorMode", setting("colorMode", "theme")), ["theme", "fade", "rainbow", "custom"], "theme")
    readonly property string customColor: String(over("customColor", setting("customColor", "#7aa2f7")))
    readonly property int sensitivity: whole(over("sensitivity", setting("sensitivity", 100)), 25, 400, 100)
    readonly property int smoothing: whole(over("smoothing", setting("smoothing", 60)), 0, 100, 60)
    readonly property int fps: whole(over("fps", setting("fps", 30)), 15, 60, 30)
    readonly property string engine: pick(over("engine", setting("engine", "auto")), ["auto", "cava", "builtin"], "auto")

    readonly property bool showText: flag(over("showText", setting("showText", true)), true)
    readonly property string textFormat: pick(over("textFormat", setting("textFormat", "artist-title")), ["artist-title", "title-artist", "title", "artist"], "artist-title")
    readonly property string separator: String(over("separator", setting("separator", " - ")))
    readonly property int textWidth: whole(over("textWidth", setting("textWidth", 160)), 60, 400, 160)
    readonly property string scrollDirection: pick(over("scrollDirection", setting("scrollDirection", "left")), ["left", "right", "bounce", "off"], "left")
    readonly property int scrollSpeed: whole(over("scrollSpeed", setting("scrollSpeed", 35)), 10, 120, 35)
    readonly property int scrollPause: whole(over("scrollPause", setting("scrollPause", 1500)), 0, 5000, 1500)
    readonly property string textAlign: pick(over("textAlign", setting("textAlign", "left")), ["left", "center", "right"], "left")

    readonly property bool showControls: flag(over("showControls", setting("showControls", true)), true)
    readonly property string controlsSide: pick(over("controlsSide", setting("controlsSide", "right")), ["left", "right"], "right")
    readonly property bool hideWhenPaused: flag(over("hideWhenPaused", setting("hideWhenPaused", false)), false)
    readonly property string clickAction: pick(over("clickAction", setting("clickAction", "playPause")), ["playPause", "next", "none"], "playPause")
    readonly property string wheelAction: pick(over("wheelAction", setting("wheelAction", "track")), ["track", "style", "none"], "track")
    readonly property string playerPref: String(over("player", setting("player", "auto")))
    readonly property bool compactText: flag(over("compactText", setting("compactText", true)), true)
    readonly property bool showAlbumArt: flag(over("showAlbumArt", setting("showAlbumArt", true)), true)
    readonly property string coverSide: pick(over("coverSide", setting("coverSide", "hidden")), ["hidden", "left", "center", "right"], "hidden")
    readonly property int coverSize: whole(over("coverSize", setting("coverSize", 16)), 10, 36, 16)
    readonly property bool pauseOthers: flag(over("pauseOthers", setting("pauseOthers", false)), false)

    // Album art URL, empty when nothing is playing.
    readonly property string albumArt: service ? service.albumArt : ""

    function pick(value, allowed, fallback) {
        var v = String(value)
        return allowed.indexOf(v) >= 0 ? v : fallback
    }

    function whole(value, lo, hi, fallback) {
        var v = Number(value)
        if (!isFinite(v)) return fallback
        return Math.max(lo, Math.min(hi, Math.round(v)))
    }

    // `omarchy bar set` may store booleans as strings, so accept both.
    function flag(value, fallback) {
        if (value === true || value === "true") return true
        if (value === false || value === "false") return false
        return fallback
    }

    // ---- derived state -----------------------------------------------------
    readonly property string effStyle: service && service.styleOverride !== "" ? service.styleOverride : styleSetting
    // Always on the bar by default (idle placeholder when nothing plays);
    // "Hide when paused" is the opt-out.
    readonly property bool shouldShow: hideWhenPaused ? (hasMedia && playing) : true
    readonly property bool vizLeft: vizSide === "left" || vizSide === "both"
    readonly property bool vizRight: vizSide === "right" || vizSide === "both"
    readonly property real vizHeight: Style.space(18)
    readonly property real vizItemWidth: effStyle === "ring" ? vizHeight + Style.space(2) : vizWidth
    readonly property color fg: bar ? bar.barForeground : Color.foreground
    readonly property string fontName: bar ? bar.fontFamily : Style.font.family

    readonly property string label: {
        if (!service || !service.hasMedia) return "Nothing playing"
        var t = service.title
        var a = service.artist
        if (textFormat === "title") return t !== "" ? t : a
        if (textFormat === "artist") return a !== "" ? a : t
        if (t === "" || a === "") return t !== "" ? t : a
        return textFormat === "title-artist" ? t + separator + a : a + separator + t
    }

    visible: shouldShow
    implicitWidth: shouldShow
        ? (vertical ? barSize : horizontalContent.implicitWidth + Style.space(10)) : 0
    implicitHeight: shouldShow
        ? (vertical ? verticalContent.implicitHeight + Style.space(10) : barSize) : 0

    // ---- talk to the shared service ------------------------------------------
    readonly property bool wantsViz: shouldShow && vizSide !== "hidden"
    property var registeredWith: null

    readonly property string configKey: [effStyle, barCount, fps, sensitivity, smoothing, engine].join("|")

    function pushConfig() {
        if (!service || registeredWith !== service) return
        service.configure({
            style: effStyle, bars: barCount, fps: fps,
            gain: sensitivity, smooth: smoothing, engine: engine
        })
    }

    function syncRegistration() {
        var want = wantsViz ? service : null
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
        service.preferred = playerPref
        service.pauseOthers = pauseOthers
    }

    Connections {
        target: root.service
        ignoreUnknownSignals: true
        function onFollowed(playerId) { settingsStore.set("player", playerId) }
    }

    onWantsVizChanged: syncRegistration()
    onServiceChanged: { syncRegistration(); pushPlayer() }
    onPlayerPrefChanged: pushPlayer()
    onPauseOthersChanged: pushPlayer()
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
            ? service.title + " \u2014 " + service.artist : label
    }

    // ---- horizontal layout --------------------------------------------------
    Row {
        id: horizontalContent
        visible: !root.vertical
        anchors.centerIn: parent
        spacing: root.compactText ? Style.space(1) : Style.space(6)

        Controls {
            visible: root.showControls && root.controlsSide === "left"
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
                    visible: root.coverSide === "left"
                    width: root.coverSize
                    height: root.coverSize
                    source: root.albumArt
                    ink: root.fg
                    anchors.verticalCenter: parent.verticalCenter
                }

                Visualizer {
                    visible: root.vizLeft
                    width: root.vizItemWidth
                    height: root.vizHeight
                    levels: root.service ? root.service.levels : []
                    vizStyle: root.effStyle
                    colorMode: root.colorMode
                    customColor: root.customColor
                    foreground: root.fg
                    count: root.barCount
                    anchors.verticalCenter: parent.verticalCenter
                }

                Cover {
                    visible: root.coverSide === "center"
                    width: root.coverSize
                    height: root.coverSize
                    source: root.albumArt
                    ink: root.fg
                    anchors.verticalCenter: parent.verticalCenter
                }

                MarqueeText {
                    id: marquee
                    visible: root.showText
                    // compact: only as wide as the title, up to textWidth;
                    // longer titles fill textWidth and scroll as before
                    width: !root.showText ? 0
                        : root.compactText ? Math.min(root.textWidth, Math.ceil(marquee.naturalWidth) + 1)
                        : root.textWidth
                    text: root.label
                    color: root.fg
                    fontFamily: root.fontName
                    fontPixelSize: Style.font.bodySmall
                    direction: root.scrollDirection
                    speed: root.scrollSpeed
                    pause: root.scrollPause
                    align: root.textAlign
                    anchors.verticalCenter: parent.verticalCenter
                }

                Visualizer {
                    visible: root.vizRight
                    width: root.vizItemWidth
                    height: root.vizHeight
                    levels: root.service ? root.service.levels : []
                    vizStyle: root.effStyle
                    colorMode: root.colorMode
                    customColor: root.customColor
                    foreground: root.fg
                    count: root.barCount
                    flip: root.vizSide === "both"
                    anchors.verticalCenter: parent.verticalCenter
                }

                Cover {
                    visible: root.coverSide === "right"
                    width: root.coverSize
                    height: root.coverSize
                    source: root.albumArt
                    ink: root.fg
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
                        settingsPopup.visible = !settingsPopup.visible
                        return
                    }
                    if (!root.service) return
                    if (mouse.button === Qt.MiddleButton) root.service.runAction("next")
                    else if (root.clickAction === "playPause") root.service.runAction("playPause")
                    else if (root.clickAction === "next") root.service.runAction("next")
                }

                onWheel: function(wheel) {
                    if (!root.service || root.wheelAction === "none") return
                    var up = wheel.angleDelta.y > 0
                    if (root.wheelAction === "style") root.service.cycleStyle(root.effStyle, up ? -1 : 1)
                    else root.service.runAction(up ? "previous" : "next")
                }

                onEntered: if (root.bar) root.bar.showTooltip(root, root.tooltipLine())
                onExited: if (root.bar) root.bar.hideTooltip(root)
            }
        }

        Controls {
            visible: root.showControls && root.controlsSide === "right"
            bar: root.bar
            service: root.service
            anchors.verticalCenter: parent.verticalCenter
        }

        Button {
            id: gearH
            visible: true
            iconText: "\uDB81\uDC93"
            foreground: root.fg
            fontFamily: root.fontName
            iconSize: Style.font.body
            horizontalPadding: Style.space(3)
            verticalPadding: Style.space(2)
            anchors.verticalCenter: parent.verticalCenter
            HoverHandler { onHoveredChanged: root.tip(gearH, hovered, "Omaudix settings") }
            onClicked: {
                root.tip(gearH, false, "")
                settingsPopup.visible = !settingsPopup.visible
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
            visible: root.coverSide !== "hidden"
            width: root.coverSize
            height: root.coverSize
            source: root.albumArt
            ink: root.fg
            anchors.horizontalCenter: parent.horizontalCenter
        }

        Button {
            visible: root.showControls
            iconText: root.playing ? "\uDB80\uDFE4" : "\uDB81\uDC0A"
            foreground: root.fg
            fontFamily: root.fontName
            iconSize: Style.font.body
            horizontalPadding: Style.space(3)
            verticalPadding: Style.space(2)
            onClicked: if (root.service) root.service.runAction("playPause")
        }

        Item {
            visible: root.vizSide !== "hidden"
            width: Style.space(20)
            height: Style.space(54)

            Visualizer {
                anchors.centerIn: parent
                width: parent.height
                height: parent.width
                rotation: 90
                levels: root.service ? root.service.levels : []
                vizStyle: root.effStyle
                colorMode: root.colorMode
                customColor: root.customColor
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
            iconText: "\uDB81\uDC93"
            foreground: root.fg
            fontFamily: root.fontName
            iconSize: Style.font.body
            horizontalPadding: Style.space(3)
            verticalPadding: Style.space(2)
            HoverHandler { onHoveredChanged: root.tip(gearV, hovered, "Omaudix settings") }
            onClicked: {
                root.tip(gearV, false, "")
                settingsPopup.visible = !settingsPopup.visible
            }
        }
    }

    // ---- settings popup --------------------------------------------------------
    SettingsPopup {
        id: settingsPopup
        store: settingsStore
        anchorItem: root
        fg: root.fg
        fontFamily: root.fontName
        albumArt: root.albumArt
        title: root.service ? root.service.title : ""
        artist: root.service ? root.service.artist : ""
        showAlbumArt: root.showAlbumArt
        levels: root.service ? root.service.levels : []
        players: root.service ? root.service.playerList : []
        activeId: root.service ? root.service.activeId : ""
        selectedId: root.service ? root.service.selectedId : ""
        preferredPlayer: root.playerPref
        onPlayerChosen: function(playerId) { if (root.service) root.service.switchTo(playerId) }
        readSetting: function(key, fallback) { return root.setting(key, fallback) }
    }
}
