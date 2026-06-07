// PebbleKit JS (runs on the paired phone). Hosts the settings page (as a
// self-contained data: URI), keeps the master copy of the config, and ships it
// to the watch in sequential, retried chunks.

var protocol = require("../common/protocol");
var configHtml = require("../common/config-html");

var CONFIG_KEY = "config";
var DEFAULT_CONFIG = '{"labelPosition":"below","entries":[]}';

function currentConfig() {
	return localStorage.getItem(CONFIG_KEY) || DEFAULT_CONFIG;
}

Pebble.addEventListener("ready", function () {
	console.log("qrbuddy pkjs ready");
});

Pebble.addEventListener("showConfiguration", function () {
	var html = configHtml.CONFIG_HTML.replace("__CONFIG__", encodeURIComponent(currentConfig()));
	Pebble.openURL("data:text/html," + encodeURIComponent(html));
});

Pebble.addEventListener("webviewclosed", function (e) {
	if (!e || !e.response)
		return;     // user cancelled
	var config;
	try {
		config = JSON.parse(decodeURIComponent(e.response));
	} catch (err) {
		console.log("qrbuddy: bad config from page: " + err);
		return;
	}
	var s = JSON.stringify(config);
	localStorage.setItem(CONFIG_KEY, s);    // phone master copy
	sendTransaction(s);
});

// Up to this many tries per chunk before the whole transaction is abandoned.
var MAX_ATTEMPTS = 5;

// Identifies the transaction currently being sent. Starting a new one supersedes
// any in-flight send: its sendOne loop sees activeTxn change and stops, so two
// quick saves can't interleave chunks (which would corrupt the watch's reassembly).
var activeTxn = null;

// Send the JSON blob as numbered chunks. Each chunk is sent only after the
// previous one is acknowledged, so we never overrun the watch inbox; failures
// retry the same chunk after a short backoff, up to MAX_ATTEMPTS.
function sendTransaction(s) {
	var chunks = protocol.splitChunks(s);
	var txn = Date.now() & 0x7fffffff;
	activeTxn = txn;
	console.log("qrbuddy: sending config txn " + txn + " in " + chunks.length + " chunk(s)");

	function sendOne(i, attempt) {
		if (txn !== activeTxn) {
			console.log("qrbuddy: txn " + txn + " superseded, stopping");
			return;
		}
		if (i >= chunks.length) {
			console.log("qrbuddy: config txn " + txn + " sent");
			return;
		}
		Pebble.sendAppMessage(
			{
				PROTO_VER: protocol.PROTO_VER,
				TXN_ID: txn,
				CHUNK_TOTAL: chunks.length,
				CHUNK_INDEX: i,
				CHUNK_DATA: chunks[i],
			},
			function () { sendOne(i + 1, 0); },
			function () {
				if (attempt + 1 >= MAX_ATTEMPTS) {
					console.log("qrbuddy: chunk " + i + " failed after " + MAX_ATTEMPTS + " attempts, aborting txn " + txn);
					return;
				}
				console.log("qrbuddy: chunk " + i + " failed, retrying (" + (attempt + 1) + "/" + MAX_ATTEMPTS + ")");
				setTimeout(function () { sendOne(i, attempt + 1); }, 250);
			}
		);
	}

	sendOne(0, 0);
}
