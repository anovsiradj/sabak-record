var canvas,           // the <canvas> DOM element
    sbk,              // 2d context
    p_x, p_y,         // previous mouse/touch position
    x, y,             // current mouse/touch position
    is_draw,          // true while pointer is held down
    is_eraser = false,// true when eraser mode is active
    is_record,
    frame_length = 0,
    record_frame = [],
    timeval = null,
    fps = 10,
    BG_COLOR = "#222"; // canvas background colour (used by eraser)

// ─── Init ────────────────────────────────────────────────────────────────────

function initSabak() {
    is_draw = false;
    p_x = p_y = x = y = 0;
    is_record = false;

    canvas = document.getElementById("sabak");
    sbk = canvas.getContext("2d");

    sbk.strokeStyle = "#fff";
    sbk.lineWidth = 2;
    sbk.lineCap = "round";
    sbk.lineJoin = "round";
    sbk.fillStyle = BG_COLOR;
    sbk.fillRect(0, 0, canvas.width, canvas.height);
}

// ─── Coordinate helpers ──────────────────────────────────────────────────────

/**
 * Get canvas-relative coordinates from a mouse or touch event.
 * Uses getBoundingClientRect() so it works correctly when the page
 * is scrolled or the canvas has an offset parent.
 */
function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;

    var clientX, clientY;
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
        y: (clientY - rect.top) * scaleY
    };
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

function sbk_move(e) {
    e.preventDefault();
    p_x = x;
    p_y = y;
    var pos = getPos(e);
    x = pos.x;
    y = pos.y;
    if (is_draw) {
        sbk_draw();
    }
    updateOrdinat();
}

function sbk_down(e) {
    e.preventDefault();
    is_draw = true;
    var pos = getPos(e);
    // Seed previous position so the first segment starts at click point
    p_x = pos.x;
    p_y = pos.y;
    x = pos.x;
    y = pos.y;
    sbk.beginPath();
    sbk.moveTo(x, y);
    updateDownup();
}

function sbk_false() { // mouse up / out / touch end / touch cancel
    is_draw = false;
    updateDownup();
}

function sbk_draw() {
    sbk.moveTo(p_x, p_y);
    sbk.lineTo(x, y);
    sbk.stroke();
}

function sbk_color(c) {
    is_eraser = false;
    sbk.strokeStyle = c;
    sbk.lineWidth = getLineWidth();
    sbk.globalCompositeOperation = "source-over";
    updateEraserBtn();
}

// ─── Eraser ──────────────────────────────────────────────────────────────────

function sbk_eraser_toggle() {
    is_eraser = !is_eraser;
    if (is_eraser) {
        sbk.globalCompositeOperation = "destination-out";
        sbk.strokeStyle = "rgba(0,0,0,1)";
        sbk.lineWidth = getLineWidth() * 4; // eraser is wider than pen
    } else {
        sbk.globalCompositeOperation = "source-over";
        sbk.lineWidth = getLineWidth();
    }
    updateEraserBtn();
}

function updateEraserBtn() {
    var btn = document.getElementById("btn_eraser");
    if (btn) btn.classList.toggle("active", is_eraser);
}

// ─── Reset ───────────────────────────────────────────────────────────────────

function sbk_reset() {
    sbk.globalCompositeOperation = "source-over";
    sbk.fillStyle = BG_COLOR;
    sbk.fillRect(0, 0, canvas.width, canvas.height);
    // Restore pen state
    is_eraser = false;
    sbk.strokeStyle = "#fff";
    sbk.lineWidth = getLineWidth();
    updateEraserBtn();
}

// ─── Line width ──────────────────────────────────────────────────────────────

function getLineWidth() {
    var slider = document.getElementById("line_width");
    return slider ? parseInt(slider.value, 10) : 2;
}

function sbk_linewidth_change() {
    var w = getLineWidth();
    sbk.lineWidth = is_eraser ? w * 4 : w;
    document.getElementById("line_width_val").textContent = w + "px";
}

