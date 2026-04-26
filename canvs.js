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

function initCanvas() {
    state.canvas = document.getElementById("sabak");
    state.sbk    = state.canvas.getContext("2d");
    state.sbk.strokeStyle = state.color;
    state.sbk.lineWidth   = state.lineWidth;
    state.sbk.lineCap     = "round";
    state.sbk.lineJoin    = "round";
    // Background is painted by initCanvasSize → setDefaultSize
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

window.addEventListener("load", function () {
    initCanvas();
    initCanvasSize();   // sets canvas size + paints BG
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
