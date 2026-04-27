// js/font-picker.js
// Populates the font-face <select> from:
//   1. window.queryLocalFonts() — Local Font Access API (Chrome 103+)
//   2. Fonts already loaded on the page via FontFace / document.fonts
//   3. A curated web-safe fallback list
// Wires font-face and font-size controls to state.

import { state } from "./state.js";

const $ = window.$;

// ─── Fallback font list ───────────────────────────────────────────────────────

const WEB_SAFE = [
    "Arial", "Arial Black", "Comic Sans MS", "Courier New",
    "Georgia", "Impact", "Lucida Console", "Lucida Sans Unicode",
    "Palatino Linotype", "Tahoma", "Times New Roman",
    "Trebuchet MS", "Verdana",
    // Generic families always available
    "sans-serif", "serif", "monospace", "cursive", "fantasy",
];

// ─── Font enumeration ─────────────────────────────────────────────────────────

async function getAvailableFonts() {
    const names = new Set(WEB_SAFE);

    // 1. Fonts loaded on the page (FontFace API)
    document.fonts.forEach(function (f) {
        if (f.family) names.add(f.family.replace(/['"]/g, "").trim());
    });

    // 2. Local Font Access API
    if (window.queryLocalFonts) {
        try {
            const localFonts = await window.queryLocalFonts();
            localFonts.forEach(function (f) { names.add(f.family); });
        } catch (err) {
            // Permission denied or API unavailable — silently fall back
            console.info("font-picker: queryLocalFonts unavailable:", err.message);
        }
    }

    return Array.from(names).sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
}

// ─── Popover positioning (shared helper) ─────────────────────────────────────

function positionPopover($trigger, $popover) {
    const r = $trigger[0].getBoundingClientRect();
    $popover.css({
        left: r.right + 6,
        top:  Math.min(
            r.top,
            window.innerHeight - $popover.outerHeight() - 8
        ),
    });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initFontPicker() {
    const $trigger = $("#text_tool_btn");
    const $popover = $("#text_popover");
    const $select  = $("#font_face_select");
    const $size    = $("#font_size_input");
    const $preview = $("#font_preview");

    if (!$trigger.length || !$popover.length) return;

    // ── Populate font list ──────────────────────────────────────
    const fonts = await getAvailableFonts();
    $select.empty();
    fonts.forEach(function (name) {
        $("<option>").val(name).text(name).appendTo($select);
    });
    // Set initial value
    $select.val(state.fontFace);
    if (!$select.val()) {
        // Fallback if stored font not in list
        $select.val("sans-serif");
        state.fontFace = "sans-serif";
    }
    $size.val(state.fontSize);
    updatePreview();

    // ── Controls ────────────────────────────────────────────────
    $select.on("change", function () {
        state.fontFace = $select.val();
        updatePreview();
    });

    $size.on("input change", function () {
        const v = parseInt($size.val(), 10);
        if (v > 0) { state.fontSize = v; updatePreview(); }
    });

    function updatePreview() {
        $preview.css("font-family", state.fontFace)
                .text(state.fontFace);
    }

    // ── Hover show/hide (same pattern as lw_popover) ────────────
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
