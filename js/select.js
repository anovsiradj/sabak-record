// js/select.js — Selection Tool module.
// Allows users to select a canvas region using any shape boundary,
// then move or delete the selected pixels.

import { state, BG_COLOR } from "./state.js";
import { pushUndo } from "./memo.js";
import { getGhostCtx, clearGhost, SHAPE_PATH_FNS, getPos } from "./draw.js";

const $ = window.$;

// ─── Module-level state ───────────────────────────────────────────────────────

let anchorX = 0, anchorY = 0;       // mousedown point
let curX    = 0, curY    = 0;       // current pointer position
let isSelecting  = false;           // drag gesture in progress
let hasSelection = false;           // selection finalised
let selX1 = 0, selY1 = 0;          // bounding box of finalised selection (top-left)
let selX2 = 0, selY2 = 0;          // bounding box of finalised selection (bottom-right)
let freeformPath = [];              // [{x,y}] for pen/freeform mode
let copiedPixels = null;            // ImageData of the copied region
let isDraggingMove = false;         // move drag in progress
let moveOffsetX = 0, moveOffsetY = 0;

// ─── Bounding box helper ──────────────────────────────────────────────────────

/**
 * Computes the axis-aligned bounding box of an array of {x,y} points.
 * Returns {x1, y1, x2, y2} where (x1,y1) is top-left, (x2,y2) is bottom-right.
 */
function pathBBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
    }
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns true if the point (px, py) is inside the current selection boundary.
 * For rectangular selections uses a simple AABB test.
 * For all other shapes, uses canvas hit-testing via isPointInPath.
 */
function isInsideSelection(px, py) {
    if (!hasSelection) return false;

    if (state.selectShapeMode === "rect") {
        return px >= selX1 && px <= selX2 && py >= selY1 && py <= selY2;
    }

    // For non-rectangular shapes, use an offscreen canvas for hit-testing
    const offscreen = document.createElement("canvas");
    offscreen.width  = state.canvas.width;
    offscreen.height = state.canvas.height;
    const octx = offscreen.getContext("2d");

    if (state.selectShapeMode === "pen") {
        octx.beginPath();
        freeformPath.forEach((pt, i) => i === 0 ? octx.moveTo(pt.x, pt.y) : octx.lineTo(pt.x, pt.y));
        octx.closePath();
    } else {
        const fn = SHAPE_PATH_FNS[state.selectShapeMode];
        if (fn) {
            octx.beginPath();
            fn(octx, selX1, selY1, selX2, selY2);
        }
    }
    return octx.isPointInPath(px, py);
}

/**
 * Builds the selection path on the given context using the current shape mode
 * and the finalised selection bounding box.
 */
function buildSelectionPath(ctx) {
    if (state.selectShapeMode === "pen") {
        ctx.beginPath();
        freeformPath.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
    } else {
        const fn = SHAPE_PATH_FNS[state.selectShapeMode];
        if (fn) {
            ctx.beginPath();
            fn(ctx, selX1, selY1, selX2, selY2);
        }
    }
}

/**
 * Draws the dashed selection boundary on the ghost canvas during a gesture.
 * Freeform: traces the live freeformPath.
 * Shapes: uses anchorX/anchorY → curX/curY bounding box.
 */
function drawOverlay() {
    const ctx = getGhostCtx();
    clearGhost();
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth   = 1.5;
    ctx.globalCompositeOperation = "source-over";

    if (state.selectShapeMode === "pen") {
        if (freeformPath.length < 2) { ctx.restore(); return; }
        ctx.beginPath();
        freeformPath.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        // Draw a closing line back to start so the user can see the shape forming
        ctx.lineTo(freeformPath[0].x, freeformPath[0].y);
        ctx.stroke();
    } else {
        const fn = SHAPE_PATH_FNS[state.selectShapeMode];
        if (fn) {
            ctx.beginPath();
            fn(ctx, anchorX, anchorY, curX, curY);
            ctx.stroke();
        }
    }
    ctx.restore();
}

/**
 * Draws the finalised selection overlay.
 * Uses freeformPath for pen mode, selX1/selY1→selX2/selY2 for shapes.
 */
