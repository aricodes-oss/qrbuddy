// Watch-side AppMessage receiver. The phone serializes the whole config object
// to one JSON string and ships it in fixed-size chunks; we reassemble them
// (order-independent, indexed slots) and hand the result to the model.
//
// KEYS order MUST match package.json's pebble.messageKeys order: the Moddable
// Message layer maps name -> code 10000+index, which is how Pebble numbers them.

import Message from "pebble/message";
import model from "./model.js";

const KEYS = ["PROTO_VER", "TXN_ID", "CHUNK_TOTAL", "CHUNK_INDEX", "CHUNK_DATA", "RESET"];

let rx = { txn: null, total: 0, parts: [], received: 0 };

// eslint-disable-next-line no-new
new Message({
	keys: KEYS,
	onReadable() {
		const m = this.read();
		const txn = m.get("TXN_ID");
		const total = m.get("CHUNK_TOTAL") | 0;

		// New transaction (or first message): start a fresh buffer.
		if (txn !== rx.txn)
			rx = { txn, total, parts: new Array(total), received: 0 };

		// RESET is a control message that just (re)starts the buffer.
		if (m.get("RESET"))
			return;

		const idx = m.get("CHUNK_INDEX") | 0;
		if (idx >= 0 && idx < rx.total && rx.parts[idx] === undefined) {
			rx.parts[idx] = m.get("CHUNK_DATA") || "";
			rx.received++;
			if (rx.received === rx.total) {
				console.log(`qrbuddy: txn ${txn} complete (${rx.total} chunks)`);
				model.replaceFrom(rx.parts.join(""));
			}
		}
	},
	onWritable() {},
	onSuspend() {},
});
