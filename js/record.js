// js/record.js
// Canvas recording and frame-by-frame playback.

import { state } from "./state.js";

const fps = 10;

let record_frame = [];
let frame_length = 0;
let timeval      = null;
let playr_timer  = null;
let is_record    = false;

// ─── Internal ─────────────────────────────────────────────────────────────────

function captureFrame() {
    record_frame.push(state.canvas.toDataURL("image/png"));
}

function stopPlayback() {
    if (playr_timer !== null) {
        clearInterval(playr_timer);
        playr_timer = null;
    }
}

function updateBadge() {
    const badge = document.getElementById("badge_record");
    if (!badge) return;
    if (is_record) {
        badge.textContent = "Merekam…";
        badge.classList.add("recording");
    } else {
        badge.textContent = "Tidak Merekam";
        badge.classList.remove("recording");
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordStart() {
    stopPlayback();
    record_frame = [];
    frame_length = 0;
    document.getElementById("playback_wrap").classList.add("d-none");
    document.getElementById("frm").src = "";
    is_record = true;
    updateBadge();
    timeval = setInterval(captureFrame, 1000 / fps);
}

export function recordStop() {
    if (!is_record) return;
    clearInterval(timeval);
    timeval = null;
    is_record = false;
    frame_length = record_frame.length;
    updateBadge();
    if (frame_length > 0) {
        document.getElementById("frm").src = record_frame[frame_length - 1];
        document.getElementById("playback_wrap").classList.remove("d-none");
    }
}

export function play() {
    if (!frame_length) return;
    stopPlayback();
    let offst = 0;
    const frm = document.getElementById("frm");
    playr_timer = setInterval(function () {
        if (offst < frame_length) {
            frm.src = record_frame[offst++];
        } else {
            stopPlayback();
        }
    }, 1000 / fps);
}
