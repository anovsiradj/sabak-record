// canvs.js — entry point
// Initialises canvas, wires all modules together.

import { state, BG_COLOR } from "./js/state.js";
import { initUndo }        from "./js/undo.js";
import { initTools, onDown, onMove, onUp, onLeave, getPos } from "./js/tools.js";
import { recordStart, recordStop, play,
         saveRecordingToGallery, toggleRecordMode, syncModeToggle } from "./js/record.js";
import { initColorPalette, initToolButtons, initLineWidth,
         resetCanvas, updateDrawingBadge, updateOrdinat } from "./js/ui.js";
import { captureToGallery, initGallery } from "./js/gallery.js";

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

// ─── Pointer wrappers ─────────────────────────────────────────────────────────

function handleDown(e)  { onDown(e);  updateDrawingBadge(state.isDrawing); }
function handleUp(e)    { onUp(e);    updateDrawingBadge(state.isDrawing); }
function handleLeave()  { onLeave();  updateDrawingBadge(state.isDrawing); }
function handleMove(e)  {
    onMove(e);
    const pos = getPos(e);
    updateOrdinat(pos.x, pos.y);
}

// ─── Window bridges (for HTML onclick) ───────────────────────────────────────

window.sabak_record_start       = recordStart;
window.sabak_record_stop        = recordStop;
window.sabak_playr              = play;
window.sbk_reset                = resetCanvas;
window.sabak_save_recording     = saveRecordingToGallery;
window.sabak_capture            = captureToGallery;
window.sabak_toggle_record_mode = toggleRecordMode;

// ─── Bootstrap ────────────────────────────────────────────────────────────────

window.addEventListener("load", function () {
    initCanvas();
    initUndo();
    initTools();
    initColorPalette();
    initToolButtons();
    initLineWidth();
    initGallery();
    syncModeToggle();

    updateDrawingBadge(false);
    updateOrdinat(0, 0);

    const c = state.canvas;
    c.addEventListener("mousemove",   handleMove);
    c.addEventListener("mousedown",   handleDown);
    c.addEventListener("mouseup",     handleUp);
    c.addEventListener("mouseout",    handleLeave);
    c.addEventListener("touchmove",   handleMove,  { passive: false });
    c.addEventListener("touchstart",  handleDown,  { passive: false });
    c.addEventListener("touchend",    handleUp,    { passive: false });
    c.addEventListener("touchcancel", handleLeave, { passive: false });
});
