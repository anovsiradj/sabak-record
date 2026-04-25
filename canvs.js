// Sabak - Canvas Whiteboard
// by: Mayendra Costanov
// initial: 20150818
// refactored: separated JS, fixed bugs

var canvas,       // the <canvas> DOM element
    sbk,          // 2d context
    p_x, p_y,     // previous mouse/touch position
    x, y,         // current mouse/touch position
    is_draw,      // true while pointer is held down
    is_record,
    is_frame_busy,
    frame_length,
    record_frame = [],
    timeval,
    fps = 10;

// ─── Init ────────────────────────────────────────────────────────────────────

function initSabak() {
    is_draw       = false;
    is_frame_busy = false;
    p_x = p_y = x = y = 0;
    is_record = false;

    canvas = document.getElementById("sabak");
    sbk    = canvas.getContext("2d");

    sbk.strokeStyle = "#fff";
    sbk.lineWidth   = 2;
    sbk.lineCap     = "round";
    sbk.lineJoin    = "round";
    sbk.fillStyle   = "#222";
    sbk.fillRect(0, 0, canvas.width, canvas.height);
}

// ─── Coordinate helpers ──────────────────────────────────────────────────────

/**
 * Get canvas-relative coordinates from a mouse or touch event.
 * Uses getBoundingClientRect() so it works correctly when the page
 * is scrolled or the canvas has an offset parent.
 */
function getPos(e) {
    var rect   = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
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
        y: (clientY - rect.top)  * scaleY
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
    x   = pos.x;
    y   = pos.y;
    sbk.beginPath();
    sbk.moveTo(x, y);
    updateDownup();
}

function sbk_false(e) { // mouse up / out / touch end / touch cancel
    is_draw = false;
    updateDownup();
}

function sbk_draw() {
    sbk.moveTo(p_x, p_y);
    sbk.lineTo(x, y);
    sbk.stroke();
}

function sbk_color(c) {
    sbk.strokeStyle = c;
}

// ─── UI state display ────────────────────────────────────────────────────────

function updateDownup() {
    document.getElementById("sbk_downup").innerHTML = is_draw ? "Ya" : "Tidak";
}

function updateOrdinat() {
    document.getElementById("sbk_ordinat").innerHTML =
        "X: " + Math.round(x) + "  Y: " + Math.round(y);
}

function updateRecord() {
    document.getElementById("sbk_record").innerHTML = is_record ? "Ya" : "Tidak";
}

function initColorPalette() {
    var buttons = document.getElementById("sbk_color")
                          .getElementsByClassName("color-palette");
    for (var i = 0; i < buttons.length; i++) {
        (function(btn) {
            var clr = btn.dataset.clr;
            btn.style.backgroundColor = clr;
            btn.innerHTML = clr;
            btn.addEventListener("click", function() { sbk_color(clr); });
        })(buttons[i]);
    }
}

// ─── Recording ───────────────────────────────────────────────────────────────

function sabak_frame() {
    if (!is_frame_busy) {
        is_frame_busy = true;
        var img_obj = canvas.toDataURL("image/png");
        record_frame.push(img_obj);
        document.getElementById("frm").src = img_obj;
        is_frame_busy = false;
    }
}

function sabak_record_start() {
    // Reset previous recording
    record_frame = [];
    is_record = true;
    updateRecord();
    var t = 1000 / fps;
    timeval = setInterval(sabak_frame, t);
}

function sabak_record_stop() {
    is_record = false;
    updateRecord();
    clearInterval(timeval);
    frame_length = record_frame.length;
}

function sabak_playr() {
    if (!frame_length) return;
    var t      = 1000 / fps;
    var offst  = 0;
    var playrval = setInterval(function() {
        if (offst < frame_length) {
            document.getElementById("frm").src = record_frame[offst];
            offst++;
        } else {
            clearInterval(playrval);
        }
    }, t);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

window.onload = function() {
    initSabak();
    updateDownup();
    updateRecord();
    updateOrdinat();
    initColorPalette();

    // Mouse events
    canvas.addEventListener("mousemove",  sbk_move);
    canvas.addEventListener("mousedown",  sbk_down);
    canvas.addEventListener("mouseup",    sbk_false);
    canvas.addEventListener("mouseout",   sbk_false);

    // Touch events (mobile support)
    canvas.addEventListener("touchmove",   sbk_move,  { passive: false });
    canvas.addEventListener("touchstart",  sbk_down,  { passive: false });
    canvas.addEventListener("touchend",    sbk_false, { passive: false });
    canvas.addEventListener("touchcancel", sbk_false, { passive: false });
};
