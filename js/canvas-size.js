// js/canvas-size.js
// Canvas size presets — all relative to the available canvas wrapper area.
// Each preset is defined as [label, wRatio, hRatio].

import { state, BG_COLOR } from "./state.js";
import { clearUndo } from "./undo.js";

export const PRESETS = [
    ["16:9",  16,  9],
    ["9:16",   9, 16],
    ["1:1",    1,  1],
    ["4:3",    4,  3],
    ["3:4",    3,  4],
    ["3:2",    3,  2],
    ["2:3",    2,  3],
];

/**
 * Return the stable pixel dimensions of the canvas wrapper.
 * The wrapper has a fixed CSS height (100dvh - header), so its
 * clientWidth/clientHeight are stable regardless of gallery content below.
 */
function getWrapperSize() {
    const wrapper = document.getElementById("canvas_wrapper");
    if (!wrapper) return { w: 800, h: 450 };
    return {
        w: Math.max(wrapper.clientWidth,  200),
        h: Math.max(wrapper.clientHeight, 200),
    };
}

/**
 * Compute the largest canvas that fits inside the wrapper
 * at the given aspect ratio (wr : hr).
 */
function fitToWrapper(wr, hr) {
    const { w, h } = getWrapperSize();
    let cw = w;
    let ch = Math.round(cw * hr / wr);
    if (ch > h) {
        ch = h;
        cw = Math.round(ch * wr / hr);
    }
    return { w: Math.max(cw, 100), h: Math.max(ch, 100) };
}

function resizeCanvas(newW, newH) {
    const snap = state.canvas.toDataURL("image/webp", 0.92);

    state.canvas.width  = newW;
    state.canvas.height = newH;

    const ghost = document.getElementById("ghost");
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
    const sel = document.getElementById("canvas_size_select");
    const val = sel ? sel.value : "default";
    if (val === "default") {
        setDefaultSize();
    } else {
        applyPreset(val);
    }
}

export function initCanvasSize() {
    const sel = document.getElementById("canvas_size_select");
    if (sel) {
        sel.addEventListener("change", reapplyCurrent);
    }

    // Defer one frame so the wrapper has its final CSS dimensions
    requestAnimationFrame(setDefaultSize);

    // Re-fit on window resize — wrapper height is fixed so this is safe
    window.addEventListener("resize", reapplyCurrent);
}
