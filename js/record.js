// js/record.js
// Coordinator: delegates to record-frame.js or record-stream.js
// based on state.recordMode. Also owns the inline playback preview.

import { state } from "./state.js";
import * as frame  from "./record-frame.js";
import * as stream from "./record-stream.js";
import { addToGallery } from "./gallery.js";

// ─── Badge ────────────────────────────────────────────────────────────────────

function setBadge(active) {
    const badge = document.getElementById("badge_record");
    if (!badge) return;
    badge.textContent = active ? "Merekam…" : "Tidak Merekam";
    badge.classList.toggle("recording", active);
}

// ─── Inline preview helpers ───────────────────────────────────────────────────

function showPreview(src, isVideo) {
    const wrap = document.getElementById("playback_wrap");
    const frm  = document.getElementById("frm");
    const vid  = document.getElementById("frm_video");
    const btn  = document.getElementById("btn_play_preview");
    if (!wrap) return;

    if (isVideo) {
        frm.classList.add("d-none");
        vid.classList.remove("d-none");
        vid.src = src;
    } else {
        vid.classList.add("d-none");
        frm.classList.remove("d-none");
        frm.src = src;
    }

    // Putar button only makes sense for frame mode (video has native controls)
    if (btn) btn.style.display = state.recordMode === "frame" ? "" : "none";

    wrap.classList.remove("d-none");
}

function hidePreview() {
    const wrap = document.getElementById("playback_wrap");
    if (wrap) wrap.classList.add("d-none");
    const frm = document.getElementById("frm");
    const vid = document.getElementById("frm_video");
    if (frm) frm.src = "";
    if (vid) { vid.src = ""; vid.classList.add("d-none"); }
}

export function closePreview() { hidePreview(); }

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordStart() {
    hidePreview();
    setBadge(true);

    if (state.recordMode === "stream") {
        const ok = stream.start();
        if (!ok) {
            // Fallback to frame mode silently
            state.recordMode = "frame";
            syncModeToggle();
            frame.start();
        }
    } else {
        frame.start();
    }
}

export function recordStop() {
    setBadge(false);

    if (state.recordMode === "stream") {
        stream.stop(function (blob) {
            const url = URL.createObjectURL(blob);
            showPreview(url, true);
        });
    } else {
        frame.stop();
        const last = frame.getLastFrame();
        if (last) showPreview(last, false);
    }
}

export function play() {
    if (state.recordMode === "stream") {
        // Stream result is already in the <video> element after stop
        const vid = document.getElementById("frm_video");
        if (vid && vid.src) { vid.currentTime = 0; vid.play(); }
    } else {
        const frm = document.getElementById("frm");
        if (frm) frame.play(frm);
    }
}

/** Save current recording to gallery. Called from toolbar button. */
export function saveRecordingToGallery() {
    if (state.recordMode === "stream") {
        const blob = stream.getBlob();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        addToGallery({ type: "video", src: url, blob: blob, label: "Rekaman" });
    } else {
        if (!frame.hasFrames()) return;
        // Store frames array; gallery will animate them
        addToGallery({ type: "frames", frames: frame.getFrames(), label: "Rekaman (frame)" });
    }
}

/** Sync the mode toggle button to reflect state.recordMode. */
export function syncModeToggle() {
    const btn   = document.getElementById("btn_record_mode");
    const label = document.getElementById("btn_record_mode_label");
    const isStream = state.recordMode === "stream";
    if (btn) {
        btn.title = isStream
            ? "Aktif: MediaRecorder (WebM). Klik untuk ganti ke Frame."
            : "Aktif: Frame-by-frame (WebP). Klik untuk ganti ke Stream.";
    }
    if (label) label.textContent = isStream ? "Stream" : "Frame";
}

export function toggleRecordMode() {
    state.recordMode = state.recordMode === "frame" ? "stream" : "frame";
    // Warn if stream not supported
    if (state.recordMode === "stream" && !stream.isSupported()) {
        alert("Browser ini tidak mendukung MediaRecorder. Tetap menggunakan mode Frame.");
        state.recordMode = "frame";
    }
    syncModeToggle();
}
