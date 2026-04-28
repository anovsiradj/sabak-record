// js/record.js — recording coordinator + inline playback preview.

import { state } from "./state.js";
import * as frame  from "./record-frame.js";
import * as stream from "./record-stream.js";
import { addToGallery } from "./gallery.js";

const $ = window.$;

let _recording = false;

// ─── Record toggle button state ───────────────────────────────────────────────

function setRecordBtn(active) {
    _recording = active;
    const $btn   = $("#btn_record_toggle");
    const $icon  = $("#btn_record_icon");
    const $label = $("#btn_record_label");

    if (active) {
        $btn.removeClass("hbtn-success").addClass("hbtn-warning");
        $icon.removeClass("bi-record-circle").addClass("bi-stop-circle");
        $label.text("Stop");
        $btn.attr("title", "Berhenti rekam");
    } else {
        $btn.removeClass("hbtn-warning").addClass("hbtn-success");
        $icon.removeClass("bi-stop-circle").addClass("bi-record-circle");
        $label.text("Rekam");
        $btn.attr("title", "Mulai rekam");
    }
}

// ─── Preview helpers ──────────────────────────────────────────────────────────

function showPreview(src, isVideo) {
    const $wrap = $("#playback_wrap");
    const $frm  = $("#frm");
    const $vid  = $("#frm_video");
    const $btn  = $("#btn_play_preview");

    if (isVideo) {
        $frm.addClass("d-none");
        $vid.removeClass("d-none").attr("src", src);
    } else {
        $vid.addClass("d-none").attr("src", "");
        $frm.removeClass("d-none").attr("src", src);
    }

    // Putar button only for frame mode — video has native controls
    $btn.toggle(state.recordMode === "frame");

    $wrap.removeClass("d-none");
}

function hidePreview() {
    $("#playback_wrap").addClass("d-none");
    $("#frm").attr("src", "");
    $("#frm_video").attr("src", "").addClass("d-none");
}

export function closePreview() { hidePreview(); }

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordStart() {
    hidePreview();
    setRecordBtn(true);

    if (state.recordMode === "stream") {
        const ok = stream.start();
        if (!ok) {
            state.recordMode = "frame";
            syncModeToggle();
            frame.start();
        }
    } else {
        frame.start();
    }
}

export function recordStop() {
    setRecordBtn(false);

    if (state.recordMode === "stream") {
        stream.stop(function (blob) {
            showPreview(URL.createObjectURL(blob), true);
        });
    } else {
        frame.stop();
        const last = frame.getLastFrame();
        if (last) showPreview(last, false);
    }
}

export function recordToggle() {
    if (_recording) recordStop();
    else            recordStart();
}

export function play() {
    if (state.recordMode === "stream") {
        const vid = $("#frm_video")[0];
        if (vid && vid.src) { vid.currentTime = 0; vid.play(); }
    } else {
        frame.play($("#frm")[0]);
    }
}

export function saveRecordingToGallery() {
    if (state.recordMode === "stream") {
        const blob = stream.getBlob();
        if (!blob) return;
        addToGallery({ type: "video", src: URL.createObjectURL(blob), blob, label: "Rekaman" });
    } else {
        if (!frame.hasFrames()) return;
        addToGallery({ type: "frames", frames: frame.getFrames(), label: "Rekaman (frame)" });
    }
}

export function syncModeToggle() {
    const isStream = state.recordMode === "stream";
    $("#btn_record_mode").attr(
        "title",
        isStream
            ? "Aktif: MediaRecorder (WebM). Klik untuk ganti ke Frame."
            : "Aktif: Frame-by-frame (WebP). Klik untuk ganti ke Stream."
    );
    $("#btn_record_mode_label").text(isStream ? "Stream" : "Frame");
}

export function toggleRecordMode() {
    state.recordMode = state.recordMode === "frame" ? "stream" : "frame";
    if (state.recordMode === "stream" && !stream.isSupported()) {
        alert("Browser ini tidak mendukung MediaRecorder. Tetap menggunakan mode Frame.");
        state.recordMode = "frame";
    }
    syncModeToggle();
}
