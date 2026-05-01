// js/draw.js — pen, eraser, and shape tools (line, rect, circle).
// Ghost canvas provides live shape preview without dirtying the main canvas.

import { state, BG_COLOR } from "./state.js";
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

export function getGhostCtx() { return gctx; }
export function getGhost()    { return ghost; }
export function clearGhost()  { gctx.clearRect(0, 0, ghost.width, ghost.height); }

// ─── Shape path functions ─────────────────────────────────────────────────────
// Each function builds a path on `ctx` for the given bounding box (x1,y1)→(x2,y2).
// None of them call stroke() or fill() — the caller is responsible for styling.

export function pathTriangle(ctx, x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2;
    ctx.beginPath();
    ctx.moveTo(cx, y1);
    ctx.lineTo(x1, y2);
    ctx.lineTo(x2, y2);
    ctx.closePath();
}

export function pathDiamond(ctx, x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    ctx.beginPath();
    ctx.moveTo(cx, y1);
    ctx.lineTo(x2, cy);
    ctx.lineTo(cx, y2);
    ctx.lineTo(x1, cy);
    ctx.closePath();
}

export function pathStar(ctx, x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const w  = Math.abs(x2 - x1);
    const h  = Math.abs(y2 - y1);
    const r  = Math.min(w, h) / 2;
    const ri = r * 0.382;
    const points = 5;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const angle  = (i * Math.PI) / points - Math.PI / 2;
        const radius = i % 2 === 0 ? r : ri;
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
    }
    ctx.closePath();
}

export function pathArrow(ctx, x1, y1, x2, y2) {
    const dx    = x2 - x1;
    const dy    = y2 - y1;
    const len   = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const hw = Math.min(len * 0.35, 30);
    const hl = Math.min(len * 0.4,  40);
    const sw = Math.max(len * 0.12,  4);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0,        -sw);
    ctx.lineTo(len - hl, -sw);
    ctx.lineTo(len - hl, -hw);
    ctx.lineTo(len,        0);
    ctx.lineTo(len - hl,  hw);
    ctx.lineTo(len - hl,  sw);
    ctx.lineTo(0,         sw);
    ctx.closePath();

    ctx.restore();
}

export function pathPentagon(ctx, x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const w  = Math.abs(x2 - x1);
    const h  = Math.abs(y2 - y1);
    const r  = Math.min(w, h) / 2;
    const sides = 5;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
    }
    ctx.closePath();
}

export function pathHexagon(ctx, x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const w  = Math.abs(x2 - x1);
    const h  = Math.abs(y2 - y1);
    const r  = Math.min(w, h) / 2;
    const sides = 6;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
    }
    ctx.closePath();
}

export const SHAPE_PATH_FNS = {
    triangle: pathTriangle,
    diamond:  pathDiamond,
    star:     pathStar,
    arrow:    pathArrow,
    pentagon: pathPentagon,
    hexagon:  pathHexagon,
    rect:     (ctx, x1, y1, x2, y2) => ctx.rect(x1, y1, x2 - x1, y2 - y1),
    circle:   (ctx, x1, y1, x2, y2) => {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        ctx.ellipse(cx, cy, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    },
    line:     (ctx, x1, y1, x2, y2) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); },
};

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
            // Paint BG_COLOR so eraser works correctly on any background
            sbk.globalCompositeOperation = "source-over";
            sbk.strokeStyle = BG_COLOR;
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

    const fn = SHAPE_PATH_FNS[state.tool];
    if (fn) {
        gctx.beginPath();
        fn(gctx, startX, startY, pos.x, pos.y);
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

    // Zero-area guard: skip commit if drag distance < 2px
    if (Math.hypot(pos.x - startX, pos.y - startY) < 2) {
        gctx.clearRect(0, 0, ghost.width, ghost.height);
        return;
    }

    pushUndo();
    applyStyle(state.sbk);

    const fn = SHAPE_PATH_FNS[state.tool];
    if (fn) {
        state.sbk.beginPath();
        fn(state.sbk, startX, startY, pos.x, pos.y);
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
