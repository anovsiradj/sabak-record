// js/tools.js
// Handles all drawing tools: pen, eraser, line, rect, circle, text.
// Shape tools use a ghost canvas for live preview without dirtying the main canvas.

import { state } from "./state.js";
import { pushUndo } from "./undo.js";

// ─── Ghost canvas (shape preview) ────────────────────────────────────────────

let ghost = null;   // <canvas> overlay for shape preview
let gctx  = null;   // its 2d context
let startX = 0, startY = 0; // pointer-down position

function initGhost() {
    ghost = document.createElement("canvas");
    ghost.id = "ghost";
    ghost.width  = state.canvas.width;
    ghost.height = state.canvas.height;
    ghost.style.position      = "absolute";
    ghost.style.top           = "0";
    ghost.style.left          = "0";
    ghost.style.width         = "100%";
    ghost.style.height        = "100%";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex        = "1";

    // Wrap canvas + ghost in a relative-positioned inner div
    // so the wrapper itself stays out of the stacking context
    // (keeps header dropdowns above the canvas area)
    const wrapper = state.canvas.parentElement;
    let inner = wrapper.querySelector(".canvas-inner");
    if (!inner) {
        inner = document.createElement("div");
        inner.className = "canvas-inner";
        wrapper.insertBefore(inner, state.canvas);
        inner.appendChild(state.canvas);
    }
    inner.appendChild(ghost);
    gctx = ghost.getContext("2d");
}

function applyStyle(ctx) {
    ctx.strokeStyle = state.color;
    ctx.lineWidth   = state.lineWidth;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.globalCompositeOperation = "source-over";
}

// ─── Text input overlay ───────────────────────────────────────────────────────

let textInput = null;

function showTextInput(x, y) {
    if (textInput) removeTextInput();

    const rect = state.canvas.getBoundingClientRect();
    const scaleX = rect.width  / state.canvas.width;
    const scaleY = rect.height / state.canvas.height;

    textInput = document.createElement("textarea");
    textInput.id = "text_input_overlay";
    textInput.rows = 2;
    textInput.placeholder = "Ketik teks…";
    textInput.style.position   = "absolute";
    textInput.style.left       = (rect.left + x * scaleX) + "px";
    textInput.style.top        = (rect.top  + y * scaleY + window.scrollY) + "px";
    textInput.style.minWidth   = "120px";
    textInput.style.background = "rgba(0,0,0,0.75)";
    textInput.style.color      = state.color;
    textInput.style.border     = "1px dashed " + state.color;
    textInput.style.borderRadius = "4px";
    textInput.style.padding    = "4px 6px";
    textInput.style.fontSize   = Math.max(14, state.lineWidth * 4) + "px";
    textInput.style.resize     = "both";
    textInput.style.zIndex     = "100";
    textInput.style.outline    = "none";
    document.body.appendChild(textInput);
    textInput.focus();

    // Commit on Enter (without Shift), or on blur
    textInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commitText(x, y);
        }
        if (e.key === "Escape") {
            removeTextInput();
        }
    });
    textInput.addEventListener("blur", function () {
        commitText(x, y);
    });
}

function commitText(x, y) {
    if (!textInput) return;
    const text = textInput.value.trim();
    removeTextInput();
    if (!text) return;

    pushUndo();
    const sbk = state.sbk;
    sbk.globalCompositeOperation = "source-over";
    sbk.fillStyle = state.color;
    sbk.font = Math.max(14, state.lineWidth * 4) + "px sans-serif";
    // Support multi-line
    const lines = text.split("\n");
    const lineH = Math.max(14, state.lineWidth * 4) * 1.4;
    lines.forEach(function (line, i) {
        sbk.fillText(line, x, y + i * lineH);
    });
}

function removeTextInput() {
    if (textInput && textInput.parentElement) {
        textInput.parentElement.removeChild(textInput);
    }
    textInput = null;
}

