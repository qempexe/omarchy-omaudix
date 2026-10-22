.pragma library

// The song's cover, made safe to show. Players hand over a cover as an address
// (https:// or http://) or a local file (file://). Neither is shown as it is:
//   * an address is downloaded by curl, with a size cap (8 MiB) and a time limit
//   * the download, or the local file, is made into a small PNG (at most 256 by 256,
//     no metadata) by vipsthumbnail, in its own process, under prlimit: 512 MiB of
//     memory and 10 seconds of processor at most, with only plain image loaders
//     (VIPS_BLOCK_UNTRUSTED=1) and one worker thread (VIPS_CONCURRENCY=1), so it
//     stays inside that memory however many cores the machine has
// Only that PNG is ever decoded in the shell. A cover built to swell up while it
// downloads or decodes can then only stop its own helper.

var MAX_BYTES = 8 * 1048576;
var MEMORY = 536870912;
var KEEP = 24;

// what a player's cover address is: { web: url } or { file: path }, or null
function parse(url) {
    const s = String(url || "");
    if (s.length === 0 || s.length > 2048 || /[\s\0]/.test(s)) return null;
    if (/^https?:\/\/[^\/\s]+/i.test(s)) return { web: s };
    const m = /^file:\/\/(\/.*)$/.exec(s);
    if (m) {
        let p;
        try { p = decodeURIComponent(m[1]); } catch (e) { return null; }
        // brackets would be read by vips as options, and .. has no business here
        if (/[\0\[\]]/.test(p) || /(^|\/)\.\.(\/|$)/.test(p)) return null;
        return { file: p };
    }
    return null;
}

// a stable file name for a cover address: two 32-bit hashes
function nameOf(url) {
    const s = String(url || "");
    let a = 0x811c9dc5, b = 5381;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        a = Math.imul(a ^ c, 16777619) >>> 0;
        b = (Math.imul(b, 33) + c) >>> 0;
    }
    const hex = (n) => ("00000000" + n.toString(16)).slice(-8);
    return hex(a) + hex(b);
}

function isName(n) { return /^[0-9a-f]{16}$/.test(String(n)); }

function curlArgs(url, out) {
    const p = parse(url);
    if (!p || !p.web || !/^\/[^\0\[\]]*\/[0-9a-f]{16}\.img$/.test(String(out))) return null;
    return ["curl", "-q", "--fail", "--silent", "--show-error", "--location", "--max-redirs", "3",
            "--proto", "=https,http", "--proto-redir", "=https,http", "--max-time", "15",
            "--max-filesize", String(MAX_BYTES), "-o", out, "--url", p.web];
}

function thumbArgs(src, out) {
    if (!/^\/[^\0\[\]]*$/.test(String(src)) || !/^\/[^\0\[\]]*\/[0-9a-f]{16}\.png$/.test(String(out))) return null;
    return ["prlimit", "--as=" + MEMORY, "--cpu=10", "--",
            "vipsthumbnail", src, "--size", "256x256", "-o", out + "[keep=none]"];
}
