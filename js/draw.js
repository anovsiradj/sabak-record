// js/draw.js — pen, eraser, and shape tools (line, rect, circle).
// Ghost canvas provides live shape preview without dirtying the main canvas.

import { state } from "./state.js";
import { pushUndo } from "./memo.js";

const $ = window.$;

// ─── Ghost canvas ─────────────────────────────────────────────────────────────

let ghost  = null;
let gctx   = null;
let startX = 0, startY = 0;
let p_x    = 0, p_y    = 0;

export function initGhost() {
    ghost        = document.createElement("canvas");
    ghost.id     = "ghost";
    ghost.width  = state.canvas.width;
    ghost.height = state.canvas.height;

    $(ghost).css({
        position:      "absolute",
        top:           0,
        left:          0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
        zIndex:        1,
    });

    const $wrapper = $(state.canvas).parent();
    let $inner = $wrapper.find(".canvas-inner");
    if (!$inner.length) {
        $inner = $("<div>").addClass("canvas-inner");
        $wrapper.prepend($inner);
        $inner.append(state.canvas);
    }
    $inner.append(ghost);
    gctx = ghost.getContext("2d");
}

export function resizeGhost(w, h) {
    if (ghost) { ghost.width = w; ghost.height = h; }
}

// ─── Style helper ─────────────────────────────────────────────────────────────

function applyStyle(ctx) {
    ctx.strokeStyle              = state.color;
    ctx.lineWidth                = state.lineWidth;
    ctx.lineCap                  = "round";
    ctx.lineJoin                 = "round";
    ctx.globalCompositeOperation = "source-over";
}

// ─── Event handlers ───────────────────────────────────────────────────────────

export function onDown(e) {
    e.preventDefault();
    const pos = getPos(e);

    state.isDrawing = true;
    startX = p_x = pos.x;
    startY = p_y = pos.y;

    if (state.tool === "pen" || state.tool === "eraser") {
        pushUndo();
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
        gctx.beginPath();
        gctx.ellipse(startX + dx / 2, startY + dy / 2,
                     Math.abs(dx) / 2, Math.abs(dy) / 2, 0, 0, Math.PI * 2);
        gctx.stroke();
    }
}

export function onUp(e) {
    if (!state.isDrawing) return;
    state.isDrawing = false;

    if (state.tool === "pen" || state.tool === "eraser") {
        state.sbk.globalCompositeOperation = "source-over";
        return;
    }

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
        state.sbk.beginPath();
        state.sbk.ellipse(startX + dx / 2, startY + dy / 2,
                          Math.abs(dx) / 2, Math.abs(dy) / 2, 0, 0, Math.PI * 2);
        state.sbk.stroke();
    }

    gctx.clearRect(0, 0, ghost.width, ghost.height);
}

export function onLeave() {
    if (state.isDrawing && (state.tool === "pen" || state.tool === "eraser")) {
        state.isDrawing = false;
        state.sbk.globalCompositeOperation = "source-over";
    }
}

// ─── Coordinate helper ────────────────────────────────────────────────────────

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
