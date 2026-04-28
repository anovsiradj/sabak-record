// js/record-frame.js
// Frame-by-frame recording using toDataURL + setInterval.
// Produces an array of WebP data-URLs replayed as a flipbook.

import { state } from "./state.js";

const FPS = 8;

let frames       = [];
let captureTimer = null;
let playTimer    = null;
let recording    = false;

function capture() {
    frames.push(state.canvas.toDataURL("image/webp", 0.85));
}

function stopPlay() {
    if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
}

export function start() {
    stopPlay();
    frames    = [];
    recording = true;
    captureTimer = setInterval(capture, 1000 / FPS);
}

export function stop() {
    if (!recording) return;
    clearInterval(captureTimer);
    captureTimer = null;
    recording    = false;
}

/** Play back into an <img> element. */
export function play(imgEl) {
    if (!frames.length) return;
    stopPlay();
    let i = 0;
    playTimer = setInterval(function () {
        if (i < frames.length) { imgEl.src = frames[i++]; }
        else                   { stopPlay(); }
    }, 1000 / FPS);
}

/** Returns the last captured frame as a WebP data-URL, or null. */
export function getLastFrame() {
    return frames.length > 0 ? frames[frames.length - 1] : null;
}

/** Returns a copy of all frames for the gallery. */
export function getFrames() { return frames.slice(); }

export function isRecording() { return recording; }
export function hasFrames()   { return frames.length > 0; }
