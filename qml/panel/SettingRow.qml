import QtQuick
import QtQuick.Layouts
import "../bar"
import "../js/Visuals.js" as Visuals
import "../js/Style.js" as PlateStyle
import "../js/Paint.js" as Paint

// One setting in the popup: a label + plain-language hint on the left, the
// current value / reset on the right, and a purpose-built control underneath.
//
//   kind  enum    segmented control (<= 4 options) or wrapping chips
//         viz     tile picker, each tile draws the real visualizer style
//         colors  tile picker, each tile draws the real color mode
//         scheme  tile picker for the panel's own colors (theme / custom / mono)
//         int     slider with - / + nudge buttons and a "default" notch
//         bool    switch
//         string  text field (+ optional preset chips)
//         color   swatch palette + hex field
//
// Text and soft tints come from `fg`; selected / filled parts use `accent`
// (the theme accent, a custom color, or `fg` in monochrome). Numbers are shown plain: no px / ms / % suffixes.
//
// Text fields are SafeField items, never TextInput: a TextInput watches the
// clipboard and reads foreign data on every clipboard change (to compute
// canPaste), unbounded, with no way to turn that off. SafeField has no clipboard
// connection at all. Paste requests are emitted as
// `clipboardPaste(target, maxBytes)`; the owner must read at most `maxBytes`
// and then call `insertPasted(target, text)`.
Item {
    id: root

    property string label: ""
    property string hint: ""
    property string kind: "string"
    property var options: []
    property var labels: ({})          // option -> friendly text
    property var abouts: ({})          // option -> one line about it, shown for the picked one
    property string styleKey: ""       // style tiles: which setting they change
    property var styleCfg: ({})        // style tiles: every setting, so a tile shows the plate as it would become
    property var stylePal: null        // style tiles: { bg, fg, ac, border, borderAngle }
    property var presets: []           // string chips / color palette
    property var value: null
    property var defaultValue: null
    property real min: 0
    property real max: 100
    property real step: 1
    property real divisor: 1           // display value = value / divisor
    property int decimals: 0
    property bool dimmed: false        // setting currently has no effect
    property color fg: "white"
    property color accent: fg          // selected / filled parts
    property color bg: "black"         // text drawn on top of an accent fill
    property color panel: "black"      // opaque popup background
    property color barFg: fg           // bar foreground, for the visualizer tiles
    property color schemeAccent: "#7aa2f7"   // swatches for the scheme tiles
    property color schemeBg: "#1a1b26"
    property color schemeCustom: "#7aa2f7"
    property color schemeNeutral: "#121216"  // monochrome / custom panel background
    property color schemeMono: "#f2f2f4"     // monochrome ink
    property string fontFamily: ""
    property color customColor: "#7aa2f7"
    property string customColor2: "#f7768e"
    property color accentColor: accent
    property var themeColors: []
    property var borderColors: []
    property var coverColors: []
    property var demoSpectrum: []
    property var demoScope: []

    // Byte cap for any clipboard read triggered from a text field.
    property int pasteMaxBytes: 1024
    property int maxLength: 256        // text fields: max characters stored

    signal edited(var v)
    signal clipboardPaste(var target, int maxBytes)

    // ---- helpers -----------------------------------------------------------
    function tint(a) { return Qt.rgba(fg.r, fg.g, fg.b, a) }
    function accentTint(a) { return Qt.rgba(accent.r, accent.g, accent.b, a) }
    function str(v) { return (v === null || v === undefined) ? "" : String(v) }
    function same(a, b) { return str(a) === str(b) }
    function labelFor(opt) { return labels[opt] !== undefined ? labels[opt] : String(opt) }
    function show(v) {
        var n = Number(v) / divisor
        if (!isFinite(n)) return "?"
        return String(parseFloat(n.toFixed(decimals)))
    }
    function clamp01(t) { return Math.max(0, Math.min(1, t)) }
    function nudge(dir) {
        var cur = Number(value)
        var v = Math.max(min, Math.min(max, cur + dir * step))
        if (v !== cur) edited(v)
    }

    // Requests a capped clipboard read for `target`; the owner answers via insertPasted().
    function boundedPaste(target) { clipboardPaste(target, pasteMaxBytes) }

    // Owner calls this with the capped text. Single line only, inserted at the cursor.
    function insertPasted(target, raw) {
        if (!target) return
        var t = String(raw === null || raw === undefined ? "" : raw).split(/\r?\n/)[0]
        target.insert(target.cursorPosition, t)
    }

    readonly property bool boolValue: value === true || value === "true"
    readonly property bool atDefault: defaultValue === null || same(value, defaultValue)
    readonly property real span: Math.max(1e-9, max - min)
    readonly property real frac: clamp01((Number(value) - min) / span)
    readonly property real defFrac: clamp01((Number(defaultValue) - min) / span)
    readonly property bool useSegments: kind === "enum" && options.length <= 4

    implicitWidth: 400
    implicitHeight: col.implicitHeight
    opacity: dimmed ? 0.4 : 1.0
    Behavior on opacity { NumberAnimation { duration: 140 } }

    // Small square button used for - / + and reset.
    component IconButton: Rectangle {
        id: btn
        property string glyph: ""
        property color ink: "white"
        signal clicked()
        implicitWidth: 22
        implicitHeight: 22
        radius: 6
        color: area.containsMouse
            ? Qt.rgba(ink.r, ink.g, ink.b, 0.18)
            : Qt.rgba(ink.r, ink.g, ink.b, 0.08)
        Text {
            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
            anchors.centerIn: parent
            text: btn.glyph
            color: btn.ink
            font.family: root.fontFamily
            font.pixelSize: 11
        }
        MouseArea {
            id: area
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: btn.clicked()
        }
    }

    ColumnLayout {
        id: col
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        spacing: 9

        // ---- head: label + hint | value / switch / reset -------------------
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    Layout.fillWidth: true
                    text: root.label
                    color: root.fg
                    font.family: root.fontFamily
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                    elide: Text.ElideRight
                }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    Layout.fillWidth: true
                    text: root.hint
                    visible: root.hint !== ""
                    color: root.fg
                    opacity: 0.55
                    font.family: root.fontFamily
                    font.pixelSize: 8
                    wrapMode: Text.Wrap
                }
            }

            // numeric stepper
            RowLayout {
                visible: root.kind === "int"
                spacing: 4
                Layout.alignment: Qt.AlignTop

                IconButton { glyph: "\u2212"; ink: root.fg; onClicked: root.nudge(-1) }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    Layout.preferredWidth: 34
                    horizontalAlignment: Text.AlignHCenter
                    text: root.show(root.value)
                    color: root.fg
                    font.family: root.fontFamily
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                }
                IconButton { glyph: "+"; ink: root.fg; onClicked: root.nudge(1) }
            }

            // switch
            Rectangle {
                visible: root.kind === "bool"
                Layout.alignment: Qt.AlignTop
                implicitWidth: 40
                implicitHeight: 22
                radius: 11
                color: root.boolValue ? root.accent : root.tint(0.14)
                Behavior on color { ColorAnimation { duration: 120 } }

                Rectangle {
                    width: 16; height: 16; radius: 8
                    y: 3
                    x: root.boolValue ? parent.width - width - 3 : 3
                    color: root.boolValue ? root.bg : root.tint(0.75)
                    Behavior on x { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.edited(!root.boolValue)
                }
            }

            // back to default (only when changed)
            IconButton {
                visible: !root.atDefault
                Layout.alignment: Qt.AlignTop
                glyph: "\u21BA"
                ink: root.fg
                onClicked: root.edited(root.defaultValue)
            }
        }

        // ---- enum: segmented control ----------------------------------------
        Rectangle {
            visible: root.useSegments
            Layout.fillWidth: true
            implicitHeight: 28
            radius: 7
            color: root.tint(0.06)
            border.width: 1
            border.color: root.tint(0.08)

            RowLayout {
                anchors.fill: parent
                anchors.margins: 3
                spacing: 2

                Repeater {
                    model: root.useSegments ? root.options : []
                    delegate: Rectangle {
                        readonly property bool on: root.same(root.value, modelData)
                        Layout.fillWidth: true
                        Layout.preferredWidth: 1
                        Layout.fillHeight: true
                        radius: 6
                        color: on ? root.accent : (seg.containsMouse ? root.tint(0.10) : "transparent")
                        Behavior on color { ColorAnimation { duration: 100 } }

                        Text {
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            anchors.centerIn: parent
                            width: parent.width - 8
                            horizontalAlignment: Text.AlignHCenter
                            elide: Text.ElideRight
                            text: root.labelFor(modelData)
                            color: parent.on ? root.bg : root.fg
                            font.family: root.fontFamily
                            font.pixelSize: 9
                            font.weight: parent.on ? Font.DemiBold : Font.Normal
                        }
                        MouseArea {
                            id: seg
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.edited(modelData)
                        }
                    }
                }
            }
        }

        // ---- enum with many options: wrapping chips --------------------------
        Flow {
            visible: root.kind === "enum" && !root.useSegments
            Layout.fillWidth: true
            spacing: 6

            Repeater {
                model: (root.kind === "enum" && !root.useSegments) ? root.options : []
                delegate: Rectangle {
                    readonly property bool on: root.same(root.value, modelData)
                    implicitWidth: chipText.implicitWidth + 20
                    implicitHeight: 26
                    radius: 6
                    color: on ? root.accent : root.tint(0.07)
                    Text {
                        textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                        id: chipText
                        anchors.centerIn: parent
                        text: root.labelFor(modelData)
                        color: parent.on ? root.bg : root.fg
                        font.family: root.fontFamily
                        font.pixelSize: 9
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.edited(modelData)
                    }
                }
            }
        }

        // ---- viz / colors: tiles that draw the real thing --------------------
        GridLayout {
            visible: root.kind === "viz" || root.kind === "colors" || root.kind === "scheme"
            Layout.fillWidth: true
            columns: root.kind === "scheme" ? 3 : 4
            columnSpacing: 8
            rowSpacing: 8

            Repeater {
                model: (root.kind === "viz" || root.kind === "colors" || root.kind === "scheme") ? root.options : []
                delegate: Rectangle {
                    id: tile
                    readonly property bool on: root.same(root.value, modelData)
                    readonly property bool isRing: root.kind === "viz" && Visuals.isSquare(modelData)
                    Layout.preferredWidth: Math.floor((root.width - (root.kind === "scheme" ? 16 : 24)) / (root.kind === "scheme" ? 3 : 4))
                    Layout.preferredHeight: root.kind === "scheme" ? 62 : 54
                    radius: 8
                    color: on ? root.accentTint(0.16) : (tileArea.containsMouse ? root.tint(0.10) : root.tint(0.05))
                    border.width: on ? 1.5 : 1
                    border.color: on ? root.accent : root.tint(0.10)
                    Behavior on color { ColorAnimation { duration: 100 } }

                    Visualizer {
                        visible: root.kind !== "scheme"
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: 9
                        width: tile.isRing ? 24 : parent.width - 24
                        height: 24
                        levels: (root.kind === "viz" && Visuals.isScope(modelData))
                            ? root.demoScope : root.demoSpectrum
                        vizStyle: root.kind === "viz" ? modelData : "bars"
                        colorMode: root.kind === "colors" ? modelData : "theme"
                        customColor: root.customColor
                        customColor2: root.customColor2
                        accent: root.accentColor
                        themeColors: root.themeColors
                        borderColors: root.borderColors
                        coverColors: root.coverColors
                        foreground: root.barFg
                        count: 10
                    }

                    // scheme tile: a miniature panel drawn in that scheme
                    Rectangle {
                        visible: root.kind === "scheme"
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: 8
                        width: parent.width - 20
                        height: 30
                        radius: 5
                        color: modelData === "theme" ? root.schemeBg
                             : root.schemeNeutral
                        border.width: 1
                        border.color: root.tint(0.14)
                        readonly property color swatch: modelData === "theme" ? root.schemeAccent
                            : (modelData === "custom" ? root.schemeCustom
                               : root.schemeMono)

                        Rectangle {   // fake selected segment
                            x: 6; y: 6; width: 16; height: 7; radius: 3
                            color: parent.swatch
                        }
                        Rectangle {   // fake slider track + fill
                            x: 6; y: 18; width: parent.width - 12; height: 4; radius: 2
                            color: Qt.rgba(root.schemeMono.r, root.schemeMono.g, root.schemeMono.b, 0.18)
                            Rectangle {
                                width: parent.width * 0.55; height: parent.height; radius: 2
                                color: parent.parent.swatch
                            }
                        }
                    }
                    Text {
                        textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        anchors.bottomMargin: 7
                        text: root.labelFor(modelData)
                        color: root.fg
                        opacity: tile.on ? 1.0 : 0.7
                        font.family: root.fontFamily
                        font.pixelSize: 8
                        font.weight: tile.on ? Font.DemiBold : Font.Normal
                    }
                    MouseArea {
                        id: tileArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.edited(modelData)
                    }
                }
            }
        }

        // style tiles: a little plate drawn the way that option draws it
        GridLayout {
            visible: root.kind === "style"
            Layout.fillWidth: true
            columns: 4
            columnSpacing: 8
            rowSpacing: 8

            Repeater {
                model: root.kind === "style" ? root.options : []
                delegate: Rectangle {
                    id: stile
                    required property var modelData
                    readonly property bool on: root.same(root.value, modelData)
                    Layout.preferredWidth: Math.floor((root.width - 24) / 4)
                    Layout.preferredHeight: 50
                    radius: 8
                    color: on ? root.accentTint(0.16) : (stileArea.containsMouse ? root.tint(0.10) : root.tint(0.05))
                    border.width: on ? 1.5 : 1
                    border.color: on ? root.accent : root.tint(0.10)
                    Behavior on color { ColorAnimation { duration: 100 } }

                    Canvas {
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: 5
                        width: parent.width - 10
                        height: 26
                        renderTarget: Canvas.Image
                        // the plate with this one option changed
                        readonly property var cfgHere: {
                            const out = Object.assign({}, root.styleCfg || ({}))
                            out[root.styleKey] = stile.modelData
                            out.radius = Math.min(typeof out.radius === "number" ? out.radius : 8, 7)
                            if (out.shadow === "strong") out.shadow = "soft"
                            return out
                        }
                        readonly property string key: JSON.stringify([cfgHere, root.stylePal, width, height])
                        onKeyChanged: requestPaint()
                        onVisibleChanged: if (visible) requestPaint()
                        onPaint: {
                            const ctx = getContext("2d")
                            if (!root.stylePal) { ctx.reset(); return }
                            const m = 4
                            Paint.paint(ctx, PlateStyle.params(cfgHere, root.stylePal, width, height, m, "top"))
                            // a few bars, so it reads as the widget
                            const fg = root.barFg
                            ctx.fillStyle = Qt.rgba(fg.r, fg.g, fg.b, 0.6)
                            const hs = [0.4, 0.75, 0.55, 0.9, 0.5, 0.3]
                            for (let i = 0; i < hs.length; i++) {
                                const bh = hs[i] * 8
                                ctx.fillRect(width / 2 - 11 + i * 4, height / 2 + 4 - bh, 2.5, bh)
                            }
                        }
                    }

                    Text {
                        textFormat: Text.PlainText
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        anchors.bottomMargin: 5
                        width: parent.width - 6
                        horizontalAlignment: Text.AlignHCenter
                        elide: Text.ElideRight
                        text: root.labelFor(stile.modelData)
                        color: root.fg
                        opacity: stile.on ? 1.0 : 0.7
                        font.family: root.fontFamily
                        font.pixelSize: 8
                        font.weight: stile.on ? Font.DemiBold : Font.Normal
                    }
                    MouseArea {
                        id: stileArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.edited(stile.modelData)
                    }
                }
            }
        }

        // what the picked tile does
        Text {
            textFormat: Text.PlainText
            visible: (root.kind === "viz" || root.kind === "colors" || root.kind === "style") && text !== ""
            Layout.fillWidth: true
            text: root.abouts && root.abouts[root.str(root.value)] ? root.labelFor(root.value) + ": " + root.abouts[root.str(root.value)] : ""
            color: root.fg
            opacity: 0.6
            font.family: root.fontFamily
            font.pixelSize: 8
            wrapMode: Text.Wrap
        }

        // ---- int: slider ---------------------------------------------------------
        ColumnLayout {
            visible: root.kind === "int"
            Layout.fillWidth: true
            spacing: 1

            Item {
                id: slider
                Layout.fillWidth: true
                implicitHeight: 22
                readonly property real knob: 16

                Rectangle {
                    id: track
                    anchors.verticalCenter: parent.verticalCenter
                    width: parent.width
                    height: 6
                    radius: 3
                    color: root.tint(0.12)

                    Rectangle {
                        width: handle.x + handle.width / 2
                        height: parent.height
                        radius: parent.radius
                        color: root.accent
                    }
                }
                // small notch marking where the default sits
                Rectangle {
                    visible: root.defaultValue !== null
                    width: 2; height: 12; radius: 1
                    x: (slider.width - slider.knob) * root.defFrac + slider.knob / 2 - 1
                    anchors.verticalCenter: parent.verticalCenter
                    color: root.tint(0.35)
                }
                Rectangle {
                    id: handle
                    width: slider.knob; height: slider.knob; radius: slider.knob / 2
                    x: (slider.width - width) * root.frac
                    anchors.verticalCenter: parent.verticalCenter
                    color: root.accent
                    border.width: 3
                    border.color: root.panel
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    function apply(mx) {
                        var room = Math.max(1, slider.width - slider.knob)
                        var t = Math.max(0, Math.min(1, (mx - slider.knob / 2) / room))
                        var v = root.min + t * (root.max - root.min)
                        v = Math.round((v - root.min) / root.step) * root.step + root.min
                        v = Math.max(root.min, Math.min(root.max, v))
                        // only report real changes, so dragging doesn't spam the config
                        if (v !== Number(root.value)) root.edited(v)
                    }
                    onPressed: function(m) { apply(m.x) }
                    onPositionChanged: function(m) { if (pressed) apply(m.x) }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: root.show(root.min)
                    color: root.fg; opacity: 0.4
                    font.family: root.fontFamily; font.pixelSize: 8
                }
                Item { Layout.fillWidth: true }
                Text {
                    textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                    text: root.show(root.max)
                    color: root.fg; opacity: 0.4
                    font.family: root.fontFamily; font.pixelSize: 8
                }
            }
        }

        // ---- string: field + preset chips ----------------------------------------
        RowLayout {
            visible: root.kind === "string"
            Layout.fillWidth: true
            spacing: 8

            Rectangle {
                Layout.preferredWidth: root.presets.length > 0 ? 90 : 200
                Layout.fillWidth: root.presets.length === 0
                implicitHeight: 26
                radius: 6
                color: root.tint(0.06)
                border.width: 1
                border.color: textIn.activeFocus ? root.accent : root.tint(0.12)

                SafeField {
                    id: textIn

                    maxChars: root.maxLength

                    onPasteRequested: root.boundedPaste(textIn)
                    anchors.fill: parent
                    anchors.leftMargin: 9
                    anchors.rightMargin: 9
                    color: root.fg
                    selectionColor: root.accentTint(0.35)
                    fontFamily: root.fontFamily
                    fontPixelSize: 10
                    onEditingFinished: root.edited(text)
                    // mirror the store unless the user is typing
                    Binding on text {
                        when: !textIn.activeFocus
                        value: root.str(root.value)
                    }
                }
            }

            Flow {
                visible: root.presets.length > 0
                Layout.fillWidth: true
                spacing: 4

                Repeater {
                    model: root.kind === "string" ? root.presets : []
                    delegate: Rectangle {
                        readonly property bool on: root.same(root.value, modelData)
                        implicitWidth: 28
                        implicitHeight: 28
                        radius: 6
                        color: on ? root.accent : (pArea.containsMouse ? root.tint(0.14) : root.tint(0.07))
                        Text {
                            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
                            anchors.centerIn: parent
                            text: String(modelData).trim() === "" ? "\u2423" : String(modelData).trim()
                            color: parent.on ? root.bg : root.fg
                            font.family: root.fontFamily
                            font.pixelSize: 11
                        }
                        MouseArea {
                            id: pArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.edited(modelData)
                        }
                    }
                }
            }
        }

        // ---- color: palette + hex field ------------------------------------------
        ColumnLayout {
            visible: root.kind === "color"
            Layout.fillWidth: true
            spacing: 8

            Flow {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: root.kind === "color" ? root.presets : []
                    delegate: Rectangle {
                        readonly property bool on: root.str(root.value).toLowerCase() === String(modelData).toLowerCase()
                        width: 24; height: 24; radius: 12
                        color: modelData
                        border.width: on ? 2 : 1
                        border.color: on ? root.fg : root.tint(0.2)
                        scale: cArea.containsMouse ? 1.12 : 1.0
                        Behavior on scale { NumberAnimation { duration: 90 } }
                        MouseArea {
                            id: cArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.edited(modelData)
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Rectangle {
                    readonly property bool valid: /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(root.str(root.value))
                    width: 28; height: 28; radius: 6
                    color: valid ? root.str(root.value) : "transparent"
                    border.width: 1
                    border.color: root.tint(0.25)
                }
                Rectangle {
                    Layout.preferredWidth: 110
                    implicitHeight: 28
                    radius: 6
                    color: root.tint(0.06)
                    border.width: 1
                    border.color: hexIn.activeFocus ? root.accent : root.tint(0.12)

                    SafeField {
                        id: hexIn

                        maxChars: 9          // '#' + 8 hex digits

                        onPasteRequested: root.boundedPaste(hexIn)
                        anchors.fill: parent
                        anchors.leftMargin: 9
                        anchors.rightMargin: 9
                        color: root.fg
                        selectionColor: root.accentTint(0.35)
                        fontFamily: root.fontFamily
                        fontPixelSize: 10
                        onEditingFinished: root.edited(text)
                        Binding on text {
                            when: !hexIn.activeFocus
                            value: root.str(root.value)
                        }
                    }
                }
                Item { Layout.fillWidth: true }
            }
        }
    }
}
