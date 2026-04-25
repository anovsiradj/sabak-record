// canvs.js — entry point
// Initialises canvas, wires all modules together.

import { state, BG_COLOR } from "./js/state.js";
import { initUndo } from "./js/undo.js";
import { initTools, onDown, onMove, onUp, onLeave, getPos } from "./js/tools.js";
import { recordStart, recordStop, play } from "./js/record.js";
import { initColorPalette, initToolButtons, initLineWidth,
         resetCanvas, updateDrawingBadge, updateOrdinat } from "./js/ui.js";

// ─── Init canvas ──────────────────────────────────────────────────────────────

function initCanvas() {
    state.canvas = document.getElementById("sabak");
    state.sbk    = state.canvas.getContext("2d");

    state.sbk.strokeStyle = state.color;
    state.sbk.lineWidth   = state.lineWidth;
    state.sbk.lineCap     = "round";
    state.sbk.lineJoin    = "round";
    state.sbk.fillStyle   = BG_COLOR;
    state.sbk.fillRect(0, 0, state.canvas.width, state.canvas.height);
}

// ─── Pointer event wrappers (update badges + delegate to tools) ───────────────

function handleDown(e) {
    onDown(e);
    updateDrawingBadge(state.isDrawing);
}

function handleMove(e) {
    onMove(e);
    const pos = getPos(e);
    updateOrdinat(pos.x, pos.y);
}

function handleUp(e) {
    onUp(e);
    updateDrawingBadge(state.isDrawing);
}

function handleLeave() {
    onLeave();
    updateDrawingBadge(state.isDrawing);
}

// ─── Expose recording functions to HTML onclick attributes ────────────────────
// (modules can't be called from inline onclick without this bridge)

window.sabak_record_start = recordStart;
window.sabak_record_stop  = recordStop;
window.sabak_playr        = play;
window.sbk_reset          = resetCanvas;

// ─── Bootstrap ────────────────────────────────────────────────────────────────

window.addEventListener("load", function () {
    initCanvas();
    initUndo();
    initTools();
    initColorPalette();
    initToolButtons();
    initLineWidth();

    // Initial badge state
    updateDrawingBadge(false);
    updateOrdinat(0, 0);

    const c = state.canvas;

    // Mouse
    c.addEventListener("mousemove", handleMove);
    c.addEventListener("mousedown", handleDown);
    c.addEventListener("mouseup",   handleUp);
    c.addEventListener("mouseout",  handleLeave);

    // Touch
    c.addEventListener("touchmove",   handleMove, { passive: false });
    c.addEventListener("touchstart",  handleDown, { passive: false });
    c.addEventListener("touchend",    handleUp,   { passive: false });
    c.addEventListener("touchcancel", handleLeave,{ passive: false });
});
