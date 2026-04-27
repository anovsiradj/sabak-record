// js/canvas-size.js — canvas size presets, all relative to the wrapper area.

import { state, BG_COLOR } from "./state.js";
import { clearUndo } from "./undo.js";

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

function resizeCanvas(newW, newH) {
    const snap = state.canvas.toDataURL("image/webp", 0.92);

    state.canvas.width  = newW;
    state.canvas.height = newH;

    const ghost = $("#ghost")[0];
    if (ghost) { ghost.width = newW; ghost.height = newH; }

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