function drawFinalOverlay() {
    const ctx = getGhostCtx();
    clearGhost();
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth   = 1.5;
    ctx.globalCompositeOperation = "source-over";

    if (state.selectShapeMode === "pen") {
        ctx.beginPath();
        freeformPath.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
        ctx.stroke();
    } else {
        const fn = SHAPE_PATH_FNS[state.selectShapeMode];
        if (fn) {
            ctx.beginPath();
            fn(ctx, selX1, selY1, selX2, selY2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

/**
 * Renders copiedPixels on the ghost canvas at the current move offset.
 */
function renderMovePreview() {
    const ctx = getGhostCtx();
    clearGhost();

    if (!copiedPixels) return;

    // selX1/selY1 is always the top-left of the bounding box
    const dropX = selX1 + moveOffsetX;
    const dropY = selY1 + moveOffsetY;

    const offscreen = document.createElement("canvas");
    offscreen.width  = copiedPixels.width;
    offscreen.height = copiedPixels.height;
    offscreen.getContext("2d").putImageData(copiedPixels, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(offscreen, dropX, dropY);
    ctx.restore();
}

// ─── Exported event handlers ──────────────────────────────────────────────────

export function onSelectDown(e) {
    e.preventDefault();
    const pos = getPos(e);

    // "arrow" was removed from selection shapes — fall back to rect
    if (state.selectShapeMode === "arrow") state.selectShapeMode = "rect";

    // Guard against double-down during move drag
    if (isDraggingMove) return;

    // Active selection: click inside → start move drag, click outside → cancel
    if (hasSelection && isInsideSelection(pos.x, pos.y)) {
        isDraggingMove = true;
        moveOffsetX = 0;
        moveOffsetY = 0;

        // Capture pixels from the bounding box
        const w = selX2 - selX1;
        const h = selY2 - selY1;
        copiedPixels = state.sbk.getImageData(selX1, selY1, w, h);

        // Erase the vacated area
        const sbk = state.sbk;
        sbk.save();
        sbk.globalCompositeOperation = "source-over";
        if (state.selectShapeMode === "rect") {
            sbk.fillStyle = BG_COLOR;
            sbk.fillRect(selX1, selY1, w, h);
        } else {
            buildSelectionPath(sbk);
            sbk.clip();
            sbk.fillStyle = BG_COLOR;
            sbk.fillRect(selX1, selY1, w, h);
        }
        sbk.restore();

        anchorX = pos.x;
        anchorY = pos.y;
        return;
    }

    if (hasSelection) {
        cancelSelection();
    }

    // Start a new selection gesture
    anchorX = pos.x;
    anchorY = pos.y;
    curX    = pos.x;
    curY    = pos.y;
    isSelecting  = true;
    hasSelection = false;
    freeformPath = [];

    if (state.selectShapeMode === "pen") {
        freeformPath.push({ x: pos.x, y: pos.y });
    }
}

export function onSelectMove(e) {
    e.preventDefault();
    const pos = getPos(e);

    if (isDraggingMove) {
        moveOffsetX = pos.x - anchorX;
        moveOffsetY = pos.y - anchorY;
        renderMovePreview();
        return;
    }

    if (!isSelecting) return;

    curX = pos.x;
    curY = pos.y;

    if (state.selectShapeMode === "pen") {
        freeformPath.push({ x: pos.x, y: pos.y });
    }

    drawOverlay();
}

export function onSelectUp(e) {
    e.preventDefault();
    const pos = getPos(e);

    if (isDraggingMove) {
        isDraggingMove = false;

        const w = selX2 - selX1;
        const h = selY2 - selY1;
        const rawDropX = selX1 + moveOffsetX;
        const rawDropY = selY1 + moveOffsetY;
        const clampedX = Math.max(0, Math.min(state.canvas.width  - w, rawDropX));
        const clampedY = Math.max(0, Math.min(state.canvas.height - h, rawDropY));
        const dx = clampedX - selX1;
        const dy = clampedY - selY1;

        const sbk = state.sbk;

        if (state.selectShapeMode === "rect") {
            sbk.putImageData(copiedPixels, clampedX, clampedY);
        } else {
            const offscreen = document.createElement("canvas");
            offscreen.width  = copiedPixels.width;
            offscreen.height = copiedPixels.height;
            offscreen.getContext("2d").putImageData(copiedPixels, 0, 0);

            sbk.save();
            sbk.globalCompositeOperation = "source-over";

            // Rebuild the shape path at the new (translated) position
            if (state.selectShapeMode === "pen") {
                sbk.beginPath();
                freeformPath.forEach((pt, i) => {
                    if (i === 0) sbk.moveTo(pt.x + dx, pt.y + dy);
                    else         sbk.lineTo(pt.x + dx, pt.y + dy);
                });
                sbk.closePath();
            } else {
                const fn = SHAPE_PATH_FNS[state.selectShapeMode];
                if (fn) {
                    sbk.beginPath();
                    fn(sbk, selX1 + dx, selY1 + dy, selX2 + dx, selY2 + dy);
                }
            }
            sbk.clip();
            sbk.drawImage(offscreen, clampedX, clampedY);
            sbk.restore();
        }

        // Update bounding box and freeform path to new position
        selX1 += dx;  selY1 += dy;
        selX2 += dx;  selY2 += dy;
        if (state.selectShapeMode === "pen") {
            freeformPath = freeformPath.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
        }

        copiedPixels = null;
        moveOffsetX  = 0;
        moveOffsetY  = 0;

        clearGhost();
        drawFinalOverlay();
        pushUndo();
        return;
    }

    if (!isSelecting) return;
    isSelecting = false;

    curX = pos.x;
    curY = pos.y;

    if (state.selectShapeMode === "pen") {
        freeformPath.push({ x: pos.x, y: pos.y });
    }

    // Zero-area guard
    if (Math.hypot(curX - anchorX, curY - anchorY) < 2) {
        clearGhost();
        hasSelection = false;
        freeformPath = [];
        return;
    }

    // Freeform: need at least a few points to form a meaningful region
    if (state.selectShapeMode === "pen" && freeformPath.length < 3) {
        clearGhost();
        hasSelection = false;
        freeformPath = [];
        return;
    }

    // Compute the bounding box.
    // For freeform: use the actual path bounding box (not just start→end).
    // For shapes: use the drag bounding box (normalised so x1<x2, y1<y2).
    if (state.selectShapeMode === "pen") {
        const bb = pathBBox(freeformPath);
        selX1 = Math.floor(bb.x1);
        selY1 = Math.floor(bb.y1);
        selX2 = Math.ceil(bb.x2);
        selY2 = Math.ceil(bb.y2);
    } else {
        selX1 = Math.min(anchorX, curX);
        selY1 = Math.min(anchorY, curY);
        selX2 = Math.max(anchorX, curX);
        selY2 = Math.max(anchorY, curY);
    }

    hasSelection = true;
    drawFinalOverlay();
}

export function onSelectLeave() {
    if (isSelecting) {
        isSelecting  = false;
        freeformPath = [];
        clearGhost();
        if (hasSelection) drawFinalOverlay();
    }
}

export function deleteSelection() {
    if (!hasSelection) return;

    const w = selX2 - selX1;
    const h = selY2 - selY1;

    const sbk = state.sbk;
    sbk.save();
    sbk.globalCompositeOperation = "source-over";

    if (state.selectShapeMode === "rect") {
        sbk.fillStyle = BG_COLOR;
        sbk.fillRect(selX1, selY1, w, h);
    } else {
        buildSelectionPath(sbk);
        sbk.clip();
        sbk.fillStyle = BG_COLOR;
        sbk.fillRect(selX1, selY1, w, h);
    }

    sbk.restore();
    clearGhost();
    pushUndo();

    hasSelection   = false;
    isSelecting    = false;
    freeformPath   = [];
    copiedPixels   = null;
    isDraggingMove = false;
}

export function cancelSelection() {
    hasSelection   = false;
    isSelecting    = false;
    isDraggingMove = false;
    freeformPath   = [];
    copiedPixels   = null;
    anchorX = anchorY = 0;
    curX    = curY    = 0;
    selX1 = selY1 = selX2 = selY2 = 0;
    moveOffsetX = moveOffsetY = 0;
    clearGhost();
}

// ─── Initialisation ───────────────────────────────────────────────────────────

export function initSelectTool() {
    $(document).on("keydown", function (e) {
        if (state.tool !== "select") return;
        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            deleteSelection();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancelSelection();
        }
    });

    $(document).on("click", "#select_shape_popover [data-shape]", function () {
        state.selectShapeMode = $(this).data("shape");
        $("#select_shape_popover [data-shape]").removeClass("active");
        $(this).addClass("active");
        if (hasSelection || isSelecting) cancelSelection();
    });
}
