// js/ui.js — toolbar wiring, colour palette, line width, status badges.

import { state } from "./state.js";
import { clearUndo } from "./memo.js";
import { clearCanvas } from "./canvas.js";

const $ = window.$;

// ─── Colour palette ───────────────────────────────────────────────────────────

export function initColorPalette() {
    const $trigger  = $("#color_trigger_btn");
    const $dot      = $("#color_trigger_dot");
    const $popover  = $("#color_popover");
    const $swatches = $popover.find(".color-swatch");
    const $picker   = $("#color_picker");
    const $pickerBtn = $("#color_picker_btn");

    if (!$trigger.length || !$popover.length) return;

    // ── Popover show/hide ──────────────────────────────────────
    function positionColorPopover() {
        const r = $trigger[0].getBoundingClientRect();
        $popover.css({
            left: r.right + 6,
            top:  r.top + r.height / 2 - $popover.outerHeight() / 2,
        });
    }

    function showColorPopover() { positionColorPopover(); $popover.addClass("visible"); }
    function hideColorPopover() { $popover.removeClass("visible"); }

    $trigger.on("mouseenter focus", showColorPopover);
    $popover.on("mouseenter", showColorPopover);
    $trigger.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hideColorPopover(); }, 80);
    });
    $popover.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hideColorPopover(); }, 80);
    });
    $trigger.on("blur", function () {
        setTimeout(function () { if (!$.contains($popover[0], document.activeElement)) hideColorPopover(); }, 100);
    });

    // ── Preset swatch clicks ───────────────────────────────────
    $swatches.each(function () {
        const $btn = $(this);
        const clr  = $btn.data("clr");
        $btn.css("background-color", clr);
        $btn.on("click", function () {
            $swatches.removeClass("active");
            $pickerBtn.removeClass("active");
            $btn.addClass("active");
            setColor(clr);
        });
    });

    // Mark first swatch active on init and sync dot
    $swatches.first().addClass("active");
    $dot.css("background-color", state.color);

    // ── Custom colour picker (standalone sidebar button) ───────
    $pickerBtn.css("background-color", $picker.val());

    $picker.on("input change", function () {
        const clr = $picker.val();
        $pickerBtn.css("background-color", clr);
        $swatches.removeClass("active");
        $pickerBtn.addClass("active");
        setColor(clr);
    });

    $pickerBtn.on("click", function () {
        $swatches.removeClass("active");
        $pickerBtn.addClass("active");
    });
}

function setColor(c) {
    state.color = c;
    $("#color_trigger_dot").css("background-color", c);
    if (state.tool === "eraser") setTool("pen");
}

// ─── Tool buttons ─────────────────────────────────────────────────────────────

// Shape tools that live in the shape popover
const SHAPE_TOOLS = ["line", "rect", "circle", "triangle", "diamond", "star",
                     "arrow", "pentagon", "hexagon"];

export function setTool(name) {
    state.tool = name;
    const cursors = {
        pen: "crosshair", eraser: "cell",
        line: "crosshair", rect: "crosshair", circle: "crosshair",
        triangle: "crosshair", diamond: "crosshair", star: "crosshair",
        arrow: "crosshair", pentagon: "crosshair", hexagon: "crosshair",
        text: "text", select: "crosshair",
    };
    $(state.canvas).css("cursor", cursors[name] || "crosshair");

    // Highlight direct sidebar buttons (pen, eraser, select, text)
    // and the shape-picker trigger when a shape tool is active.
    $(".tool-btn[data-tool]").not("#shape_popover [data-tool]").each(function () {
        $(this).toggleClass("active", $(this).data("tool") === name);
    });

    // Shape trigger: active when any shape tool is selected
    const isShape = SHAPE_TOOLS.includes(name);
    $("#shape_trigger_btn").toggleClass("active", isShape);
    if (isShape) {
        const icon = $("#shape_popover [data-tool='" + name + "'] i").attr("class");
        if (icon) $("#shape_trigger_icon").attr("class", icon);
    }
}

export function initToolButtons() {
    // Direct sidebar buttons (pen, eraser, text) — not inside any popover
    $(".tool-btn[data-tool]")
        .not("#shape_popover [data-tool]")
        .not("#select_trigger_btn")   // handled by initSelectShapePopover
        .on("click", function () {
            setTool($(this).data("tool"));
        });
}

// ─── Shape popover ────────────────────────────────────────────────────────────

