// js/memo.js — undo / redo stack (Ctrl+Z / Ctrl+Y).
// Snapshot-based: each entry is a data-URL of the full canvas (format from state.imageFormat).

import { state, BG_COLOR } from "./state.js";

const $ = window.$;

let MAX = 10;  // driven by state.stackSize
const undoStack = [];
const redoStack = [];

// ─── Push / restore ───────────────────────────────────────────────────────────

export function setStackSize(n) {
    MAX = n;
    // Trim oldest entries if stacks exceed new limit (requirement 3.8)
    while (undoStack.length > MAX) undoStack.shift();
    while (redoStack.length > MAX) redoStack.shift();
    state.stackSize = n;
}

export function pushUndo() {
    if (undoStack.length >= MAX) undoStack.shift();
    undoStack.push(state.canvas.toDataURL(state.imageFormat, 0.92));
    redoStack.length = 0; // new action clears redo
}

export function popUndo() {
    if (!undoStack.length) return;
    // Save current state to redo before restoring
    redoStack.push(state.canvas.toDataURL(state.imageFormat, 0.92));
    restoreSnapshot(undoStack.pop());
}

export function popRedo() {
    if (!redoStack.length) return;
    // Save current state to undo before restoring
    undoStack.push(state.canvas.toDataURL(state.imageFormat, 0.92));
    restoreSnapshot(redoStack.pop());
}

export function clearUndo() {
    undoStack.length = 0;
    redoStack.length = 0;
}

function restoreSnapshot(dataURL) {
    const img = new Image();
    img.onload = function () {
        state.sbk.globalCompositeOperation = "source-over";
        state.sbk.fillStyle = BG_COLOR;
        state.sbk.fillRect(0, 0, state.canvas.width, state.canvas.height);
        state.sbk.drawImage(img, 0, 0);
    };
    img.src = dataURL;
}

// ─── Keyboard bindings ────────────────────────────────────────────────────────

export function initMemo() {
    $(document).on("keydown", function (e) {
        const ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl) return;

        if (e.key === "z" && !e.shiftKey) {
            e.preventDefault();
            popUndo();
        } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
            e.preventDefault();
            popRedo();
        }
    });
}
