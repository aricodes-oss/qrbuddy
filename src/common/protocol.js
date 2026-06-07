// Shared (phone-side) constants + helpers for the chunked config transfer.
// Bundled into the PebbleKit JS app by wscript (src/common/**/*.js), which uses
// a CommonJS module system (require/module.exports).
//
// The whole config object { labelPosition, entries } is JSON-serialized and split
// into CHUNK_SIZE-byte pieces. Each piece is one AppMessage; keys are fixed so an
// arbitrary number/size of entries never needs new message keys.

var PROTO_VER = 1;

// Conservative: the Pebble inbox is small. Lower this if large lists fail to send.
// Measured in UTF-8 *bytes* on the wire, not JS string length — non-ASCII text
// (emoji, accented chars, CJK) is multi-byte once encoded.
var CHUNK_SIZE = 256;

// UTF-8 encoded byte length of a Unicode code point.
function utf8Len(cp) {
	if (cp < 0x80) return 1;
	if (cp < 0x800) return 2;
	if (cp < 0x10000) return 3;
	return 4;
}

// Split into pieces of at most CHUNK_SIZE UTF-8 bytes, never breaking a code
// point (or a surrogate pair) across a boundary — a lone surrogate is invalid
// UTF-8 and would be mangled into U+FFFD when the AppMessage string is encoded.
function splitChunks(s) {
	var chunks = [];
	var cur = "";
	var curBytes = 0;
	for (var i = 0; i < s.length; ) {
		var code = s.charCodeAt(i);
		var cp = code;
		var charLen = 1;            // UTF-16 units consumed for this code point
		if (code >= 0xD800 && code <= 0xDBFF && i + 1 < s.length) {
			var low = s.charCodeAt(i + 1);
			if (low >= 0xDC00 && low <= 0xDFFF) {
				cp = (code - 0xD800) * 0x400 + (low - 0xDC00) + 0x10000;
				charLen = 2;
			}
		}
		var b = utf8Len(cp);
		if (curBytes + b > CHUNK_SIZE && cur.length) {
			chunks.push(cur);
			cur = "";
			curBytes = 0;
		}
		cur += s.substr(i, charLen);
		curBytes += b;
		i += charLen;
	}
	if (cur.length)
		chunks.push(cur);
	if (chunks.length === 0)
		chunks.push("");      // always send at least one chunk (empty config)
	return chunks;
}

module.exports = {
	PROTO_VER: PROTO_VER,
	CHUNK_SIZE: CHUNK_SIZE,
	splitChunks: splitChunks,
};
