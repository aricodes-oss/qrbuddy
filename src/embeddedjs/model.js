// Single source of truth for the watchapp UI, shared by the button handlers
// (ui.js) and the phone-sync receiver (sync.js). Runs on the watch in Moddable XS.

const CONFIG_KEY = "config";   // synced from the phone: { labelPosition, entries }
const UI_KEY = "ui";           // watch-local UI state: { labelVisible }

const model = {
	entries: [],               // [{ label, text }]
	index: 0,
	labelPosition: "below",    // "below" | "above" (global, from phone config)
	labelVisible: true,        // watch-local toggle (Select button)
	onChange: null,            // set by ui.js; invoked whenever the view should refresh

	load() {
		try {
			const raw = localStorage.getItem(CONFIG_KEY);
			if (raw)
				this._applyConfig(JSON.parse(raw));
		} catch (e) {
			console.log(`qrbuddy: config load failed: ${e}`);
		}
		try {
			const raw = localStorage.getItem(UI_KEY);
			if (raw) {
				const ui = JSON.parse(raw);
				if (typeof ui.labelVisible === "boolean")
					this.labelVisible = ui.labelVisible;
			}
		} catch (e) {
			console.log(`qrbuddy: ui state load failed: ${e}`);
		}
	},

	// Replace the entry list + label position from a freshly received JSON blob.
	replaceFrom(json) {
		let cfg;
		try {
			cfg = JSON.parse(json);
		} catch (e) {
			console.log(`qrbuddy: bad config json: ${e}`);
			return;
		}
		this._applyConfig(cfg);
		this.index = 0;
		try {
			localStorage.setItem(CONFIG_KEY, JSON.stringify({
				labelPosition: this.labelPosition,
				entries: this.entries,
			}));
		} catch (e) {
			console.log(`qrbuddy: config save failed: ${e}`);
		}
		this._fire();
	},

	current() {
		return this.entries.length ? this.entries[this.index] : null;
	},

	next() {
		if (this.entries.length) {
			this.index = (this.index + 1) % this.entries.length;
			this._fire();
		}
	},

	prev() {
		if (this.entries.length) {
			this.index = (this.index - 1 + this.entries.length) % this.entries.length;
			this._fire();
		}
	},

	toggleLabel() {
		this.labelVisible = !this.labelVisible;
		try {
			localStorage.setItem(UI_KEY, JSON.stringify({ labelVisible: this.labelVisible }));
		} catch (e) {
			console.log(`qrbuddy: ui state save failed: ${e}`);
		}
		this._fire();
	},

	_applyConfig(cfg) {
		this.labelPosition = (cfg && cfg.labelPosition === "above") ? "above" : "below";
		const entries = (cfg && Array.isArray(cfg.entries)) ? cfg.entries : [];
		this.entries = entries.filter(e => e && typeof e.text === "string" && e.text.length);
		if (this.index >= this.entries.length)
			this.index = 0;
	},

	_fire() {
		if (this.onChange)
			this.onChange();
	},
};

export default model;
