// js/ui.js
// Toolbar wiring: colour palette, tool buttons, line width, status badges.

import { state } from "./state.js";
import { clearUndo } from "./undo.js";
import { BG_COLOR } from "./state.js";

// ─── Colour palette ───────────────────────────────────────────────────────────

export function initColorPalette() {
    const buttons = document.getElementById("sbk_color")
                             .getElementsByClassName("color-swatch");
    if (buttons.length > 0) buttons[0].classList.add("active");

    Array.from(buttons).forEach(function (btn) {
        const clr = btn.dataset.clr;
        btn.style.backgroundColor = clr;
        btn.addEventListener("click", function () {
            Array.from(document.getElementsByClassName("color-swatch"))
                 .forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            setColor(clr);
        });
    });
}

function setColor(c) {
    state.color = c;
    // If eraser was active, switch back to pen
    if (state.tool === "eraser") setTool("pen");
}

// ─── Tool buttons ─────────────────────────────────────────────────────────────

export function setTool(name) {
    state.tool = name;

    // Update cursor
    const cursors = { pen: "crosshair", eraser: "cell", line: "crosshair",
                      rect: "crosshair", circle: "crosshair", text: "text" };
    state.canvas.style.cursor = cursors[name] || "crosshair";

    // Highlight active tool button
    document.querySelectorAll(".tool-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.tool === name);
    });
}

export function initToolButtons() {
    document.querySelectorAll(".tool-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            setTool(btn.dataset.tool);
        });
    });
}

// ─── Line width ───────────────────────────────────────────────────────────────

export function initLineWidth() {
    const slider = document.getElementById("line_width");
    const label  = document.getElementById("line_width_val");
    if (!slider) return;
    function sync() {
        state.lineWidth = parseInt(slider.value, 10);
        label.textContent = state.lineWidth + "px";
    }
    slider.addEventListener("input", sync);
    sync();
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export function resetCanvas() {
    clearUndo();
    state.sbk.globalCompositeOperation = "source-over";
    state.sbk.fillStyle = BG_COLOR;
    state.sbk.fillRect(0, 0, state.canvas.width, state.canvas.height);
    setTool("pen");
    state.color = "#ffffff";
    // Re-activate first colour swatch
    const swatches = document.getElementsByClassName("color-swatch");
    Array.from(swatches).forEach(function (b) { b.classList.remove("active"); });
    if (swatches.length > 0) swatches[0].classList.add("active");
}

// ─── Status badges ────────────────────────────────────────────────────────────

export function updateDrawingBadge(isDrawing) {
    const badge = document.getElementById("badge_drawing");
    if (!badge) return;
    badge.textContent = isDrawing ? "Melukis" : "Tidak Melukis";
    badge.classList.toggle("drawing", isDrawing);
}

export function updateOrdinat(x, y) {
    const el = document.getElementById("sbk_ordinat");
    if (el) el.textContent = "X: " + Math.round(x) + "  Y: " + Math.round(y);
}
