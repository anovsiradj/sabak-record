// js/record-frame.js
// Frame-by-frame recording using toDataURL + setInterval.
// Produces an array of PNG data-URLs that can be replayed as a flipbook.

import { state } from "./state.js";

const FPS = 10;

let frames      = [];
let frameCount  = 0;
let captureTimer = null;
let playTimer    = null;
let recording    = false;

function capture() {
    frames.push(state.canvas.toDataURL("image/webp", 0.85));
}

function stopPlay() {
    if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
}

// ─── Public ───────────────────────────────────────────────────────────────────

export function start() {
    stopPlay();
    frames     = [];
    frameCount = 0;
    recording  = true;
    captureTimer = setInterval(capture, 1000 / FPS);
}

export function stop() {
    if (!recording) return;
    clearInterval(captureTimer);
    captureTimer = null;
    recording    = false;
    frameCount   = frames.length;
}

/** Play back into an <img> element. */
export function play(imgEl) {
    if (!frameCount) return;
    stopPlay();
    let i = 0;
    playTimer = setInterval(function () {
        if (i < frameCount) { imgEl.src = frames[i++]; }
        else                { stopPlay(); }
    }, 1000 / FPS);
}

/** Returns the last captured frame as a WebP data-URL, or null. */
export function getLastFrame() {
    return frameCount > 0 ? frames[frameCount - 1] : null;
}

/** Returns all frames — used by gallery to build an animated GIF-like preview. */
export function getFrames() { return frames.slice(); }

export function isRecording() { return recording; }
export function hasFrames()   { return frameCount > 0; }
