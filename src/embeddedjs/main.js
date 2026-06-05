// Watchapp entry point (runs on the watch in Moddable XS). Loads persisted
// config, installs the phone-sync receiver, and builds the Piu UI.

import model from "./model.js";
import "./sync.js";
import { buildApp } from "./ui.js";

console.log("qrbuddy: starting");

model.load();
buildApp();

console.log("qrbuddy: ui ready");
