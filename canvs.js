// canvs.js — entry point

import { state, BG_COLOR } from "./js/state.js";
import { initUndo }        from "./js/undo.js";
import { initTools, onDown, onMove, onUp, onLeave, getPos } from "./js/tools.js";
import { recordStart, recordStop, play, closePreview,
         saveRecordingToGallery, toggleRecordMode, syncModeToggle } from "./js/record.js";
import { initColorPalette, initToolButtons, initLineWidth,
         resetCanvas, updateDrawingBadge, updateOrdinat } from "./js/ui.js";
import { captureToGallery, initGallery } from "./js/gallery.js";
import { initCanvasSize } from "./js/canvas-size.js";

const $ = window.$;

function initCanvas() {
    state.canvas = $("#sabak")[0];
    state.sbk    = state.canvas.getContext("2d");
    state.sbk.strokeStyle = state.color;
    state.sbk.lineWidth   = state.lineWidth;
    state.sbk.lineCap     = "round";
    state.sbk.lineJoin    = "round";
}

function handleDown(e)  { onDown(e);  updateDrawingBadge(state.isDrawing); }
function handleUp(e)    { onUp(e);    updateDrawingBadge(state.isDrawing); }
function handleLeave()  { onLeave();  updateDrawingBadge(state.isDrawing); }
function handleMove(e)  { onMove(e);  updateOrdinat(getPos(e).x, getPos(e).y); }

// Window bridges for HTML onclick
window.sabak_record_start       = recordStart;
window.sabak_record_stop        = recordStop;
window.sabak_playr              = play;
window.sbk_reset                = resetCanvas;
window.sabak_save_recording     = saveRecordingToGallery;
window.sabak_capture            = captureToGallery;
window.sabak_toggle_record_mode = toggleRecordMode;
window.sabak_close_preview      = closePreview;

$(function () {
    initCanvas();
    initCanvasSize();
    initUndo();
    initTools();
    initColorPalette();
    initToolButtons();
    initLineWidth();
    initGallery();
    syncModeToggle();

    updateDrawingBadge(false);
    updateOrdinat(0, 0);

    const $c = $(state.canvas);

    // Mouse events
    $c.on("mousemove", handleMove)
      .on("mousedown", handleDown)
      .on("mouseup",   handleUp)
      .on("mouseout",  handleLeave);

    // Touch events — must use native addEventListener for passive:false
    const c = state.canvas;
    c.addEventListener("touchmove",   handleMove,  { passive: false });
    c.addEventListener("touchstart",  handleDown,  { passive: false });
    c.addEventListener("touchend",    handleUp,    { passive: false });
    c.addEventListener("touchcancel", handleLeave, { passive: false });
});
