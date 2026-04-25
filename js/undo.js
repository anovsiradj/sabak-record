// js/undo.js
// Snapshot-based undo stack (Ctrl+Z).
// Call pushUndo() after every committed stroke/shape/text.

import { state, BG_COLOR } from "./state.js";

const MAX_UNDO = 30;
const stack = [];

/** Save current canvas pixels onto the undo stack. */
export function pushUndo() {
    if (stack.length >= MAX_UNDO) stack.shift();
    stack.push(state.canvas.toDataURL("image/png"));
}

/** Restore the previous snapshot. */
export function popUndo() {
    if (stack.length === 0) return;
    const dataURL = stack.pop();
    const img = new Image();
    img.onload = function () {
        state.sbk.globalCompositeOperation = "source-over";
        state.sbk.fillStyle = BG_COLOR;
        state.sbk.fillRect(0, 0, state.canvas.width, state.canvas.height);
        state.sbk.drawImage(img, 0, 0);
    };
    img.src = dataURL;
}

/** Clear the entire undo stack (e.g. after a full canvas reset). */
export function clearUndo() {
    stack.length = 0;
}

export function initUndo() {
    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
            e.preventDefault();
            popUndo();
        }
    });
}