// ─── UI state display ────────────────────────────────────────────────────────

function updateDownup() {
    var badge = document.getElementById("badge_drawing");
    if (!badge) return;
    if (is_draw) {
        badge.textContent = "Melukis";
        badge.classList.add("drawing");
    } else {
        badge.textContent = "Tidak Melukis";
        badge.classList.remove("drawing");
    }
}

function updateOrdinat() {
    var el = document.getElementById("sbk_ordinat");
    if (el) el.textContent = "X: " + Math.round(x) + "  Y: " + Math.round(y);
}

function updateRecord() {
    var badge = document.getElementById("badge_record");
    if (!badge) return;
    if (is_record) {
        badge.textContent = "Merekam…";
        badge.classList.add("recording");
    } else {
        badge.textContent = "Tidak Merekam";
        badge.classList.remove("recording");
    }
}

function initColorPalette() {
    var buttons = document.getElementById("sbk_color")
        .getElementsByClassName("color-swatch");
    // activate first swatch by default
    if (buttons.length > 0) buttons[0].classList.add("active");
    for (var i = 0; i < buttons.length; i++) {
        (function (btn) {
            var clr = btn.dataset.clr;
            btn.style.backgroundColor = clr;
            btn.addEventListener("click", function () {
                // deactivate all, activate clicked
                var all = document.getElementsByClassName("color-swatch");
                for (var j = 0; j < all.length; j++) all[j].classList.remove("active");
                btn.classList.add("active");
                sbk_color(clr);
            });
        })(buttons[i]);
    }
}

// ─── Recording ───────────────────────────────────────────────────────────────

var playr_timer = null; // track active playback timer so we can cancel it

function sabak_frame() {
    // toDataURL is synchronous — just capture and store, never touch #frm here
    record_frame.push(canvas.toDataURL("image/png"));
}

function sabak_record_start() {
    // Stop any active playback first
    sabak_playr_stop();

    // Reset state
    record_frame = [];
    frame_length = 0;

    // Hide stale playback preview
    document.getElementById("playback_wrap").classList.add("d-none");
    document.getElementById("frm").src = "";

    is_record = true;
    updateRecord();

    timeval = setInterval(sabak_frame, 1000 / fps);
}

function sabak_record_stop() {
    if (!is_record) return; // guard against double-stop
    clearInterval(timeval);
    timeval = null;

    is_record = false;
    frame_length = record_frame.length;
    updateRecord();

    if (frame_length > 0) {
        // Show the last captured frame as a still preview
        document.getElementById("frm").src = record_frame[frame_length - 1];
        document.getElementById("playback_wrap").classList.remove("d-none");
    }
}

function sabak_playr_stop() {
    if (playr_timer !== null) {
        clearInterval(playr_timer);
        playr_timer = null;
    }
}

function sabak_playr() {
    if (!frame_length) return;

    // Cancel any already-running playback before starting a new one
    sabak_playr_stop();

    var offst = 0;
    var frm = document.getElementById("frm");

    playr_timer = setInterval(function () {
        if (offst < frame_length) {
            frm.src = record_frame[offst];
            offst++;
        } else {
            sabak_playr_stop();
        }
    }, 1000 / fps);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

window.onload = function () {
    initSabak();
    updateDownup();
    updateRecord();
    updateOrdinat();
    initColorPalette();
    sbk_linewidth_change(); // set initial label

    // Mouse events
    canvas.addEventListener("mousemove", sbk_move);
    canvas.addEventListener("mousedown", sbk_down);
    canvas.addEventListener("mouseup", sbk_false);
    canvas.addEventListener("mouseout", sbk_false);

    // Touch events (mobile support)
    canvas.addEventListener("touchmove", sbk_move, { passive: false });
    canvas.addEventListener("touchstart", sbk_down, { passive: false });
    canvas.addEventListener("touchend", sbk_false, { passive: false });
    canvas.addEventListener("touchcancel", sbk_false, { passive: false });
};
