// js/undo.js — snapshot-based undo stack (Ctrl+Z / Cmd+Z).

import { state, BG_COLOR } from "./state.js";

const $ = window.$;

const MAX_UNDO = 30;
const stack    = [];

export function pushUndo() {
    if (stack.length >= MAX_UNDO) stack.shift();
    stack.push(state.canvas.toDataURL("image/webp", 0.92));
}

export function popUndo() {
    if (!stack.length) return;
    const dataURL = stack.pop();
    const img     = new Image();
    img.onload = function () {
        state.sbk.globalCompositeOperation = "source-over";
        state.sbk.fillStyle = BG_COLOR;
        state.sbk.fillRect(0, 0, state.canvas.width, state.canvas.height);
        state.sbk.drawImage(img, 0, 0);
    };
    img.src = dataURL;
}

export function clearUndo() { stack.length = 0; }

export function initUndo() {
    $(document).on("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
            e.preventDefault();
            popUndo();
        }
    });
}
