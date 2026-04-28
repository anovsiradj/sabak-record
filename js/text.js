// js/text.js — text tool overlay + font-face/size picker popover.
// Merges tools.js text logic and font-picker.js.

import { state } from "./state.js";
import { pushUndo } from "./memo.js";
import { getPos } from "./draw.js";

const $ = window.$;

// Compensates for browser UA internal top spacing on <textarea>.
// Keeps the overlay top edge aligned with the canvas click point.
const TEXT_MAGIC_NUMBER = 6;

// ─── Text input overlay ───────────────────────────────────────────────────────

let $textInput = null;

export function showTextInput(x, y) {
    if ($textInput) removeTextInput();

    const rect   = state.canvas.getBoundingClientRect();
    const scaleX = rect.width  / state.canvas.width;
    const scaleY = rect.height / state.canvas.height;

    const screenX = rect.left + x * scaleX;
    const screenY = rect.top  + y * scaleY;

    $textInput = $("<textarea>")
        .attr({ id: "text_input_overlay", rows: 2, placeholder: "Ketik teks…" })
        .css({
            left:       screenX,
            top:        screenY - TEXT_MAGIC_NUMBER,
            color:      state.color,
            border:     "1px dashed " + state.color,
            fontSize:   state.fontSize + "px",
            fontFamily: state.fontFace,
        })
        .on("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(x, y); }
            if (e.key === "Escape") removeTextInput();
        })
        .on("blur", function () { commitText(x, y); });

    $("body").append($textInput);
    $textInput[0].focus();
}

function commitText(x, y) {
    y -= TEXT_MAGIC_NUMBER;
    if (!$textInput) return;
    const text = $textInput.val().trim();
    removeTextInput();
    if (!text) return;

    pushUndo();
    const sbk   = state.sbk;
    const lineH = state.fontSize * 1.4;
    sbk.globalCompositeOperation = "source-over";
    sbk.fillStyle    = state.color;
    sbk.font         = state.fontSize + "px " + state.fontFace;
    sbk.textBaseline = "top";
    text.split("\n").forEach(function (line, i) {
        sbk.fillText(line, x, y + i * lineH);
    });
    sbk.textBaseline = "alphabetic";
}

function removeTextInput() {
    if ($textInput) { $textInput.remove(); $textInput = null; }
}

// ─── Font enumeration ─────────────────────────────────────────────────────────

const WEB_SAFE = [
    "Arial", "Arial Black", "Comic Sans MS", "Courier New",
    "Georgia", "Impact", "Lucida Console", "Lucida Sans Unicode",
    "Palatino Linotype", "Tahoma", "Times New Roman",
    "Trebuchet MS", "Verdana",
    "sans-serif", "serif", "monospace", "cursive", "fantasy",
];

async function getAvailableFonts() {
    const names = new Set(WEB_SAFE);

    document.fonts.forEach(function (f) {
        if (f.family) names.add(f.family.replace(/['"]/g, "").trim());
    });

    if (window.queryLocalFonts) {
        try {
            const local = await window.queryLocalFonts();
            local.forEach(function (f) { names.add(f.family); });
        } catch (err) {
            console.info("text.js: queryLocalFonts unavailable:", err.message);
        }
    }

    return Array.from(names).sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
}

// ─── Font picker popover ──────────────────────────────────────────────────────

function positionPopover($trigger, $popover) {
    const r = $trigger[0].getBoundingClientRect();
    $popover.css({
        left: r.right + 6,
        top:  Math.min(r.top, window.innerHeight - $popover.outerHeight() - 8),
    });
}

export async function initTextTool() {
    const $trigger = $("#text_tool_btn");
    const $popover = $("#text_popover");
    const $select  = $("#font_face_select");
    const $size    = $("#font_size_input");
    const $preview = $("#font_preview");

    if (!$trigger.length || !$popover.length) return;

    // Populate font list
    const fonts = await getAvailableFonts();
    $select.empty();
    fonts.forEach(function (name) {
        $("<option>").val(name).text(name).appendTo($select);
    });
    $select.val(state.fontFace);
    if (!$select.val()) { $select.val("sans-serif"); state.fontFace = "sans-serif"; }
    $size.val(state.fontSize);
    updatePreview();

    $select.on("change", function () {
        state.fontFace = $select.val();
        updatePreview();
    });

    $size.on("input change", function () {
        const v = parseInt($size.val(), 10);
        if (v > 0) { state.fontSize = v; updatePreview(); }
    });

    function updatePreview() {
        $preview.css("font-family", state.fontFace).text(state.fontFace);
    }

    // Hover show/hide
    function show() { positionPopover($trigger, $popover); $popover.addClass("visible"); }
    function hide() { $popover.removeClass("visible"); }

    $trigger.on("mouseenter focus", show);
    $popover.on("mouseenter", show);

    $trigger.on("mouseleave", function () {
        setTimeout(function () {
            if (!$popover.is(":hover") && !$trigger.is(":hover")) hide();
        }, 80);
    });
    $popover.on("mouseleave", function () {
        setTimeout(function () {
            if (!$popover.is(":hover") && !$trigger.is(":hover")) hide();
        }, 80);
    });
    $trigger.on("blur", function () {
        setTimeout(function () {
            if (!$.contains($popover[0], document.activeElement)) hide();
        }, 100);
    });
}
