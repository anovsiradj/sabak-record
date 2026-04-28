// js/ui.js — toolbar wiring, colour palette, line width, status badges.

import { state, BG_COLOR } from "./state.js";
import { clearUndo } from "./memo.js";
import { clearCanvas } from "./canvas.js";

const $ = window.$;

// ─── Colour palette ───────────────────────────────────────────────────────────

export function initColorPalette() {
    const $swatches = $("#sbk_color .color-swatch:not(.color-swatch-picker)");
    $swatches.first().addClass("active");

    // Static swatches
    $swatches.each(function () {
        const $btn = $(this);
        const clr = $btn.data("clr");
        $btn.css("background-color", clr);
        $btn.on("click", function () {
            $(".color-swatch").removeClass("active");
            $btn.addClass("active");
            setColor(clr);
        });
    });

    // Custom colour picker
    const $pickerLabel = $(".color-swatch-picker");
    const $picker = $("#color_picker");

    // Sync picker background to its current value on init
    $pickerLabel.css("background-color", $picker.val());

    $picker.on("input change", function () {
        const clr = $picker.val();
        $pickerLabel.css("background-color", clr);
        $(".color-swatch").removeClass("active");
        $pickerLabel.addClass("active");
        setColor(clr);
    });

    // Clicking the label activates it visually even before the picker opens
    $pickerLabel.on("click", function () {
        $(".color-swatch").removeClass("active");
        $pickerLabel.addClass("active");
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
    $(state.canvas).css("cursor", cursors[name] || "crosshair");
    $(".tool-btn").each(function () {
        $(this).toggleClass("active", $(this).data("tool") === name);
    });
}

export function initToolButtons() {
    $(".tool-btn").on("click", function () {
        setTool($(this).data("tool"));
    });
}

// ─── Line width — hover-reveal popover (body-level, JS-positioned) ───────────

export function initLineWidth() {
    const $slider = $("#line_width");
    const $label = $("#line_width_val");
    const $preview = $("#line_width_preview");
    const $trigger = $("#lw_trigger_btn");
    const $popover = $("#lw_popover");
    if (!$slider.length || !$trigger.length || !$popover.length) return;

    function positionPopover() {
        const r = $trigger[0].getBoundingClientRect();
        $popover.css({
            left: r.right + 6,
            top: r.top + r.height / 2 - $popover.outerHeight() / 2,
        });
    }

    function showPopover() {
        positionPopover();
        $popover.addClass("visible");
    }

    function hidePopover() {
        $popover.removeClass("visible");
    }

    $trigger.on("mouseenter focus", showPopover);
    $popover.on("mouseenter", showPopover);

    $trigger.on("mouseleave", function () {
        setTimeout(function () {
            if (!$popover.is(":hover") && !$trigger.is(":hover")) hidePopover();
        }, 80);
    });
    $popover.on("mouseleave", function () {
        setTimeout(function () {
            if (!$popover.is(":hover") && !$trigger.is(":hover")) hidePopover();
        }, 80);
    });
    $trigger.on("blur", function () {
        setTimeout(function () {
            if (!$.contains($popover[0], document.activeElement)) hidePopover();
        }, 100);
    });

    function sync() {
        state.lineWidth = parseInt($slider.val(), 10);
        $label.text(state.lineWidth + "px");
        const size = Math.max(state.lineWidth, 2);
        $preview.css({ width: size, height: size });
        positionPopover();
    }

    $slider.on("input", sync);
    sync();
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export function resetCanvas() {
    clearUndo();
    clearCanvas();
    setTool("pen");
    state.color = "#ffffff";
    $(".color-swatch").removeClass("active");
    $("#sbk_color .color-swatch:not(.color-swatch-picker)").first().addClass("active");
}

// ─── Status badges ────────────────────────────────────────────────────────────

export function updateDrawingBadge(isDrawing) {
    $("#badge_drawing")
        .text(isDrawing ? "Melukis" : "Tidak Melukis")
        .toggleClass("drawing", isDrawing);
}

export function updateOrdinat(x, y) {
    $("#sbk_ordinat").text("X: " + Math.round(x) + "  Y: " + Math.round(y));
}
