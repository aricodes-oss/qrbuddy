// Piu UI for the watch: a Port that draws the current entry's QR code, plus a
// label whose position (above/below) is a global setting and whose visibility
// toggles with Select. Buttons: Up = previous, Down = next, Select = show/hide
// label, Back = exit (Piu's default when no onPressBack is defined).
//
// We draw the QR ourselves in a Port (rather than the native QRCode content)
// because the Pebble host ships the `qrcode` encoder but not the Poco drawQRCode
// helper the native content relies on. The encoder returns one byte per module.

import {} from "piu/MC";          // Pebble host provides Piu globals (Application, Port, ...)
import qrEncode from "qrcode";    // host-provided encoder: returns ArrayBuffer + .size
import model from "./model.js";

const LABEL_BAND = 28;            // px reserved for the label row (only when shown)
const QR_MAX_VERSION = 10;        // capacity ceiling; bigger = smaller modules

const whiteSkin = new Skin({ fill: "white" });
const labelStyle = new Style({ font: "bold 24px Gothic", color: "black", horizontal: "center", vertical: "middle" });

let app, qrPort, label;
let qrBytes = null;               // Uint8Array, one byte (0/1) per module, row-major
let qrN = 0;                      // QR matrix size (modules per side)
let labelShown = false;           // kept in sync with label.visible for layout
let isRound = false;              // round display (e.g. gabbro) clips the corners

class QRPortBehavior extends Behavior {
	// The Port spans the whole screen. We scale the QR to the largest size that
	// fills the available area (the full screen, minus the label band only while
	// the label is visible). The white fill + centering remainder act as the
	// quiet zone.
	onDraw(port, x, y, w, h) {
		port.fillColor("white", x, y, w, h);
		if (!qrBytes)
			return;
		let top = y;
		let availH = h;
		if (labelShown) {
			availH = h - LABEL_BAND;
			if (model.labelPosition === "above")
				top = y + LABEL_BAND;
		}
		// Largest square that fits the available area. On a round display the QR
		// must stay inside the inscribed square of the circle, or the corner
		// finder patterns get clipped and it won't scan.
		let limit = Math.min(w, availH);
		if (isRound)
			limit = Math.min(limit, (Math.min(w, h) / Math.SQRT2) | 0);
		const px = Math.max(1, (limit / qrN) | 0);
		const dim = px * qrN;
		const ox = x + ((w - dim) >> 1);
		const oy = top + ((availH - dim) >> 1);
		for (let r = 0; r < qrN; r++) {
			const row = r * qrN;
			for (let c = 0; c < qrN; c++) {
				if (qrBytes[row + c])
					port.fillColor("black", ox + c * px, oy + r * px, px, px);
			}
		}
	}
}

class NavBehavior extends Behavior {
	onDisplaying(container) {
		container.focus();          // route buttons to this container's behavior
		model.onChange = refresh;
		refresh();
	}
	onPressUp() { model.prev(); return true; }
	onPressDown() { model.next(); return true; }
	onPressSelect() { model.toggleLabel(); return true; }
	// no onPressBack -> Piu pops the window, exiting the app
}

export function buildApp() {
	app = new Application(null, { skin: whiteSkin, Behavior: NavBehavior });

	try { isRound = !!screen.round; } catch (e) { isRound = false; }

	// The Port fills the whole screen; the QR scales to it. The label is a sibling
	// added after the Port so it draws on top, in a band at the chosen edge.
	qrPort = new Port(null, { left: 0, right: 0, top: 0, bottom: 0, Behavior: QRPortBehavior });
	label = new Label(null, { left: 0, right: 0, top: 0, height: LABEL_BAND, style: labelStyle, string: "" });

	app.add(qrPort);
	app.add(label);
	return app;
}

// Position the label band at the chosen edge (the QR fills the whole screen).
function applyLayout() {
	if (model.labelPosition === "above")
		label.coordinates = { left: 0, right: 0, top: 0, height: LABEL_BAND };
	else
		label.coordinates = { left: 0, right: 0, bottom: 0, height: LABEL_BAND };
}

function refresh() {
	const entry = model.current();
	applyLayout();

	if (!entry) {
		qrBytes = null;
		qrN = 0;
		label.string = "No entries — see phone";
		label.visible = labelShown = true;
		qrPort.invalidate();
		return;
	}

	try {
		const buf = qrEncode({ input: entry.text, maxVersion: QR_MAX_VERSION });
		qrBytes = new Uint8Array(buf);
		qrN = buf.size;
	} catch (e) {
		// String exceeds QR_MAX_VERSION capacity (or otherwise can't encode).
		console.log(`qrbuddy: encode failed: ${e}`);
		qrBytes = null;
		qrN = 0;
		label.string = "Entry too long";
		label.visible = labelShown = true;
		qrPort.invalidate();
		return;
	}

	label.string = entry.label || "";
	label.visible = labelShown = model.labelVisible && !!entry.label;
	qrPort.invalidate();
}