// ─── Pointer helpers ──────────────────────────────────────────────────────────

export function getPos(e) {
    const rect   = state.canvas.getBoundingClientRect();
    const scaleX = state.canvas.width  / rect.width;
    const scaleY = state.canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top)  * scaleY,
    };
}

// ─── Pen / Eraser state ───────────────────────────────────────────────────────

let p_x = 0, p_y = 0; // previous position for pen strokes

// ─── Event handlers ───────────────────────────────────────────────────────────

export function onDown(e) {
    e.preventDefault();
    const pos = getPos(e);

    if (state.tool === "text") {
        showTextInput(pos.x, pos.y);
        return;
    }

    state.isDrawing = true;
    startX = pos.x;
    startY = pos.y;
    p_x    = pos.x;
    p_y    = pos.y;

    if (state.tool === "pen" || state.tool === "eraser") {
        pushUndo(); // snapshot before stroke begins
        const sbk = state.sbk;
        if (state.tool === "eraser") {
            sbk.globalCompositeOperation = "destination-out";
            sbk.strokeStyle = "rgba(0,0,0,1)";
            sbk.lineWidth   = state.lineWidth * 4;
        } else {
            applyStyle(sbk);
        }
        sbk.beginPath();
        sbk.moveTo(pos.x, pos.y);
    }
}

export function onMove(e) {
    e.preventDefault();
    if (!state.isDrawing) return;

    const pos = getPos(e);

    if (state.tool === "pen" || state.tool === "eraser") {
        const sbk = state.sbk;
        sbk.moveTo(p_x, p_y);
        sbk.lineTo(pos.x, pos.y);
        sbk.stroke();
        p_x = pos.x;
        p_y = pos.y;
        return;
    }

    // Shape preview on ghost canvas
    gctx.clearRect(0, 0, ghost.width, ghost.height);
    applyStyle(gctx);

    const dx = pos.x - startX;
    const dy = pos.y - startY;

    if (state.tool === "line") {
        gctx.beginPath();
        gctx.moveTo(startX, startY);
        gctx.lineTo(pos.x, pos.y);
        gctx.stroke();
    } else if (state.tool === "rect") {
        gctx.strokeRect(startX, startY, dx, dy);
    } else if (state.tool === "circle") {
        const rx = Math.abs(dx) / 2;
        const ry = Math.abs(dy) / 2;
        const cx = startX + dx / 2;
        const cy = startY + dy / 2;
        gctx.beginPath();
        gctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        gctx.stroke();
    }
}

export function onUp(e) {
    if (!state.isDrawing) return;
    state.isDrawing = false;

    if (state.tool === "pen" || state.tool === "eraser") {
        // Stroke already committed incrementally — restore composite op
        state.sbk.globalCompositeOperation = "source-over";
        return;
    }

    // Commit shape from ghost to main canvas
    const pos = getPos(e);
    const dx  = pos.x - startX;
    const dy  = pos.y - startY;

    pushUndo();
    applyStyle(state.sbk);

    if (state.tool === "line") {
        state.sbk.beginPath();
        state.sbk.moveTo(startX, startY);
        state.sbk.lineTo(pos.x, pos.y);
        state.sbk.stroke();
    } else if (state.tool === "rect") {
        state.sbk.strokeRect(startX, startY, dx, dy);
    } else if (state.tool === "circle") {
        const rx = Math.abs(dx) / 2;
        const ry = Math.abs(dy) / 2;
        const cx = startX + dx / 2;
        const cy = startY + dy / 2;
        state.sbk.beginPath();
        state.sbk.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        state.sbk.stroke();
    }

    // Clear ghost overlay
    gctx.clearRect(0, 0, ghost.width, ghost.height);
}

export function onLeave() {
    if (state.isDrawing && (state.tool === "pen" || state.tool === "eraser")) {
        state.isDrawing = false;
        state.sbk.globalCompositeOperation = "source-over";
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initTools() {
    initGhost();
}
