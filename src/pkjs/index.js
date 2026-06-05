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

// Send the JSON blob as numbered chunks. Each chunk is sent only after the
// previous one is acknowledged, so we never overrun the watch inbox; failures
// retry the same chunk after a short backoff.
function sendTransaction(s) {
	var chunks = protocol.splitChunks(s);
	var txn = Date.now() & 0x7fffffff;
	console.log("qrbuddy: sending config txn " + txn + " in " + chunks.length + " chunk(s)");

	function sendOne(i) {
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
			function () { sendOne(i + 1); },
			function () {
				console.log("qrbuddy: chunk " + i + " failed, retrying");
				setTimeout(function () { sendOne(i); }, 250);
			}
		);
	}

	sendOne(0);
}
