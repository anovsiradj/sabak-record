// canvs.js — entry point

import { state } from "./js/state.js";
import { initMemo, popUndo, popRedo } from "./js/memo.js";
import { initCanvas, initCanvasSize } from "./js/canvas.js";
import {
    initGhost, onDown, onMove, onUp, onLeave,
    getPos
} from "./js/draw.js";
import { showTextInput, initTextTool } from "./js/text.js";
import {
    recordStart, recordStop, recordToggle,
    play, closePreview, saveRecordingToGallery,
    toggleRecordMode, syncModeToggle
} from "./js/record.js";
import {
    initColorPalette, initToolButtons,
    initLineWidth, resetCanvas,
    updateOrdinat
} from "./js/ui.js";
import { captureToGallery, initGallery } from "./js/gallery.js";

const $ = window.$;

// ─── Pointer dispatch ─────────────────────────────────────────────────────────

function handleDown(e) {
    if (state.tool === "text") {
        e.preventDefault();
        const pos = getPos(e);
        showTextInput(pos.x, pos.y);
        return;
    }
    onDown(e);
}

function handleUp(e) { onUp(e); }
function handleLeave() { onLeave(); }
function handleMove(e) { onMove(e); updateOrdinat(getPos(e).x, getPos(e).y); }

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function initKeyboard() {
    $(document).on("keydown", function (e) {
        const ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl) return;
        if (e.key === "s") {
            e.preventDefault();
            captureToGallery();
        }
    });
}

// ─── Window bridges (HTML onclick) ───────────────────────────────────────────

window.sabak_record_start = recordStart;
window.sabak_record_stop = recordStop;
window.sabak_record_toggle = recordToggle;
window.sabak_playr = play;
window.sbk_reset = resetCanvas;
window.sabak_save_recording = saveRecordingToGallery;
window.sabak_capture = captureToGallery;
window.sabak_toggle_record_mode = toggleRecordMode;
window.sabak_close_preview = closePreview;
window._undo = popUndo;
window._redo = popRedo;

// ─── Bootstrap ────────────────────────────────────────────────────────────────

$(function () {
    initCanvas();
    initCanvasSize();
    initGhost();
    initMemo();
    initColorPalette();
    initToolButtons();
    initLineWidth();
    initGallery();
    syncModeToggle();
    initTextTool();
    initKeyboard();

    updateOrdinat(0, 0);

    const $c = $(state.canvas);
    $c.on("mousemove", handleMove)
        .on("mousedown", handleDown)
        .on("mouseup", handleUp)
        .on("mouseout", handleLeave);

    const c = state.canvas;
    c.addEventListener("touchmove", handleMove, { passive: false });
    c.addEventListener("touchstart", handleDown, { passive: false });
    c.addEventListener("touchend", handleUp, { passive: false });
    c.addEventListener("touchcancel", handleLeave, { passive: false });
});
