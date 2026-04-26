// js/record-stream.js
// MediaRecorder-based recording using captureStream().
// Produces a WebM Blob that can be played in a <video> element.

import { state } from "./state.js";

const FPS        = 25;
const MIME_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

let mediaRecorder = null;
let chunks        = [];
let blob          = null;
let recording     = false;
let _onStop       = null; // callback(blob) when recording finishes

function pickMime() {
    return MIME_TYPES.find(function (m) { return MediaRecorder.isTypeSupported(m); }) || "";
}

// ─── Public ───────────────────────────────────────────────────────────────────

/** Returns true if the browser supports MediaRecorder + captureStream. */
export function isSupported() {
    return !!(window.MediaRecorder && state.canvas && state.canvas.captureStream);
}

export function start() {
    if (!isSupported()) {
        console.warn("record-stream: MediaRecorder not supported, falling back.");
        return false;
    }
    chunks    = [];
    blob      = null;
    recording = true;

    const stream = state.canvas.captureStream(FPS);
    const opts   = pickMime() ? { mimeType: pickMime() } : {};
    mediaRecorder = new MediaRecorder(stream, opts);

    mediaRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = function () {
        blob      = new Blob(chunks, { type: mediaRecorder.mimeType || "video/webm" });
        recording = false;
        if (_onStop) { _onStop(blob); _onStop = null; }
    };

    mediaRecorder.start(100); // collect data every 100 ms
    return true;
}

export function stop(onStopCallback) {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    _onStop = onStopCallback || null;
    mediaRecorder.stop();
}

/** Returns the recorded Blob, or null if not yet available. */
export function getBlob() { return blob; }

export function isRecording() { return recording; }
