// js/canvas.js — canvas init, resize, and aspect-ratio presets.
// Merges canvas-size.js and the canvas init logic from canvs.js.

import { state, BG_COLOR } from "./state.js";
import { clearUndo } from "./memo.js";
import { initGhost, resizeGhost } from "./draw.js";

const $ = window.$;

export const PRESETS = [
    ["16:9",  16,  9],
    ["9:16",   9, 16],
    ["1:1",    1,  1],
    ["4:3",    4,  3],
    ["3:4",    3,  4],
    ["3:2",    3,  2],
    ["2:3",    2,  3],
];

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initCanvas() {
    state.canvas = $("#sabak")[0];
    state.sbk    = state.canvas.getContext("2d");
    state.sbk.strokeStyle = state.color;
    state.sbk.lineWidth   = state.lineWidth;
    state.sbk.lineCap     = "round";
    state.sbk.lineJoin    = "round";
    // Background painted by initCanvasSize → setDefaultSize
}

// ─── Wrapper measurement ──────────────────────────────────────────────────────

function getWrapperSize() {
    const $w = $("#canvas_wrapper");
    return {
        w: Math.max($w.width()  || 800, 200),
        h: Math.max($w.height() || 450, 200),
    };
}

function fitToWrapper(wr, hr) {
    const { w, h } = getWrapperSize();
    let cw = w;
    let ch = Math.round(cw * hr / wr);
    if (ch > h) { ch = h; cw = Math.round(ch * wr / hr); }
    return { w: Math.max(cw, 100), h: Math.max(ch, 100) };
}

// ─── Resize ───────────────────────────────────────────────────────────────────

function resizeCanvas(newW, newH) {
    const snap = state.canvas.toDataURL("image/webp", 0.92);

    state.canvas.width  = newW;
    state.canvas.height = newH;
    resizeGhost(newW, newH);

    state.sbk.fillStyle = BG_COLOR;
    state.sbk.fillRect(0, 0, newW, newH);

    const img = new Image();
    img.onload = function () { state.sbk.drawImage(img, 0, 0); };
    img.src = snap;

    clearUndo();
}

export function setDefaultSize() {
    const { w, h } = getWrapperSize();
    resizeCanvas(w, h);
}

export function applyPreset(label) {
    const preset = PRESETS.find(function (p) { return p[0] === label; });
    if (!preset) return;
    const size = fitToWrapper(preset[1], preset[2]);
    resizeCanvas(size.w, size.h);
}

// ─── Reset canvas content ─────────────────────────────────────────────────────

export function clearCanvas() {
    state.sbk.globalCompositeOperation = "source-over";
    state.sbk.fillStyle = BG_COLOR;
    state.sbk.fillRect(0, 0, state.canvas.width, state.canvas.height);
}

// ─── Init size controls ───────────────────────────────────────────────────────

function reapplyCurrent() {
    const val = $("#canvas_size_select").val() || "default";
    if (val === "default") setDefaultSize();
    else applyPreset(val);
}

export function initCanvasSize() {
    $("#canvas_size_select").on("change", reapplyCurrent);
    requestAnimationFrame(setDefaultSize);
    $(window).on("resize", reapplyCurrent);
}
