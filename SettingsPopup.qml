import QtQuick
import QtQuick.Layouts
import Quickshell

// Floating settings panel for Omaudix.
//
//   * Header card: cover art, track, and a live preview of the visualizer
//     (real audio when playing, sample data otherwise).
//   * Four tabs: Look, Response, Text, Behavior.
//   * Every setting is a SettingRow: plain numbers (no px/ms/%), friendly
//     option names, a one-line hint, and a reset arrow once it differs from
//     the default. Settings that currently have no effect are dimmed.
//   * Colors are derived from the bar foreground, so it follows the theme.
PopupWindow {
    id: root

    property var store: null
    property var anchorItem: null
    property color fg: "white"
    property string fontFamily: ""
    property var readSetting: null
    property string albumArt: ""
    property string title: ""
    property string artist: ""
    property bool showAlbumArt: true
    property var levels: []
    property var players: []              // [{ id, name, track, playing }]
    property string activeId: ""          // player currently shown on the bar
    property string selectedId: ""        // exact player the user picked (empty = Auto)
    property string preferredPlayer: "auto"

    // Emitted when a specific player is picked, so the widget can pause the
    // others and start that one.
    signal playerChosen(string playerId)

    property int tab: 0
    property bool confirmReset: false

    // ---- theme -------------------------------------------------------------
    readonly property bool lightText: (0.299 * fg.r + 0.587 * fg.g + 0.114 * fg.b) > 0.5
    readonly property color panelBg: lightText ? Qt.rgba(0.07, 0.07, 0.09, 0.97) : Qt.rgba(0.97, 0.97, 0.98, 0.97)
    readonly property color inkOnFg: lightText ? Qt.rgba(0.07, 0.07, 0.09, 1) : Qt.rgba(0.97, 0.97, 0.98, 1)
    function tint(a) { return Qt.rgba(fg.r, fg.g, fg.b, a) }

    // Bar on top half of screen? Drives which side the popup opens on.
    readonly property bool barAtTop: {
        if (!root.anchorItem || !root.anchorItem.screen) return true
        var pos = root.anchorItem.mapToItem(null, 0, 0)
        return pos.y < root.anchorItem.screen.height / 2
    }

    readonly property real maxHeight: {
        var scr = root.anchorItem ? root.anchorItem.screen : null
        var available = scr ? (scr.height - 140) : 620
        return Math.max(360, Math.min(680, available))
    }

    // ---- sample data for the tiles / idle preview ----------------------------
    readonly property var demoSpectrum: [0.25, 0.45, 0.7, 0.55, 0.85, 0.6, 0.92, 0.5, 0.72, 0.35, 0.55, 0.3]
    readonly property var demoScope: {
        var a = []
        for (var i = 0; i < 48; i++) {
            var x = i / 47
            a.push(0.75 * Math.sin(x * Math.PI * 5) * (0.55 + 0.45 * Math.sin(x * Math.PI * 2)))
        }
        return a
    }

    // ---- settings --------------------------------------------------------------
    // Item: { key, label, kind, fallback, hint, options?, labels?, presets?,
    //         min?, max?, step?, divisor?, decimals?, when? }
    // `when` is a list of { key, is: [...] }; if any fails the row is dimmed.
    readonly property var tabs: [
        { title: "Player", kind: "players", items: [] },
        {
            title: "Look",
            items: [
                { key: "vizStyle", label: "Style", kind: "viz", fallback: "bars",
                  options: ["bars", "mirror", "wave", "scope", "dots", "led", "ring", "area"],
                  labels: { bars: "Bars", mirror: "Mirror", wave: "Wave", scope: "Scope",
                            dots: "Dots", led: "LED", ring: "Ring", area: "Area" },
                  hint: "How the music is drawn." },
                { key: "vizSide", label: "Placement", kind: "enum", fallback: "left",
                  options: ["left", "right", "both", "hidden"],
                  labels: { left: "Left", right: "Right", both: "Both", hidden: "Hidden" },
                  hint: "Which side of the text it sits on. Both mirrors it." },
                { key: "vizWidth", label: "Width", kind: "int", fallback: 72,
                  min: 24, max: 240, step: 4,
                  hint: "How wide it is. The ring always stays square.",
                  when: [{ key: "vizSide", is: ["left", "right", "both"] }] },
                { key: "coverSide", label: "Cover on the bar", kind: "enum", fallback: "hidden",
                  options: ["hidden", "left", "center", "right"],
                  labels: { hidden: "Hidden", left: "Left", center: "Center", right: "Right" },
                  hint: "Show the song's cover on the bar. Center puts it right before the text." },
                { key: "coverSize", label: "Cover size", kind: "int", fallback: 16,
                  min: 10, max: 36, step: 2,
                  hint: "How big the cover is on the bar.",
                  when: [{ key: "coverSide", is: ["left", "center", "right"] }] },
                { key: "barCount", label: "Bar count", kind: "int", fallback: 20,
                  min: 6, max: 64, step: 2,
                  hint: "Fewer looks chunky, more looks fine." },
                { key: "colorMode", label: "Color", kind: "colors", fallback: "theme",
                  options: ["theme", "fade", "rainbow", "custom"],
                  labels: { theme: "Theme", fade: "Fade", rainbow: "Rainbow", custom: "Custom" },
                  hint: "Theme follows your bar." },
                { key: "customColor", label: "Custom color", kind: "color", fallback: "#7aa2f7",
                  presets: ["#7aa2f7", "#bb9af7", "#7dcfff", "#9ece6a", "#e0af68", "#ff9e64", "#f7768e", "#c0caf5"],
                  hint: "Pick one, or type a hex like #7aa2f7.",
                  when: [{ key: "colorMode", is: ["custom"] }] }
            ]
        },
        {
            title: "Response",
            items: [
                { key: "sensitivity", label: "Sensitivity", kind: "int", fallback: 100,
                  min: 25, max: 400, step: 5, divisor: 100, decimals: 2,
                  hint: "How tall it gets. 1 is normal, 2 is twice as tall." },
                { key: "smoothing", label: "Smoothing", kind: "int", fallback: 60,
                  min: 0, max: 100, step: 5,
                  hint: "Higher means bars fall more gently." },
                { key: "fps", label: "Frame rate", kind: "int", fallback: 30,
                  min: 15, max: 60, step: 5,
                  hint: "Smoother motion, but uses more CPU." },
                { key: "engine", label: "Engine", kind: "enum", fallback: "auto",
                  options: ["auto", "cava", "builtin"],
                  labels: { auto: "Auto", cava: "Cava", builtin: "Built-in" },
                  hint: "Auto uses cava when installed, otherwise the built-in analyzer." }
            ]
        },
        {
            title: "Text",
            items: [
                { key: "showText", label: "Show track text", kind: "bool", fallback: true,
                  hint: "Artist and title next to the visualizer." },
                { key: "textFormat", label: "Format", kind: "enum", fallback: "artist-title",
                  options: ["artist-title", "title-artist", "title", "artist"],
                  labels: { "artist-title": "Artist \u2013 Title", "title-artist": "Title \u2013 Artist",
                            title: "Title", artist: "Artist" },
                  hint: "What to show, and in which order.",
                  when: [{ key: "showText", is: [true] }] },
                { key: "separator", label: "Separator", kind: "string", fallback: " - ",
                  presets: [" - ", " \u2013 ", " \u2022 ", " | ", " \u00B7 "],
                  hint: "Goes between artist and title.",
                  when: [{ key: "showText", is: [true] },
                         { key: "textFormat", is: ["artist-title", "title-artist"] }] },
                { key: "compactText", label: "Shrink to short titles", kind: "bool", fallback: true,
                  hint: "Short titles sit right next to the buttons. Off keeps a fixed width.",
                  when: [{ key: "showText", is: [true] }] },
                { key: "textWidth", label: "Max text width", kind: "int", fallback: 160,
                  min: 60, max: 400, step: 10,
                  hint: "Longer titles scroll instead of growing the widget.",
                  when: [{ key: "showText", is: [true] }] },
                { key: "scrollDirection", label: "Scroll", kind: "enum", fallback: "left",
                  options: ["left", "right", "bounce", "off"],
                  labels: { left: "Left", right: "Right", bounce: "Bounce", off: "Off" },
                  hint: "How long titles move. Off cuts them short instead.",
                  when: [{ key: "showText", is: [true] }] },
                { key: "scrollSpeed", label: "Scroll speed", kind: "int", fallback: 35,
                  min: 10, max: 120, step: 5,
                  hint: "Higher is faster.",
                  when: [{ key: "showText", is: [true] },
                         { key: "scrollDirection", is: ["left", "right", "bounce"] }] },
                { key: "scrollPause", label: "Pause before scroll", kind: "int", fallback: 1500,
                  min: 0, max: 5000, step: 250, divisor: 1000, decimals: 2,
                  hint: "Seconds the text waits so you can read the start.",
                  when: [{ key: "showText", is: [true] },
                         { key: "scrollDirection", is: ["left", "right", "bounce"] }] },
                { key: "textAlign", label: "Alignment", kind: "enum", fallback: "left",
                  options: ["left", "center", "right"],
                  labels: { left: "Left", center: "Center", right: "Right" },
                  hint: "For text short enough to fit without scrolling.",
                  when: [{ key: "showText", is: [true] }] }
            ]
        },
        {
            title: "Behavior",
            items: [
                { key: "showControls", label: "Playback buttons", kind: "bool", fallback: true,
                  hint: "Previous, play/pause and next." },
                { key: "controlsSide", label: "Buttons side", kind: "enum", fallback: "right",
                  options: ["left", "right"],
                  labels: { left: "Left", right: "Right" },
                  hint: "Which end of the widget holds them.",
                  when: [{ key: "showControls", is: [true] }] },
                { key: "clickAction", label: "Left click", kind: "enum", fallback: "playPause",
                  options: ["playPause", "next", "none"],
                  labels: { playPause: "Play / Pause", next: "Next track", none: "Nothing" },
                  hint: "On the visualizer or text. Middle click always skips." },
                { key: "wheelAction", label: "Scroll wheel", kind: "enum", fallback: "track",
                  options: ["track", "style", "none"],
                  labels: { track: "Skip tracks", style: "Change style", none: "Nothing" },
                  hint: "Style changes last until the shell restarts." },
                { key: "hideWhenPaused", label: "Hide when paused", kind: "bool", fallback: false,
                  hint: "Remove the widget from the bar while nothing plays." },
                { key: "pauseOthers", label: "Pause the old player", kind: "bool", fallback: false,
                  hint: "When another player starts playing, pause the one that was playing before." },
                { key: "showAlbumArt", label: "Cover art in this panel", kind: "bool", fallback: true,
                  hint: "Show the current cover in the header above." }
            ]
        }
    ]

    readonly property var defaults: {
        var d = ({})
        for (var t = 0; t < tabs.length; t++)
            for (var i = 0; i < tabs[t].items.length; i++)
                d[tabs[t].items[i].key] = tabs[t].items[i].fallback
        d["player"] = "auto"
        return d
    }

    // Current value: local override, then the shell's setting, then default.
    function val(key) {
        var fb = root.defaults[key]
        var raw = root.store ? root.store.values[key] : undefined
        if (raw !== undefined) return raw
        if (root.readSetting) {
            var s = root.readSetting(key, fb)
            if (s !== undefined && s !== null) return s
        }
        return fb
    }

    function dimmed(item) {
        if (!item.when) return false
        for (var i = 0; i < item.when.length; i++) {
            var c = item.when[i]
            var cur = String(root.val(c.key))
            if (c.is.map(String).indexOf(cur) < 0) return true
        }
        return false
    }

    function setValue(item, v) {
        if (root.store) root.store.set(item.key, v)
    }

    function resetAll() {
        if (!root.store) return
        if (!root.confirmReset) {
            root.confirmReset = true
            confirmTimer.restart()
            return
        }
        root.confirmReset = false
        root.store.resetAll(root.defaults)
    }

    // ---- player list ----------------------------------------------------------
    readonly property bool preferredRunning: root.selectedId !== ""

    readonly property string activeName: {
        for (var i = 0; i < root.players.length; i++)
            if (root.players[i].id === root.activeId) return root.players[i].name
        return ""
    }

    readonly property var playerRows: {
        var rows = [{
            id: "auto", auto: true, name: "Auto", via: "", playing: false,
            sub: (root.preferredPlayer !== "auto" && root.preferredPlayer !== "" && !root.preferredRunning)
                ? "Your chosen player isn't running, following whatever plays"
                : (root.activeName !== "" ? "Follows whatever is playing \u00B7 now: " + root.activeName
                                          : "Follows whatever is playing")
        }]
        for (var i = 0; i < root.players.length; i++) {
            var q = root.players[i]
            rows.push({ id: q.id, auto: false, name: q.name, via: q.via, playing: q.playing,
                        sub: q.track !== "" ? q.track : "Nothing loaded" })
        }
        return rows
    }

    function isPicked(row) {
        if (row.auto) return root.preferredPlayer === "auto" || root.preferredPlayer === "" || !root.preferredRunning
        return root.preferredRunning && row.id === root.selectedId
    }

    function pickPlayer(row) {
        if (root.store) root.store.set("player", row.id)
        if (!row.auto) root.playerChosen(row.id)
    }

    function stepTab(d) {
        root.tab = (root.tab + d + root.tabs.length) % root.tabs.length
    }

    // What the preview should draw.
    readonly property string previewStyle: String(root.val("vizStyle"))
    readonly property var previewLevels: (root.levels && root.levels.length > 0)
        ? root.levels
        : (root.previewStyle === "scope" ? root.demoScope : root.demoSpectrum)

    // ---- window geometry -------------------------------------------------------
    visible: false
    color: "transparent"
    implicitWidth: 440
    implicitHeight: Math.min(root.maxHeight, mainCol.implicitHeight + 28)

    anchor.item: root.anchorItem
    anchor.edges: root.barAtTop ? Edges.Bottom : Edges.Top
    anchor.gravity: root.barAtTop ? Edges.Top : Edges.Bottom
    anchor.margins.top: root.barAtTop ? 8 : 0
    anchor.margins.bottom: root.barAtTop ? 0 : 8
    anchor.adjustment: PopupAdjustment.SlideX | PopupAdjustment.SlideY

    onVisibleChanged: if (!visible) root.confirmReset = false

    Timer { id: confirmTimer; interval: 2500; onTriggered: root.confirmReset = false }

    Shortcut {
        sequence: "Escape"
        context: Qt.WindowShortcut
        onActivated: root.visible = false
    }
    Shortcut {
        sequence: "Alt+Right"
        context: Qt.WindowShortcut
        onActivated: root.stepTab(1)
    }
    Shortcut {
        sequence: "Alt+Left"
        context: Qt.WindowShortcut
        onActivated: root.stepTab(-1)
    }

    Rectangle {
        anchors.fill: parent
        color: root.panelBg
        border.color: root.tint(0.14)
        border.width: 1
        radius: 12
        clip: true

        ColumnLayout {
            id: mainCol
            anchors.fill: parent
            anchors.margins: 14
            spacing: 12

            // ---- header: track + live preview ------------------------------------
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: headerCol.implicitHeight + 24
                radius: 10
                color: root.tint(0.05)
                border.width: 1
                border.color: root.tint(0.08)

                ColumnLayout {
                    id: headerCol
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 10

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 12

                        Rectangle {
                            visible: root.showAlbumArt
                            Layout.preferredWidth: 52
                            Layout.preferredHeight: 52
                            radius: 8
                            color: root.tint(0.08)
                            clip: true

                            Image {
                                anchors.fill: parent
                                source: root.albumArt
                                fillMode: Image.PreserveAspectCrop
                                visible: root.albumArt !== ""
                                asynchronous: true
                            }
                            Text {
                                anchors.centerIn: parent
                                text: "\u266B"
                                color: root.fg
                                opacity: 0.35
                                font.pixelSize: 22
                                visible: root.albumArt === ""
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            Layout.alignment: Qt.AlignVCenter
                            spacing: 2

                            Text {
                                Layout.fillWidth: true
                                text: root.title !== "" ? root.title : "Nothing playing"
                                color: root.fg
                                font.family: root.fontFamily
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                                elide: Text.ElideRight
                            }
                            Text {
                                Layout.fillWidth: true
                                text: root.title !== "" ? root.artist
                                    : "Preview uses sample data until music plays"
                                visible: text !== ""
                                color: root.fg
                                opacity: 0.6
                                font.family: root.fontFamily
                                font.pixelSize: 9
                                elide: Text.ElideRight
                            }
                        }

                        // reset (asks twice) + close
                        Rectangle {
                            Layout.alignment: Qt.AlignTop
                            implicitWidth: resetLabel.implicitWidth + 16
                            implicitHeight: 24
                            radius: 6
                            color: root.confirmReset ? root.fg
                                : (resetArea.containsMouse ? root.tint(0.16) : root.tint(0.08))
                            Behavior on color { ColorAnimation { duration: 100 } }

                            Text {
                                id: resetLabel
                                anchors.centerIn: parent
                                text: root.confirmReset ? "Really reset?" : "Reset all"
                                color: root.confirmReset ? root.inkOnFg : root.fg
                                font.family: root.fontFamily
                                font.pixelSize: 9
                            }
                            MouseArea {
                                id: resetArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.resetAll()
                            }
                        }
                        Rectangle {
                            Layout.alignment: Qt.AlignTop
                            implicitWidth: 24; implicitHeight: 24; radius: 6
                            color: closeArea.containsMouse ? root.tint(0.16) : root.tint(0.08)
                            Text {
                                anchors.centerIn: parent
                                text: "\u00D7"
                                color: root.fg
                                font.pixelSize: 15
                            }
                            MouseArea {
                                id: closeArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.visible = false
                            }
                        }
                    }

                    // live preview strip
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 40
                        radius: 8
                        color: root.tint(0.04)
                        clip: true

                        Visualizer {
                            anchors.centerIn: parent
                            width: root.previewStyle === "ring" ? 28 : parent.width - 32
                            height: root.previewStyle === "ring" ? 28 : 26
                            levels: root.previewLevels
                            vizStyle: root.previewStyle
                            colorMode: String(root.val("colorMode"))
                            customColor: String(root.val("customColor"))
                            foreground: root.fg
                            count: Number(root.val("barCount"))
                        }
                    }
                }
            }

            // ---- tabs --------------------------------------------------------------
            Item {
                Layout.fillWidth: true
                implicitHeight: 30

                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    height: 1
                    color: root.tint(0.10)
                }

                RowLayout {
                    anchors.fill: parent
                    spacing: 0

                    Repeater {
                        model: root.tabs
                        delegate: Item {
                            readonly property bool on: index === root.tab
                            Layout.fillWidth: true
                            Layout.preferredWidth: 1
                            Layout.fillHeight: true

                            Text {
                                anchors.centerIn: parent
                                anchors.verticalCenterOffset: -1
                                text: modelData.title
                                color: root.fg
                                opacity: parent.on ? 1.0 : (tabArea.containsMouse ? 0.8 : 0.5)
                                font.family: root.fontFamily
                                font.pixelSize: 10
                                font.weight: parent.on ? Font.DemiBold : Font.Normal
                            }
                            Rectangle {
                                visible: parent.on
                                anchors.left: parent.left
                                anchors.right: parent.right
                                anchors.bottom: parent.bottom
                                height: 2
                                radius: 1
                                color: root.fg
                            }
                            MouseArea {
                                id: tabArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.tab = index
                            }
                        }
                    }
                }
            }

            // ---- settings of the active tab ------------------------------------------
            Flickable {
                id: flick
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.preferredHeight: card.implicitHeight
                contentWidth: width
                contentHeight: card.implicitHeight
                clip: true
                boundsBehavior: Flickable.StopAtBounds

                Rectangle {
                    id: card
                    width: flick.width
                    implicitHeight: rows.implicitHeight + 8
                    radius: 10
                    color: root.tint(0.035)
                    border.width: 1
                    border.color: root.tint(0.07)

                    ColumnLayout {
                        id: rows
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.leftMargin: 14
                        anchors.rightMargin: 14
                        anchors.topMargin: 4
                        spacing: 0

                        // ---- Player tab ----------------------------------------------
                        ColumnLayout {
                            visible: root.tabs[root.tab].kind === "players"
                            Layout.fillWidth: true
                            Layout.topMargin: 12
                            Layout.bottomMargin: 12
                            spacing: 6

                            Text {
                                Layout.fillWidth: true
                                text: "Follow which player?"
                                color: root.fg
                                font.family: root.fontFamily
                                font.pixelSize: 10
                                font.weight: Font.DemiBold
                            }
                            Text {
                                Layout.fillWidth: true
                                Layout.bottomMargin: 4
                                text: "Pick one to pause the others and play it. Auto just follows whatever is playing."
                                color: root.fg
                                opacity: 0.55
                                font.family: root.fontFamily
                                font.pixelSize: 8
                                wrapMode: Text.Wrap
                            }

                            Repeater {
                                model: root.tabs[root.tab].kind === "players" ? root.playerRows : []

                                delegate: Rectangle {
                                    readonly property bool picked: root.isPicked(modelData)
                                    readonly property bool onBar: !modelData.auto && modelData.id === root.activeId
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 46
                                    Layout.minimumHeight: 46
                                    implicitHeight: 46
                                    clip: true
                                    radius: 8
                                    color: picked ? root.tint(0.14) : (pArea.containsMouse ? root.tint(0.09) : root.tint(0.04))
                                    border.width: picked ? 1.5 : 1
                                    border.color: picked ? root.fg : root.tint(0.08)
                                    Behavior on color { ColorAnimation { duration: 100 } }

                                    // radio dot
                                    Rectangle {
                                        id: radio
                                        anchors.left: parent.left
                                        anchors.leftMargin: 10
                                        anchors.verticalCenter: parent.verticalCenter
                                        width: 12; height: 12; radius: 6
                                        color: "transparent"
                                        border.width: 1.5
                                        border.color: picked ? root.fg : root.tint(0.4)
                                        Rectangle {
                                            anchors.centerIn: parent
                                            width: 6; height: 6; radius: 3
                                            color: root.fg
                                            visible: picked
                                        }
                                    }

                                    ColumnLayout {
                                        id: rowText
                                        anchors.left: radio.right
                                        anchors.leftMargin: 10
                                        anchors.right: stateText.left
                                        anchors.rightMargin: 8
                                        anchors.verticalCenter: parent.verticalCenter
                                        spacing: 1

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 6
                                            Text {
                                                text: modelData.name
                                                color: root.fg
                                                font.family: root.fontFamily
                                                font.pixelSize: 10
                                                font.weight: Font.DemiBold
                                                elide: Text.ElideRight
                                                Layout.fillWidth: modelData.via === ""
                                                Layout.maximumWidth: Math.max(40, rowText.width - viaText.implicitWidth - 8)
                                            }
                                            Text {
                                                id: viaText
                                                visible: modelData.via !== ""
                                                text: "via " + modelData.via
                                                color: root.fg
                                                opacity: 0.45
                                                font.family: root.fontFamily
                                                font.pixelSize: 8
                                            }
                                            Item { Layout.fillWidth: true }
                                        }
                                        Text {
                                            Layout.fillWidth: true
                                            text: modelData.sub
                                            color: root.fg
                                            opacity: 0.55
                                            font.family: root.fontFamily
                                            font.pixelSize: 8
                                            elide: Text.ElideRight
                                        }
                                    }

                                    Text {
                                        id: stateText
                                        anchors.right: parent.right
                                        anchors.rightMargin: 10
                                        anchors.verticalCenter: parent.verticalCenter
                                        visible: !modelData.auto
                                        text: modelData.playing ? "\u25CF Playing" : "Paused"
                                        color: root.fg
                                        opacity: modelData.playing ? 0.9 : 0.4
                                        font.family: root.fontFamily
                                        font.pixelSize: 8
                                    }

                                    MouseArea {
                                        id: pArea
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: root.pickPlayer(modelData)
                                    }
                                }
                            }

                            Text {
                                Layout.fillWidth: true
                                visible: root.players.length === 0
                                text: "No players found. Start Spotify, YouTube Music, cliamp, a radio app, or play something in a browser and it will show up here."
                                color: root.fg
                                opacity: 0.55
                                font.family: root.fontFamily
                                font.pixelSize: 8
                                wrapMode: Text.Wrap
                            }
                            Text {
                                Layout.fillWidth: true
                                Layout.topMargin: 4
                                text: "The visualizer listens to your system output, so it reacts to whatever is audible, not only the selected player."
                                color: root.fg
                                opacity: 0.4
                                font.family: root.fontFamily
                                font.pixelSize: 8
                                wrapMode: Text.Wrap
                            }
                        }

                        Repeater {
                            model: root.tabs[root.tab].items

                            delegate: ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 0

                                Rectangle {
                                    visible: index > 0
                                    Layout.fillWidth: true
                                    implicitHeight: 1
                                    color: root.tint(0.07)
                                }

                                SettingRow {
                                    Layout.fillWidth: true
                                    Layout.topMargin: 12
                                    Layout.bottomMargin: 12

                                    label: modelData.label
                                    hint: modelData.hint || ""
                                    kind: modelData.kind
                                    options: modelData.options || []
                                    labels: modelData.labels || ({})
                                    presets: modelData.presets || []
                                    min: modelData.min !== undefined ? modelData.min : 0
                                    max: modelData.max !== undefined ? modelData.max : 100
                                    step: modelData.step !== undefined ? modelData.step : 1
                                    divisor: modelData.divisor !== undefined ? modelData.divisor : 1
                                    decimals: modelData.decimals !== undefined ? modelData.decimals : 0
                                    defaultValue: modelData.fallback
                                    dimmed: root.dimmed(modelData)
                                    value: root.val(modelData.key)

                                    fg: root.fg
                                    bg: root.inkOnFg
                                    fontFamily: root.fontFamily
                                    customColor: String(root.val("customColor"))
                                    demoSpectrum: root.demoSpectrum
                                    demoScope: root.demoScope

                                    onEdited: function(v) { root.setValue(modelData, v) }
                                }
                            }
                        }
                    }
                }
            }

            // ---- footer ----------------------------------------------------------------
            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                Rectangle {
                    implicitWidth: escLabel.implicitWidth + 10
                    implicitHeight: 16
                    radius: 4
                    color: root.tint(0.08)
                    Text {
                        id: escLabel
                        anchors.centerIn: parent
                        text: "Esc"
                        color: root.fg
                        opacity: 0.75
                        font.family: root.fontFamily
                        font.pixelSize: 8
                    }
                }
                Text {
                    text: "close"
                    color: root.fg
                    opacity: 0.45
                    font.family: root.fontFamily
                    font.pixelSize: 8
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: "Changes apply instantly"
                    color: root.fg
                    opacity: 0.45
                    font.family: root.fontFamily
                    font.pixelSize: 8
                }
            }
        }
    }
}
