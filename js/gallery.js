// js/gallery.js
// In-memory gallery: stores images (PNG data-URL) and videos (Blob URL / frames).
// Renders a thumbnail grid. Opens a Bootstrap modal carousel as lightbox.

import { state } from "./state.js";

// ─── Store ────────────────────────────────────────────────────────────────────

let items = []; // [{ id, type, src, blob?, frames?, label, thumb }]
let nextId = 1;

// ─── Thumbnail helpers ────────────────────────────────────────────────────────

/** Build a small thumbnail data-URL from a full-size data-URL. */
function makeThumb(dataURL, cb) {
    const img = new Image();
    img.onload = function () {
        const c = document.createElement("canvas");
        c.width  = 160;
        c.height = 90;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 160, 90);
        cb(c.toDataURL("image/webp", 0.7));
    };
    img.src = dataURL;
}

/** For frame recordings, use the last frame as thumbnail. */
function makeFramesThumb(frames, cb) {
    makeThumb(frames[frames.length - 1], cb);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add an item to the gallery.
 * @param {object} item  { type: "image"|"video"|"frames", src?, blob?, frames?, label }
 */
export function addToGallery(item) {
    const id = nextId++;

    function finish(thumb) {
        items.push({ id, thumb, ...item });
        renderGallery();
        // Flash the gallery section into view
        const section = document.getElementById("gallery_section");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (item.type === "image") {
        makeThumb(item.src, finish);
    } else if (item.type === "frames") {
        makeFramesThumb(item.frames, finish);
    } else {
        // video — use a generic icon as thumb (can't easily thumbnail a blob URL)
        finish(null);
    }
}

/** Capture the current canvas as a WebP and add to gallery. */
export function captureToGallery() {
    const dataURL = state.canvas.toDataURL("image/webp", 0.92);
    addToGallery({ type: "image", src: dataURL, label: "Tangkapan" });
}

// ─── Render grid ──────────────────────────────────────────────────────────────

export function renderGallery() {
    const grid    = document.getElementById("gallery_grid");
    const empty   = document.getElementById("gallery_empty");
    const section = document.getElementById("gallery_section");
    if (!grid) return;

    grid.innerHTML = "";

    if (items.length === 0) {
        if (empty)   empty.classList.remove("d-none");
        if (section) section.classList.add("gallery-empty");
        return;
    }

    if (empty)   empty.classList.add("d-none");
    if (section) section.classList.remove("gallery-empty");

    items.forEach(function (item, idx) {
        const col  = document.createElement("div");
        col.className = "gallery-item";
        col.dataset.idx = idx;

        // Thumbnail
        const thumb = document.createElement("div");
        thumb.className = "gallery-thumb";

        if (item.type === "video") {
            thumb.innerHTML = '<div class="gallery-video-icon"><i class="bi bi-play-circle-fill"></i></div>';
        } else if (item.thumb) {
            const img = document.createElement("img");
            img.src = item.thumb;
            img.alt = item.label;
            thumb.appendChild(img);
        }

        // Label + type badge
        const footer = document.createElement("div");
        footer.className = "gallery-footer";
        const typeIcon = item.type === "video"  ? "bi-camera-video"
                       : item.type === "frames" ? "bi-film"
                       :                          "bi-image";
        footer.innerHTML =
            `<span class="gallery-label"><i class="bi ${typeIcon}"></i> ${item.label}</span>`;

        // Action buttons
        const actions = document.createElement("div");
        actions.className = "gallery-actions";

        const btnView = document.createElement("button");
        btnView.className = "btn btn-xs btn-outline-light";
        btnView.title = "Lihat";
        btnView.innerHTML = '<i class="bi bi-eye"></i>';
        btnView.addEventListener("click", function (e) {
            e.stopPropagation();
            openLightbox(idx);
        });

        const btnDl = document.createElement("button");
        btnDl.className = "btn btn-xs btn-outline-info";
        btnDl.title = "Unduh";
        btnDl.innerHTML = '<i class="bi bi-download"></i>';
        btnDl.addEventListener("click", function (e) {
            e.stopPropagation();
            downloadItem(item);
        });

        const btnDel = document.createElement("button");
        btnDel.className = "btn btn-xs btn-outline-danger";
        btnDel.title = "Hapus";
        btnDel.innerHTML = '<i class="bi bi-trash3"></i>';
        btnDel.addEventListener("click", function (e) {
            e.stopPropagation();
            deleteItem(item.id);
        });

        actions.append(btnView, btnDl, btnDel);
        col.append(thumb, footer, actions);

        // Click thumbnail to open lightbox
        thumb.addEventListener("click", function () { openLightbox(idx); });

        grid.appendChild(col);
    });
}

// ─── Download ─────────────────────────────────────────────────────────────────

function downloadItem(item) {
    if (item.type === "image") {
        triggerDownload(item.src, item.label + ".webp");
    } else if (item.type === "video" && item.blob) {
        const url = URL.createObjectURL(item.blob);
        triggerDownload(url, item.label + ".webm");
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    } else if (item.type === "frames") {
        triggerDownload(item.frames[item.frames.length - 1], item.label + ".webp");
    }
}

function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function deleteItem(id) {
    items = items.filter(function (it) { return it.id !== id; });
    renderGallery();
}

// ─── Lightbox (Bootstrap modal + carousel) ────────────────────────────────────

let lightboxModal  = null;
let framePlayTimer = null;

function stopFramePlay() {
    if (framePlayTimer) { clearInterval(framePlayTimer); framePlayTimer = null; }
}

export function openLightbox(startIdx) {
    const modalEl = document.getElementById("galleryModal");
    if (!modalEl) return;

    buildCarousel(startIdx);

    if (!lightboxModal) {
        lightboxModal = new bootstrap.Modal(modalEl);
        modalEl.addEventListener("hidden.bs.modal", stopFramePlay);
    }
    lightboxModal.show();
}

function buildCarousel(activeIdx) {
    const inner    = document.getElementById("galleryCarouselInner");
    const indicators = document.getElementById("galleryCarouselIndicators");
    if (!inner) return;

    inner.innerHTML      = "";
    indicators.innerHTML = "";

    items.forEach(function (item, idx) {
        // Indicator dot
        const dot = document.createElement("button");
        dot.type = "button";
        dot.dataset.bsTarget = "#galleryCarousel";
        dot.dataset.bsSlideTo = idx;
        dot.setAttribute("aria-label", "Slide " + (idx + 1));
        if (idx === activeIdx) {
            dot.classList.add("active");
            dot.setAttribute("aria-current", "true");
        }
        indicators.appendChild(dot);

        // Slide
        const slide = document.createElement("div");
        slide.className = "carousel-item" + (idx === activeIdx ? " active" : "");

        if (item.type === "image") {
            const img = document.createElement("img");
            img.src       = item.src;
            img.className = "d-block w-100 gallery-lightbox-media";
            img.alt       = item.label;
            slide.appendChild(img);
        } else if (item.type === "video") {
            const vid = document.createElement("video");
            vid.src      = item.src;
            vid.controls = true;
            vid.className = "d-block w-100 gallery-lightbox-media";
            // Stop carousel drag detection from stealing pointer events on the video
            vid.addEventListener("mousedown",  function (e) { e.stopPropagation(); });
            vid.addEventListener("touchstart", function (e) { e.stopPropagation(); }, { passive: true });
            slide.appendChild(vid);
            // Mark slide so CSS can hide the carousel arrows over video
            slide.classList.add("has-video");
        } else if (item.type === "frames") {
            // Animated frame player inside carousel
            const img = document.createElement("img");
            img.src       = item.frames[0];
            img.className = "d-block w-100 gallery-lightbox-media";
            img.alt       = item.label;
            img.dataset.frameIdx = "0";
            img.dataset.itemId   = item.id;
            slide.appendChild(img);
        }

        // Caption
        const cap = document.createElement("div");
        cap.className = "carousel-caption d-none d-md-block";
        const typeLabel = item.type === "video"  ? "Video"
                        : item.type === "frames" ? "Rekaman Frame"
                        :                          "Gambar";
        cap.innerHTML = `<small class="text-secondary">${typeLabel}</small><br/><span>${item.label}</span>`;
        slide.appendChild(cap);

        inner.appendChild(slide);
    });

    // Auto-play frames when carousel slides to a frames item
    const carouselEl = document.getElementById("galleryCarousel");
    carouselEl.removeEventListener("slid.bs.carousel", onCarouselSlid);
    carouselEl.addEventListener("slid.bs.carousel", onCarouselSlid);

    // Handle arrow visibility for the initial active slide
    updateCarouselArrows(activeIdx);

    // Start playing if the initial slide is a frames item
    const activeItem = items[activeIdx];
    if (activeItem && activeItem.type === "frames") {
        setTimeout(function () { playFramesInSlide(activeItem); }, 100);
    }
}

function onCarouselSlid(e) {
    stopFramePlay();
    const idx  = e.to;
    const item = items[idx];
    updateCarouselArrows(idx);
    if (item && item.type === "frames") {
        playFramesInSlide(item);
    }
}

function updateCarouselArrows(idx) {
    const item    = items[idx];
    const isVideo = item && item.type === "video";
    const carousel = document.getElementById("galleryCarousel");
    if (!carousel) return;
    // Hide arrows over video so they don't block the native controls bar
    carousel.querySelectorAll(".carousel-control-prev, .carousel-control-next")
        .forEach(function (btn) {
            btn.style.display = isVideo ? "none" : "";
        });
}

function playFramesInSlide(item) {
    stopFramePlay();
    const inner = document.getElementById("galleryCarouselInner");
    if (!inner) return;
    // Find the img with matching item id
    const img = inner.querySelector(`img[data-item-id="${item.id}"]`);
    if (!img) return;
    let i = 0;
    framePlayTimer = setInterval(function () {
        img.src = item.frames[i % item.frames.length];
        i++;
    }, 100); // 10 fps
}

export function initGallery() {
    renderGallery();
}
