// js/ui.js
// Toolbar wiring: colour palette, tool buttons, line width, status badges.

import { state, BG_COLOR } from "./state.js";
import { clearUndo } from "./undo.js";

// ─── Colour palette ───────────────────────────────────────────────────────────

export function initColorPalette() {
    const container = document.getElementById("sbk_color");
    if (!container) return;
    const buttons = container.getElementsByClassName("color-swatch");
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
    if (state.tool === "eraser") setTool("pen");
}

// ─── Tool buttons ─────────────────────────────────────────────────────────────

export function setTool(name) {
    state.tool = name;
    const cursors = {
        pen: "crosshair", eraser: "cell",
        line: "crosshair", rect: "crosshair", circle: "crosshair", text: "text",
    };
    state.canvas.style.cursor = cursors[name] || "crosshair";
    document.querySelectorAll(".tool-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.tool === name);
    });
}

export function initToolButtons() {
    document.querySelectorAll(".tool-btn").forEach(function (btn) {
        btn.addEventListener("click", function () { setTool(btn.dataset.tool); });
    });
}

// ─── Line width — hover-reveal popover (body-level, JS-positioned) ───────────

export function initLineWidth() {
    const slider   = document.getElementById("line_width");
    const label    = document.getElementById("line_width_val");
    const preview  = document.getElementById("line_width_preview");
    const trigger  = document.getElementById("lw_trigger_btn");
    const popover  = document.getElementById("lw_popover");
    if (!slider || !trigger || !popover) return;

    // Position popover to the right of the trigger button
    function positionPopover() {
        const r = trigger.getBoundingClientRect();
        popover.style.left = (r.right + 6) + "px";
        popover.style.top  = (r.top + r.height / 2 - popover.offsetHeight / 2) + "px";
    }

    function showPopover() {
        positionPopover();
        popover.classList.add("visible");
    }

    function hidePopover() {
        popover.classList.remove("visible");
    }

    // Show on trigger hover/focus
    trigger.addEventListener("mouseenter", showPopover);
    trigger.addEventListener("focus",      showPopover);

    // Keep visible while hovering the popover itself
    popover.addEventListener("mouseenter", showPopover);

    // Hide when leaving both
    trigger.addEventListener("mouseleave", function () {
        // Small delay so mouse can travel to popover without it vanishing
        setTimeout(function () {
            if (!popover.matches(":hover") && !trigger.matches(":hover")) hidePopover();
        }, 80);
    });
    popover.addEventListener("mouseleave", function () {
        setTimeout(function () {
            if (!popover.matches(":hover") && !trigger.matches(":hover")) hidePopover();
        }, 80);
    });
    trigger.addEventListener("blur", function () {
        setTimeout(function () {
            if (!popover.contains(document.activeElement)) hidePopover();
        }, 100);
    });

    function sync() {
        state.lineWidth = parseInt(slider.value, 10);
        if (label)   label.textContent = state.lineWidth + "px";
        if (preview) {
            const size = Math.max(state.lineWidth, 2);
            preview.style.width  = size + "px";
            preview.style.height = size + "px";
        }
        // Re-position in case popover height changed
        positionPopover();
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
