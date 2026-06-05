// Shared (phone-side) constants + helpers for the chunked config transfer.
// Bundled into the PebbleKit JS app by wscript (src/common/**/*.js), which uses
// a CommonJS module system (require/module.exports).
//
// The whole config object { labelPosition, entries } is JSON-serialized and split
// into CHUNK_SIZE-byte pieces. Each piece is one AppMessage; keys are fixed so an
// arbitrary number/size of entries never needs new message keys.

var PROTO_VER = 1;

// Conservative: the Pebble inbox is small. Lower this if large lists fail to send.
var CHUNK_SIZE = 256;

function splitChunks(s) {
	var chunks = [];
	for (var i = 0; i < s.length; i += CHUNK_SIZE)
		chunks.push(s.substr(i, CHUNK_SIZE));
	if (chunks.length === 0)
		chunks.push("");      // always send at least one chunk (empty config)
	return chunks;
}

module.exports = {
	PROTO_VER: PROTO_VER,
	CHUNK_SIZE: CHUNK_SIZE,
	splitChunks: splitChunks,
};
