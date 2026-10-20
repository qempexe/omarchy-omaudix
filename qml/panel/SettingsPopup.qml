import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import qs.Commons
import "../bar"
import "../js/Visuals.js" as Visuals
import "../js/Schema.js" as Schema

// Floating settings panel for Omaudix.
//
//   * Header card: cover art, track, and a live preview of the visualizer
//     (real audio when playing, sample data otherwise).
//   * Tabs from js/Schema.js, a search box that looks through all of them and a
//     "Changed only" switch. Every change goes through the service, which keeps it
//     in memory and saves it.
//   * Looks: ready made looks (one step of undo) and twelve places for your own.
//   * Every setting is a SettingRow: plain numbers (no px/ms/%), friendly
//     option names, a one-line hint, and a reset arrow once it differs from
//     the default. Settings that currently have no effect are dimmed.
//   * Colors: the "Panel colors" setting picks the scheme. Follow theme uses the
//     Omarchy theme's accent and background, Custom uses a hex accent,
//     Monochrome is neutral grey. Text always follows the bar foreground.
PopupWindow {
    id: root

    property var svc: null                    // the shared service
    property var shellSettings: ({})          // this widget's entry in shell.json
    property var cfg: ({})                    // every setting, resolved
    property var anchorItem: null
    property bool vertical: false             // bar is on the left / right edge
    property color fg: "white"
    property string fontFamily: ""

    readonly property var store: svc ? svc.store : null
    readonly property string albumArt: svc ? svc.albumArt : ""
    readonly property string title: svc ? svc.title : ""
    readonly property string artist: svc ? svc.artist : ""
    readonly property var levels: svc ? svc.levels : []
    readonly property var players: svc ? svc.playerList : []      // [{ id, name, track, playing }]
    readonly property string activeId: svc ? svc.activeId : ""     // player currently shown on the bar
    readonly property string selectedId: svc ? svc.selectedId : "" // exact player picked (empty = Auto)
    readonly property string preferredPlayer: String(cfg.player || "auto")

    property int tab: 0
    property bool confirmReset: false
    property string query: ""
    property bool changedOnly: false

    // ---- colors --------------------------------------------------------------
    // Look up a color the shell's theme may expose, trying several likely names.
    // Missing names just return undefined, so an unknown theme falls back to the
    // bar foreground instead of breaking.
    function themeColor(names) {
        for (var i = 0; i < names.length; i++) {
            var raw
            try { raw = Color[names[i]] } catch (e) { raw = undefined }
            if (raw === undefined || raw === null) continue
            try {
                var c = Qt.color(raw)
                if (c && c.valid !== false) return c
            } catch (e2) { }
        }
        return null
    }
    function hexColor(text) {
        var t = String(text)
        return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t) ? Qt.color(t) : null
    }
    function luma(c) { return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }

    readonly property bool lightText: luma(fg) > 0.5
    readonly property var themeAccentColor: themeColor(["accent", "primary", "highlight", "accentColor", "color4", "blue"])
    readonly property var themeBgColor: themeColor(["background", "surface", "base", "bg"])
    readonly property var customAccentColor: hexColor(panelAccent)

    readonly property string panelMode: String(root.cfg.panelColor || "theme")
    readonly property string panelAccent: String(root.cfg.panelCustomColor || "#7aa2f7")
    readonly property bool useTheme: panelMode === "theme"
    readonly property bool useCustom: panelMode === "custom"

    // Neutral panel, used by monochrome and custom (and by theme when the shell
    // exposes no background).
    readonly property color neutralBg: lightText ? Qt.rgba(0.07, 0.07, 0.09, 0.97) : Qt.rgba(0.97, 0.97, 0.98, 0.97)
    readonly property color neutralInk: lightText ? Qt.rgba(0.95, 0.95, 0.96, 1) : Qt.rgba(0.10, 0.10, 0.12, 1)

    // ink: text and soft tints.  accent: filled / selected parts.
    readonly property color ink: useTheme ? fg : (useCustom ? fg : neutralInk)
    readonly property color accent: {
        if (useTheme && themeAccentColor) return themeAccentColor
        if (useCustom && customAccentColor) return customAccentColor
        return ink
    }
    readonly property color panelBg: (useTheme && themeBgColor)
        ? Qt.rgba(themeBgColor.r, themeBgColor.g, themeBgColor.b, 0.97) : neutralBg
    // Text on top of an accent fill.
    readonly property color inkOnFg: luma(accent) > 0.55 ? Qt.rgba(0.07, 0.07, 0.09, 1) : Qt.rgba(0.97, 0.97, 0.98, 1)
    readonly property color panelSolid: Qt.rgba(panelBg.r, panelBg.g, panelBg.b, 1)
    function tint(a) { return Qt.rgba(ink.r, ink.g, ink.b, a) }
    function accentTint(a) { return Qt.rgba(accent.r, accent.g, accent.b, a) }


    // ---- placement: never overlap the bar -----------------------------------------
    // Worked out each time the panel is about to open (see toggle()), because the
    // bar's position is not known yet when this file is first loaded.
    //
    // The panel is anchored to the outer edge of the bar's own window (not to the
    // widget, which sits inside the bar's padding), and the gap is transparent
    // padding inside the popup window, so it works whatever the compositor does
    // with anchor margins.
    property var barObject: null              // the shell's bar, used as a hint for its edge
    property bool barAtTop: true              // horizontal bar: top edge (else bottom)
    property bool barAtLeft: true             // vertical bar: left edge (else right)
    property bool useRect: false              // anchor to the bar window's edge
    property var anchorWin: null
    property real rectX: 0
    property real rectY: 0
    property real rectW: 1
    property real rectH: 1
    property real extra: 0                    // extra clearance when only the widget is known
    property real maxHeight: 620
    readonly property int gap: 0              // free space between the bar and the panel (0 = flush)
    readonly property real padTop: (!vertical && barAtTop) ? gap + extra : 0
    readonly property real padBottom: (!vertical && !barAtTop) ? gap + extra : 0
    readonly property real padLeft: (vertical && barAtLeft) ? gap + extra : 0
    readonly property real padRight: (vertical && !barAtLeft) ? gap + extra : 0

    function sideFromText(v) {
        var t = String(v === undefined || v === null ? "" : v).toLowerCase()
        if (t.indexOf("top") >= 0) return "top"
        if (t.indexOf("bottom") >= 0) return "bottom"
        if (t.indexOf("left") >= 0) return "left"
        if (t.indexOf("right") >= 0) return "right"
        return ""
    }

    function locate() {
        var item = root.anchorItem
        if (!item) return
        var scr = item.screen
        var sw = scr ? scr.width : 1920
        var sh = scr ? scr.height : 1080
        var side = ""
        var qsWin = null
        var win = null

        // 1. the bar window knows which edges it is attached to
        try { qsWin = item.QsWindow.window } catch (e0) { qsWin = null }
        try { win = qsWin ? qsWin : item.Window.window } catch (e1) { win = null }
        try {
            var an = win ? win.anchors : null
            if (an) {
                if (root.vertical) {
                    if (an.left && !an.right) side = "left"
                    else if (an.right && !an.left) side = "right"
                } else {
                    if (an.top && !an.bottom) side = "top"
                    else if (an.bottom && !an.top) side = "bottom"
                }
            }
        } catch (e2) { side = "" }

        // 2. the shell's bar object may say it outright
        if (side === "" && root.barObject) {
            var names = ["position", "barPosition", "edge", "side", "location", "placement", "barSide"]
            for (var i = 0; i < names.length && side === ""; i++) {
                var got = ""
                try { got = root.sideFromText(root.barObject[names[i]]) } catch (e3) { got = "" }
                if ((root.vertical && (got === "left" || got === "right"))
                        || (!root.vertical && (got === "top" || got === "bottom")))
                    side = got
            }
        }

        // 3. last resort: which half of the screen (only meaningful when the bar
        //    window is as big as the screen)
        var pos = item.mapToItem(null, 0, 0)
        if (side === "") {
            if (root.vertical) side = pos.x < sw / 2 ? "left" : "right"
            else side = pos.y < sh / 2 ? "top" : "bottom"
        }
        root.barAtTop = side === "top"
        root.barAtLeft = side === "left"

        // Anchor rectangle on the bar window's outer edge (window coordinates).
        var ww = (win && win.width > 0) ? win.width : 0
        var wh = (win && win.height > 0) ? win.height : 0
        var small = root.vertical ? (ww > 0 && ww < sw * 0.5) : (wh > 0 && wh < sh * 0.5)
        root.useRect = !!qsWin && small
        root.anchorWin = qsWin
        if (root.useRect) {
            if (root.vertical) {
                root.rectW = 1
                root.rectH = Math.max(1, item.height)
                root.rectY = pos.y
                root.rectX = side === "left" ? Math.max(0, ww - 1) : 0
            } else {
                root.rectW = Math.max(1, item.width)
                root.rectH = 1
                root.rectX = pos.x
                root.rectY = side === "top" ? Math.max(0, wh - 1) : 0
            }
            root.extra = 0
        } else {
            root.extra = 6                    // only the widget is known: allow a little for bar padding
        }

        // Tallest the panel may be and still fit between the bar and the far edge.
        var thick = (!root.vertical && wh > 0 && wh < sh * 0.5) ? wh : 40
        var room = root.vertical ? sh - 40 : sh - thick - root.gap - root.extra - 16
        root.maxHeight = Math.max(300, Math.min(680, room))
    }

    function toggle() {
        // A click on the widget while the panel is open first closes it as an
        // "outside click" (below); don't let the same click open it again.
        if (!root.visible && Date.now() - root.grabClosedAt < 500) return
        if (!root.visible) root.locate()
        root.visible = !root.visible
    }

    // ---- click outside to close -----------------------------------------------------
    // Hyprland's focus grab reports any click outside the panel. It is created at
    // runtime so a shell without that module simply keeps the X button and Esc.
    property var grab: null
    property double grabClosedAt: 0
    property double openedAt: 0
    property int grabTries: 0

    Component.onCompleted: {
        try {
            var g = Qt.createQmlObject(
                'import Quickshell.Hyprland\nHyprlandFocusGrab { }', root, "OmaudixFocusGrab")
            g.windows = [root]
            g.cleared.connect(function() {
                // A grab that ends right after opening was taken before the panel was
                // on screen: take it again instead of closing what was just opened.
                if (root.visible && Date.now() - root.openedAt < 700 && root.grabTries < 4) {
                    root.grabTries++
                    grabTimer.restart()
                    return
                }
                root.grabClosedAt = Date.now()
                root.visible = false
            })
            root.grab = g
        } catch (e) {
            root.grab = null
        }
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
    readonly property var tabs: Schema.tabs
    readonly property var defaults: Schema.defaults()

    function val(key) { return root.cfg[key] }
    function isChanged(it) { return String(root.cfg[it.key]) !== String(it.fallback) }
    function dimmed(it) { return !Schema.active(it, root.cfg) }
    function setValue(it, v) { if (root.svc) root.svc.setSetting(it.key, v) }

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

    // What the list shows: the active tab's groups, or with a search every match,
    // under the name of its tab. Headers and rows in one flat list.
    readonly property var rows: {
        const out = []
        const q = root.query.trim()
        const pick = (it) => Schema.matches(it, q) && (!root.changedOnly || root.isChanged(it))
        if (q !== "" || root.changedOnly) {
            for (const t of root.tabs) {
                let first = true
                for (const g of t.groups) for (const it of g.items) {
                    if (!pick(it)) continue
                    if (first) { out.push({ header: t.title }); first = false }
                    out.push({ item: it })
                }
            }
            return out
        }
        const t = root.tabs[root.tab]
        for (const g of t.groups) {
            out.push({ header: g.title })
            for (const it of g.items) out.push({ item: it })
        }
        return out
    }
    readonly property bool listing: root.query.trim() !== "" || root.changedOnly
    readonly property string pageKind: root.listing ? "list" : (root.tabs[root.tab].kind || "list")

    function stepTab(d) {
        root.query = ""
        root.tab = (root.tab + d + root.tabs.length) % root.tabs.length
    }

    // the colors the color modes build from, for the previews and tiles
    readonly property color themeAccent: Color.accent
    readonly property var themeColors: root.svc ? root.svc.themePalette : []
    readonly property var borderColors: root.svc ? root.svc.borderColors : []
    readonly property var coverColors: root.svc ? root.svc.coverColors : []
    function hexes(list) {
        const out = []
        for (const h of list || []) {
            const m = /^#([0-9a-fA-F]{6})$/.exec(String(h))
            if (m) out.push([parseInt(m[1].substr(0, 2), 16), parseInt(m[1].substr(2, 2), 16), parseInt(m[1].substr(4, 2), 16)])
        }
        return out
    }
    readonly property var lookColors: ({
        accent: [root.themeAccent.r * 255, root.themeAccent.g * 255, root.themeAccent.b * 255],
        palette: root.hexes(root.themeColors),
        border: root.hexes(root.borderColors),
        cover: root.coverColors
    })
    // ---- clipboard paste for text fields ---------------------------------------
    // Native paste is disabled in SettingRow. A paste request runs a fixed command
    // that reads at most `pasteMaxBytes` from the clipboard, and the text is handed
    // back to the row that asked. One paste runs at a time; extra requests are dropped.
    readonly property int pasteMaxBytes: 1024
    property var pasteRow: null
    property var pasteTarget: null

    function requestPaste(row, target) {
        if (pasteProc.running) return
        pasteRow = row
        pasteTarget = target
        pasteProc.running = true
    }

    function finishPaste(raw) {
        var row = pasteRow
        var target = pasteTarget
        pasteRow = null
        pasteTarget = null
        if (!row || !target) return
        try { row.insertPasted(target, raw) } catch (e) { }   // row may have closed mid-paste
    }

    Process {
        id: pasteProc
        running: false
        // Fixed command, no user input. timeout ends a stalled clipboard read;
        // head -c stops wl-paste early, so a huge clipboard never gets fully read.
        command: ["sh", "-c", "timeout 2 wl-paste --no-newline 2>/dev/null | head -c 1024"]
        stdout: StdioCollector {
            id: pasteOut
            onStreamFinished: root.finishPaste(pasteOut.text)
        }
    }

    // the search field pastes through the same capped read
    function insertPasted(target, raw) {
        const t = String(raw === null || raw === undefined ? "" : raw).split(/\r?\n/)[0]
        target.insert(target.cursorPosition, t)
        root.query = target.text
    }

    // ---- player list ----------------------------------------------------------
    readonly property bool preferredRunning: root.selectedId !== ""

    readonly property string activeName: {
        for (const p of root.players) if (p.id === root.activeId) return p.name
        return ""
    }

    readonly property var playerRows: {
        const rows = [{
            id: "auto", auto: true, name: "Auto", via: "", playing: false,
            sub: (root.preferredPlayer !== "auto" && root.preferredPlayer !== "" && !root.preferredRunning)
                ? "Your chosen player isn't running, following whatever plays"
                : (root.activeName !== "" ? "Follows whatever is playing \u00B7 now: " + root.activeName
                                          : "Follows whatever is playing")
        }]
        for (const q of root.players)
            rows.push({ id: q.id, auto: false, name: q.name, via: q.via, playing: q.playing,
                        sub: q.track !== "" ? q.track : "Nothing loaded" })
        return rows
    }

    function isPicked(row) {
        if (row.auto) return root.preferredPlayer === "auto" || root.preferredPlayer === "" || !root.preferredRunning
        return root.preferredRunning && row.id === root.selectedId
    }

    function pickPlayer(row) {
        if (root.store) root.store.set("player", row.id)
        if (!row.auto && root.svc) root.svc.switchTo(row.id)
    }

    // What the preview should draw.
    readonly property string previewStyle: String(root.cfg.vizStyle || "bars")
    readonly property var previewLevels: (root.levels && root.levels.length > 0)
        ? root.levels
        : (Visuals.isScope(root.previewStyle) ? root.demoScope : root.demoSpectrum)

    // ---- window geometry -------------------------------------------------------
    visible: false
    color: "transparent"
    implicitWidth: 470 + root.padLeft + root.padRight
    implicitHeight: Math.min(root.maxHeight, mainCol.implicitHeight + 28) + root.padTop + root.padBottom

    anchor.item: root.useRect ? null : root.anchorItem
    anchor.window: root.useRect ? root.anchorWin : null
    anchor.rect.x: root.rectX
    anchor.rect.y: root.rectY
    anchor.rect.width: root.rectW
    anchor.rect.height: root.rectH
    // The panel opens on the side of the anchor facing away from the bar.
    anchor.edges: root.vertical ? (root.barAtLeft ? Edges.Right : Edges.Left)
                                : (root.barAtTop ? Edges.Bottom : Edges.Top)
    anchor.gravity: root.vertical ? (root.barAtLeft ? Edges.Right : Edges.Left)
                                  : (root.barAtTop ? Edges.Bottom : Edges.Top)
    // Only slide along the bar, never across it, so the panel can't be pushed onto the bar.
    anchor.adjustment: root.vertical ? PopupAdjustment.SlideY : PopupAdjustment.SlideX

    onVisibleChanged: {
        if (!visible) {
            root.confirmReset = false
            grabTimer.stop()
            if (root.grab) root.grab.active = false
            return
        }
        root.openedAt = Date.now()
        root.grabTries = 0
        // the grab only holds once the panel is really on screen, which takes a frame
        // or two for a full page of previews
        grabTimer.restart()
    }

    Timer {
        id: grabTimer
        interval: 150
        onTriggered: if (root.grab && root.visible) root.grab.active = true
    }

    Timer { id: confirmTimer; interval: 2500; onTriggered: root.confirmReset = false }

    Shortcut {
        sequence: "Escape"
        context: Qt.WindowShortcut
        onActivated: {
            if (root.query !== "") root.query = ""
            else root.visible = false
        }
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
    Shortcut {
        sequence: "Ctrl+F"
        context: Qt.WindowShortcut
        onActivated: searchField.forceActiveFocus()
    }

    component Chip: Rectangle {
        id: chip
        property string text: ""
        property bool on: false
        signal clicked()
        implicitWidth: chipText.implicitWidth + 18
        implicitHeight: 24
        radius: 6
        color: on ? root.accent : (chipArea.containsMouse ? root.tint(0.12) : root.tint(0.06))
        Behavior on color { ColorAnimation { duration: 100 } }
        Text {
            id: chipText
            textFormat: Text.PlainText
            anchors.centerIn: parent
            text: chip.text
            color: chip.on ? root.inkOnFg : root.ink
            font.family: root.fontFamily
            font.pixelSize: 9
            font.weight: chip.on ? Font.DemiBold : Font.Normal
        }
        MouseArea {
            id: chipArea
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: chip.clicked()
        }
    }

    component Heading: Text {
        textFormat: Text.PlainText
        Layout.fillWidth: true
        color: root.ink
        opacity: 0.55
        font.family: root.fontFamily
        font.pixelSize: 8
        font.weight: Font.DemiBold
        font.letterSpacing: 1.2
        font.capitalization: Font.AllUppercase
    }

    Rectangle {
        anchors.fill: parent
        anchors.topMargin: root.padTop
        anchors.bottomMargin: root.padBottom
        anchors.leftMargin: root.padLeft
        anchors.rightMargin: root.padRight
        color: root.panelBg
        border.color: root.tint(0.14)
        border.width: 1
        radius: 12
        clip: true

        ColumnLayout {
            id: mainCol
            anchors.fill: parent
            anchors.margins: 14
            spacing: 10

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

                        Cover {
                            visible: root.cfg.showAlbumArt === true
                            Layout.preferredWidth: 52
                            Layout.preferredHeight: 52
                            corner: 8
                            source: root.albumArt
                            ink: root.ink
                            shape: String(root.cfg.coverShape)
                            spin: String(root.cfg.coverSpin)
                            spinTime: Number(root.cfg.spinTime)
                            playing: root.svc ? root.svc.playing : false
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            Layout.alignment: Qt.AlignVCenter
                            spacing: 2

                            Text {
                                textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                Layout.fillWidth: true
                                text: root.title !== "" ? root.title : "Nothing playing"
                                color: root.ink
                                font.family: root.fontFamily
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                                elide: Text.ElideRight
                            }
                            Text {
                                textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                Layout.fillWidth: true
                                text: root.title !== "" ? root.artist
                                    : "Preview uses sample data until music plays"
                                visible: text !== ""
                                color: root.ink
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
                            color: root.confirmReset ? root.accent
                                : (resetArea.containsMouse ? root.tint(0.16) : root.tint(0.08))
                            Behavior on color { ColorAnimation { duration: 100 } }

                            Text {
                                textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                id: resetLabel
                                anchors.centerIn: parent
                                text: root.confirmReset ? "Really reset?" : "Reset all"
                                color: root.confirmReset ? root.inkOnFg : root.ink
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
                                textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                anchors.centerIn: parent
                                text: "\u00D7"
                                color: root.ink
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
                            width: Visuals.isSquare(root.previewStyle) ? 28 : parent.width - 32
                            height: Visuals.isSquare(root.previewStyle) ? 28 : 26
                            levels: root.previewLevels
                            vizStyle: root.previewStyle
                            orient: String(root.cfg.vizLeftOrient)
                            customColor2: String(root.cfg.customColor2)
                            accent: root.themeAccent
                            themeColors: root.themeColors
                            borderColors: root.borderColors
                            coverColors: root.coverColors
                            colorMode: String(root.cfg.colorMode)
                            customColor: String(root.cfg.customColor)
                            foreground: root.fg
                            count: Number(root.cfg.barCount)
                        }
                    }
                }
            }


            // ---- search + changed only ---------------------------------------------
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 26
                    radius: 6
                    color: root.tint(0.06)
                    border.width: 1
                    border.color: searchField.activeFocus ? root.accent : root.tint(0.12)

                    Text {
                        textFormat: Text.PlainText
                        anchors.left: parent.left
                        anchors.leftMargin: 9
                        anchors.verticalCenter: parent.verticalCenter
                        visible: searchField.text === "" && !searchField.activeFocus
                        text: "Search every setting (Ctrl+F)"
                        color: root.ink
                        opacity: 0.4
                        font.family: root.fontFamily
                        font.pixelSize: 9
                    }
                    SafeField {
                        id: searchField
                        anchors.fill: parent
                        anchors.leftMargin: 9
                        anchors.rightMargin: 24
                        maxChars: 40
                        color: root.ink
                        selectionColor: root.accentTint(0.35)
                        fontFamily: root.fontFamily
                        fontPixelSize: 10
                        onTextChanged: root.query = text
                        onPasteRequested: root.requestPaste(root, searchField)
                        Binding on text { when: !searchField.activeFocus; value: root.query }
                    }
                    Text {
                        textFormat: Text.PlainText
                        visible: root.query !== ""
                        anchors.right: parent.right
                        anchors.rightMargin: 8
                        anchors.verticalCenter: parent.verticalCenter
                        text: "\u00D7"
                        color: root.ink
                        font.pixelSize: 13
                        MouseArea {
                            anchors.fill: parent
                            anchors.margins: -4
                            cursorShape: Qt.PointingHandCursor
                            onClicked: { root.query = ""; searchField.text = "" }
                        }
                    }
                }
                Chip {
                    text: "Changed only"
                    on: root.changedOnly
                    onClicked: root.changedOnly = !root.changedOnly
                }
            }

            // ---- tabs --------------------------------------------------------------
            Flow {
                Layout.fillWidth: true
                spacing: 4
                opacity: root.listing ? 0.45 : 1

                Repeater {
                    model: root.tabs
                    delegate: Chip {
                        required property var modelData
                        required property int index
                        text: modelData.title
                        on: !root.listing && index === root.tab
                        onClicked: { root.query = ""; root.changedOnly = false; root.tab = index }
                    }
                }
            }

            // ---- the page ------------------------------------------------------------
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
                    implicitHeight: rowsCol.implicitHeight + 8
                    radius: 10
                    color: root.tint(0.035)
                    border.width: 1
                    border.color: root.tint(0.07)

                    ColumnLayout {
                        id: rowsCol
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.leftMargin: 14
                        anchors.rightMargin: 14
                        anchors.topMargin: 4
                        spacing: 0

                        // ---- Looks ---------------------------------------------------------
                        LooksPage {
                            visible: root.pageKind === "looks"
                            Layout.fillWidth: true
                            Layout.preferredWidth: rowsCol.width
                            Layout.maximumWidth: rowsCol.width
                            Layout.topMargin: 12
                            Layout.bottomMargin: 12
                            svc: root.svc
                            cfg: root.cfg
                            fg: root.fg
                            ink: root.ink
                            accent: root.accent
                            inkOnFg: root.inkOnFg
                            fontFamily: root.fontFamily
                            levels: root.demoSpectrum
                            colorCtx: root.lookColors
                        }

                    // ---- Player tab ----------------------------------------------
                    ColumnLayout {
                        visible: root.query === "" && root.tabs[root.tab].kind === "players"
                        Layout.fillWidth: true
                        Layout.topMargin: 12
                        Layout.bottomMargin: 12
                        spacing: 6

                        Text {
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            Layout.fillWidth: true
                            text: "Follow which player?"
                            color: root.ink
                            font.family: root.fontFamily
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }
                        Text {
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            Layout.fillWidth: true
                            Layout.bottomMargin: 4
                            text: "Pick one to pause the others and play it. Auto just follows whatever is playing."
                            color: root.ink
                            opacity: 0.55
                            font.family: root.fontFamily
                            font.pixelSize: 8
                            wrapMode: Text.Wrap
                        }

                        Repeater {
                            model: root.query === "" && root.tabs[root.tab].kind === "players" ? root.playerRows : []

                            delegate: Rectangle {
                                readonly property bool picked: root.isPicked(modelData)
                                readonly property bool onBar: !modelData.auto && modelData.id === root.activeId
                                Layout.fillWidth: true
                                Layout.preferredHeight: 46
                                Layout.minimumHeight: 46
                                implicitHeight: 46
                                clip: true
                                radius: 8
                                color: picked ? root.accentTint(0.18) : (pArea.containsMouse ? root.tint(0.09) : root.tint(0.04))
                                border.width: picked ? 1.5 : 1
                                border.color: picked ? root.accent : root.tint(0.08)
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
                                    border.color: picked ? root.accent : root.tint(0.4)
                                    Rectangle {
                                        anchors.centerIn: parent
                                        width: 6; height: 6; radius: 3
                                        color: root.accent
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
                                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                            text: modelData.name
                                            color: root.ink
                                            font.family: root.fontFamily
                                            font.pixelSize: 10
                                            font.weight: Font.DemiBold
                                            elide: Text.ElideRight
                                            Layout.fillWidth: modelData.via === ""
                                            Layout.maximumWidth: Math.max(40, rowText.width - viaText.implicitWidth - 8)
                                        }
                                        Text {
                                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                            id: viaText
                                            visible: modelData.via !== ""
                                            text: "via " + modelData.via
                                            color: root.ink
                                            opacity: 0.45
                                            font.family: root.fontFamily
                                            font.pixelSize: 8
                                        }
                                        Item { Layout.fillWidth: true }
                                    }
                                    Text {
                                        textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                        Layout.fillWidth: true
                                        text: modelData.sub
                                        color: root.ink
                                        opacity: 0.55
                                        font.family: root.fontFamily
                                        font.pixelSize: 8
                                        elide: Text.ElideRight
                                    }
                                }

                                Text {
                                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                                    id: stateText
                                    anchors.right: parent.right
                                    anchors.rightMargin: 10
                                    anchors.verticalCenter: parent.verticalCenter
                                    visible: !modelData.auto
                                    text: modelData.playing ? "\u25CF Playing" : "Paused"
                                    color: root.ink
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
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            Layout.fillWidth: true
                            visible: root.players.length === 0
                            text: "No players found. Start Spotify, YouTube Music, cliamp, a radio app, or play something in a browser and it will show up here."
                            color: root.ink
                            opacity: 0.55
                            font.family: root.fontFamily
                            font.pixelSize: 8
                            wrapMode: Text.Wrap
                        }
                        Text {
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            Layout.fillWidth: true
                            Layout.topMargin: 4
                            text: "The visualizer listens to your system output, so it reacts to whatever is audible, not only the selected player."
                            color: root.ink
                            opacity: 0.4
                            font.family: root.fontFamily
                            font.pixelSize: 8
                            wrapMode: Text.Wrap
                        }
                    }

                        // ---- settings rows -------------------------------------------------
                        Repeater {
                            model: root.pageKind === "looks" ? [] : root.rows

                            delegate: ColumnLayout {
                                id: entry
                                required property var modelData
                                required property int index
                                Layout.fillWidth: true
                                spacing: 0

                                Heading {
                                    visible: !!entry.modelData.header
                                    Layout.topMargin: entry.index > 0 ? 16 : 12
                                    Layout.bottomMargin: 2
                                    text: entry.modelData.header || ""
                                }

                                Rectangle {
                                    visible: !!entry.modelData.item && entry.index > 0 && !root.rows[entry.index - 1].header
                                    Layout.fillWidth: true
                                    implicitHeight: 1
                                    color: root.tint(0.07)
                                }

                                SettingRow {
                                    id: settingRow
                                    readonly property var it: entry.modelData.item || ({ key: "", label: "", kind: "", fallback: null })
                                    visible: !!entry.modelData.item
                                    Layout.fillWidth: true
                                    Layout.topMargin: 12
                                    Layout.bottomMargin: 12

                                    label: it.label
                                    hint: it.hint || ""
                                    kind: it.kind
                                    options: it.options || []
                                    labels: it.labels || ({})
                                    abouts: it.abouts || ({})
                                    presets: it.presets || []
                                    maxLength: it.maxLength !== undefined ? it.maxLength : 256
                                    min: it.min !== undefined ? it.min : 0
                                    max: it.max !== undefined ? it.max : 100
                                    step: it.step !== undefined ? it.step : 1
                                    divisor: it.divisor !== undefined ? it.divisor : 1
                                    decimals: it.decimals !== undefined ? it.decimals : 0
                                    defaultValue: it.fallback
                                    dimmed: entry.modelData.item ? root.dimmed(it) : false
                                    value: root.cfg[it.key]

                                    fg: root.ink
                                    accent: root.accent
                                    bg: root.inkOnFg
                                    panel: root.panelSolid
                                    barFg: root.fg
                                    fontFamily: root.fontFamily
                                    customColor: String(root.cfg.customColor)
                                    customColor2: String(root.cfg.customColor2)
                                    accentColor: root.themeAccent
                                    themeColors: root.themeColors
                                    borderColors: root.borderColors
                                    coverColors: root.coverColors
                                    schemeAccent: root.themeAccentColor ? root.themeAccentColor : root.accent
                                    schemeBg: root.themeBgColor ? root.themeBgColor : root.panelSolid
                                    schemeCustom: root.customAccentColor ? root.customAccentColor : root.accent
                                    schemeNeutral: Qt.rgba(root.neutralBg.r, root.neutralBg.g, root.neutralBg.b, 1)
                                    schemeMono: root.neutralInk
                                    demoSpectrum: root.demoSpectrum
                                    demoScope: root.demoScope

                                    onEdited: function(v) { root.setValue(settingRow.it, v) }
                                    onClipboardPaste: function(target, maxBytes) { root.requestPaste(settingRow, target) }
                                }
                            }
                        }

                        Text {
                            textFormat: Text.PlainText
                            visible: root.listing && root.rows.length === 0
                            Layout.fillWidth: true
                            Layout.topMargin: 14
                            Layout.bottomMargin: 14
                            text: root.changedOnly && root.query.trim() === "" ? "Everything is at its default." : "No setting matches that."
                            color: root.ink
                            opacity: 0.5
                            font.family: root.fontFamily
                            font.pixelSize: 9
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
                        textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                        id: escLabel
                        anchors.centerIn: parent
                        text: "Esc"
                        color: root.ink
                        opacity: 0.75
                        font.family: root.fontFamily
                        font.pixelSize: 8
                    }
                }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: "close"
                    color: root.ink
                    opacity: 0.45
                    font.family: root.fontFamily
                    font.pixelSize: 8
                }
                Item { Layout.fillWidth: true }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: "Changes apply instantly and are saved"
                    color: root.ink
                    opacity: 0.45
                    font.family: root.fontFamily
                    font.pixelSize: 8
                }
            }
        }
    }
}
