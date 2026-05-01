// js/config.js — Config Modal module
// Handles runtime image-format detection and undo/redo stack-size configuration.

import { state } from "./state.js";
import { setStackSize } from "./memo.js";

const $ = window.$;

const CANDIDATE_FORMATS = [
    "image/webp",
    "image/png",
    "image/jpeg",
    "image/avif",
];

// ─── Format detection ─────────────────────────────────────────────────────────

/**
 * Probes canvas.toDataURL for each candidate format and returns only those
 * that produce a non-generic data-URL (i.e. the browser genuinely supports them).
 * A non-supported format falls back to "data:image/png;base64,..." regardless
 * of the requested format.
 *
 * @returns {string[]} Array of supported MIME type strings.
 */
export function detectSupportedFormats() {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    return CANDIDATE_FORMATS.filter(fmt => {
        const url = probe.toDataURL(fmt);
        // A non-supported format falls back to "data:image/png;base64,..."
        return url.startsWith("data:" + fmt);
    });
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

/**
 * Reflects current state into the modal controls.
 * Handles edge cases:
 *   - 9.5: if state.imageFormat is not in the detected list, fall back to "image/png"
 *   - 9.6: if detectSupportedFormats() returns empty array, use ["image/png"] as fallback
 */
function populateModal() {
    const detected = detectSupportedFormats();
    // Edge case 9.6: empty detection result → use ["image/png"] as minimum fallback
    const supported = detected.length ? detected : ["image/png"];

    // Edge case 9.5: current format not in supported list → fall back to "image/png"
    const fmt = supported.includes(state.imageFormat) ? state.imageFormat : "image/png";

    // Populate the format <select> with detected formats
    const $select = $("#config_format_select");
    $select.empty();
    supported.forEach(f => {
        $select.append($("<option>").val(f).text(f));
    });
    $select.val(fmt);

    // Reflect current stack size
    $("#config_stack_size").val(state.stackSize);
}

/**
 * Reads format and stack size from controls, validates/clamps stack size to
 * [9, 99], updates state.imageFormat, calls setStackSize(), and hides the modal.
 */
function applyConfig() {
    const fmt = $("#config_format_select").val();
    let size = parseInt($("#config_stack_size").val(), 10);

    // Clamp to [9, 99]; fall back to current stackSize if input is not a number
    if (isNaN(size)) size = state.stackSize;
    size = Math.max(9, Math.min(99, size));

    if (fmt) state.imageFormat = fmt;
    setStackSize(size);

    bootstrap.Modal.getInstance($("#configModal")[0]).hide();
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Wires up the Config button (populate + show modal) and the Apply button.
 * The format <select> is populated with detected formats on each modal open
 * so it always reflects the current browser capabilities.
 */
export function initConfig() {
    const $btn   = $("#btn_config");
    const $modal = $("#configModal");
    let bsModal  = null;

    $btn.on("click", () => {
        populateModal();
        if (!bsModal) bsModal = new bootstrap.Modal($modal[0]);
        bsModal.show();
    });

    $("#config_apply").on("click", applyConfig);
    // Cancel / dismiss: Bootstrap handles hide; no state changes needed.
}