export function initShapePopover() {
    const $trigger = $("#shape_trigger_btn");
    const $popover = $("#shape_popover");
    if (!$trigger.length || !$popover.length) return;

    function positionShapePopover() {
        const r = $trigger[0].getBoundingClientRect();
        $popover.css({
            left: r.right + 6,
            top:  r.top + r.height / 2 - $popover.outerHeight() / 2,
        });
    }

    function showShapePopover() { positionShapePopover(); $popover.addClass("visible"); }
    function hideShapePopover() { $popover.removeClass("visible"); }

    $trigger.on("mouseenter focus", showShapePopover);
    $popover.on("mouseenter", showShapePopover);
    $trigger.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hideShapePopover(); }, 80);
    });
    $popover.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hideShapePopover(); }, 80);
    });
    $trigger.on("blur", function () {
        setTimeout(function () { if (!$.contains($popover[0], document.activeElement)) hideShapePopover(); }, 100);
    });

    $popover.find("[data-tool]").on("click", function () {
        setTool($(this).data("tool"));
        hideShapePopover();
    });
}

// ─── Select shape popover ─────────────────────────────────────────────────────

export function initSelectShapePopover() {
    const $trigger = $("#select_trigger_btn");
    const $popover = $("#select_shape_popover");
    if (!$trigger.length || !$popover.length) return;

    function positionSelectPopover() {
        const r = $trigger[0].getBoundingClientRect();
        $popover.css({
            left: r.right + 6,
            top:  r.top + r.height / 2 - $popover.outerHeight() / 2,
        });
    }

    function showSelectPopover() { positionSelectPopover(); $popover.addClass("visible"); }
    function hideSelectPopover() { $popover.removeClass("visible"); }

    $trigger.on("mouseenter focus", showSelectPopover);
    $popover.on("mouseenter", showSelectPopover);
    $trigger.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hideSelectPopover(); }, 80);
    });
    $popover.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hideSelectPopover(); }, 80);
    });
    $trigger.on("blur", function () {
        setTimeout(function () { if (!$.contains($popover[0], document.activeElement)) hideSelectPopover(); }, 100);
    });

    // Clicking the trigger itself activates the select tool
    $trigger.on("click", function () {
        setTool("select");
    });

    // Shape-mode buttons inside the popover
    $popover.find("[data-shape]").on("click", function () {
        const shape = $(this).data("shape");
        state.selectShapeMode = shape;
        $popover.find("[data-shape]").removeClass("active");
        $(this).addClass("active");
        // Ensure select tool is active
        setTool("select");
        hideSelectPopover();
    });
}

// ─── Line width — hover-reveal popover (body-level, JS-positioned) ───────────

export function initLineWidth() {
    const $slider  = $("#line_width");
    const $label   = $("#line_width_val");
    const $preview = $("#line_width_preview");
    const $trigger = $("#lw_trigger_btn");
    const $popover = $("#lw_popover");
    if (!$slider.length || !$trigger.length || !$popover.length) return;

    function positionPopover() {
        const r = $trigger[0].getBoundingClientRect();
        $popover.css({
            left: r.right + 6,
            top:  r.top + r.height / 2 - $popover.outerHeight() / 2,
        });
    }

    function showPopover() { positionPopover(); $popover.addClass("visible"); }
    function hidePopover() { $popover.removeClass("visible"); }

    $trigger.on("mouseenter focus", showPopover);
    $popover.on("mouseenter", showPopover);
    $trigger.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hidePopover(); }, 80);
    });
    $popover.on("mouseleave", function () {
        setTimeout(function () { if (!$popover.is(":hover") && !$trigger.is(":hover")) hidePopover(); }, 80);
    });
    $trigger.on("blur", function () {
        setTimeout(function () { if (!$.contains($popover[0], document.activeElement)) hidePopover(); }, 100);
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
    $("#color_popover .color-swatch").removeClass("active");
    $("#color_popover .color-swatch").first().addClass("active");
    $("#color_picker_btn").removeClass("active");
    $("#color_picker").val("#ffffff");
    $("#color_trigger_dot").css("background-color", "#ffffff");
    $("#color_picker_btn").css("background-color", "#ffffff");
}

// ─── Status badges ────────────────────────────────────────────────────────────

export function updateOrdinat(x, y) {
    $("#sbk_ordinat").text("X: " + Math.round(x) + "  Y: " + Math.round(y));
}
