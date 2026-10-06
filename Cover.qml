import QtQuick

// Small cover-art thumbnail for the bar. Shows a music note while there is no
// cover; while a new cover loads it keeps a quiet tinted tile instead of
// flashing the note.
Rectangle {
    id: root

    property string source: ""
    property color ink: "white"

    radius: 3
    clip: true
    color: Qt.rgba(ink.r, ink.g, ink.b, 0.10)

    Image {
        id: img
        anchors.fill: parent
        source: root.source
        fillMode: Image.PreserveAspectCrop
        asynchronous: true
        cache: true
        sourceSize.width: 96
        sourceSize.height: 96
        visible: root.source !== "" && status === Image.Ready
    }

    Text {
        anchors.centerIn: parent
        visible: root.source === ""
        text: "♫"
        color: root.ink
        opacity: 0.6
        font.pixelSize: Math.max(8, Math.round(root.height * 0.6))
    }
}
