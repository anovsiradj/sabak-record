// js/gallery.js — in-memory gallery, thumbnail grid, Bootstrap modal carousel lightbox.

import { state } from "./state.js";

const $ = window.$;

let items  = [];
let nextId = 1;

// ─── Thumbnail helpers ────────────────────────────────────────────────────────

function makeThumb(dataURL, cb) {
    const img = new Image();
    img.onload = function () {
        const c   = document.createElement("canvas");
        c.width   = 160;
        c.height  = 90;
        c.getContext("2d").drawImage(img, 0, 0, 160, 90);
        cb(c.toDataURL("image/webp", 0.7));
    };
    img.src = dataURL;
}

function makeFramesThumb(frames, cb) {
    makeThumb(frames[frames.length - 1], cb);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function addToGallery(item) {
    const id = nextId++;

    function finish(thumb) {
        items.push({ id, thumb, ...item });
        renderGallery();
        $("#gallery_section")[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (item.type === "image")        makeThumb(item.src, finish);
    else if (item.type === "frames")  makeFramesThumb(item.frames, finish);
    else                              finish(null);
}

export function captureToGallery() {
    addToGallery({
        type:  "image",
        src:   state.canvas.toDataURL("image/webp", 0.92),
        label: "Tangkapan",
    });
}

// ─── Render grid ──────────────────────────────────────────────────────────────

export function renderGallery() {
    const $grid = $("#gallery_grid");
    if (!$grid.length) return;

    $grid.empty();

    if (items.length === 0) {
        $("#gallery_empty").removeClass("d-none");
        return;
    }

    $("#gallery_empty").addClass("d-none");

    items.forEach(function (item, idx) {
        const typeIcon = item.type === "video"  ? "bi-camera-video"
                       : item.type === "frames" ? "bi-film"
                       :                          "bi-image";

        // Thumbnail content
        let thumbHtml;
        if (item.type === "video") {
            thumbHtml = '<div class="gallery-video-icon"><i class="bi bi-play-circle-fill"></i></div>';
        } else if (item.thumb) {
            thumbHtml = `<img src="${item.thumb}" alt="${item.label}" />`;
        } else {
            thumbHtml = "";
        }

        const $col = $("<div>").addClass("gallery-item").attr("data-idx", idx);

        const $thumb = $("<div>").addClass("gallery-thumb").html(thumbHtml)
            .on("click", function () { openLightbox(idx); });

        const $footer = $("<div>").addClass("gallery-footer")
            .html(`<span class="gallery-label"><i class="bi ${typeIcon}"></i> ${item.label}</span>`);

        const $btnView = $("<button>").addClass("btn btn-xs btn-outline-light")
            .attr("title", "Lihat").html('<i class="bi bi-eye"></i>')
            .on("click", function (e) { e.stopPropagation(); openLightbox(idx); });

        const $btnDl = $("<button>").addClass("btn btn-xs btn-outline-info")
            .attr("title", "Unduh").html('<i class="bi bi-download"></i>')
            .on("click", function (e) { e.stopPropagation(); downloadItem(item); });

        const $btnDel = $("<button>").addClass("btn btn-xs btn-outline-danger")
            .attr("title", "Hapus").html('<i class="bi bi-trash3"></i>')
            .on("click", function (e) { e.stopPropagation(); deleteItem(item.id); });

        const $actions = $("<div>").addClass("gallery-actions")
            .append($btnView, $btnDl, $btnDel);

        $col.append($thumb, $footer, $actions);
        $grid.append($col);
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
    $("<a>").attr({ href: url, download: filename })[0].click();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function deleteItem(id) {
    items = items.filter(function (it) { return it.id !== id; });
    renderGallery();
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

let lightboxModal  = null;
let framePlayTimer = null;

function stopFramePlay() {
    if (framePlayTimer) { clearInterval(framePlayTimer); framePlayTimer = null; }
}

export function openLightbox(startIdx) {
    const modalEl = $("#galleryModal")[0];
    if (!modalEl) return;

    buildCarousel(startIdx);

    if (!lightboxModal) {
        lightboxModal = new bootstrap.Modal(modalEl);
        $(modalEl).on("hidden.bs.modal", stopFramePlay);
    }
    lightboxModal.show();
}

function buildCarousel(activeIdx) {
    const $inner      = $("#galleryCarouselInner").empty();
    const $indicators = $("#galleryCarouselIndicators").empty();
    if (!$inner.length) return;

    items.forEach(function (item, idx) {
        const isActive = idx === activeIdx;

        // Indicator dot
        const $dot = $("<button>").attr({
            type:              "button",
            "data-bs-target":  "#galleryCarousel",
            "data-bs-slide-to": idx,
            "aria-label":      "Slide " + (idx + 1),
        });
        if (isActive) $dot.addClass("active").attr("aria-current", "true");
        $indicators.append($dot);

        // Slide
        const $slide = $("<div>").addClass("carousel-item" + (isActive ? " active" : ""));

        if (item.type === "image") {
            $slide.append(
                $("<img>").attr({ src: item.src, alt: item.label })
                    .addClass("d-block w-100 gallery-lightbox-media")
            );
        } else if (item.type === "video") {
            const $vid = $("<video>").attr({ src: item.src, controls: true })
                .addClass("d-block w-100 gallery-lightbox-media")
                .on("mousedown", function (e) { e.stopPropagation(); });
            // touchstart needs native listener for passive:true
            $vid[0].addEventListener("touchstart", function (e) { e.stopPropagation(); }, { passive: true });
            $slide.append($vid).addClass("has-video");
        } else if (item.type === "frames") {
            $slide.append(
                $("<img>").attr({ src: item.frames[0], alt: item.label })
                    .addClass("d-block w-100 gallery-lightbox-media")
                    .data({ frameIdx: 0, itemId: item.id })
                    .attr({ "data-frame-idx": 0, "data-item-id": item.id })
            );
        }

        const typeLabel = item.type === "video"  ? "Video"
                        : item.type === "frames" ? "Rekaman Frame"
                        :                          "Gambar";
        $slide.append(
            $("<div>").addClass("carousel-caption d-none d-md-block").html(
                `<small class="text-secondary">${typeLabel}</small><br/><span>${item.label}</span>`
            )
        );

        $inner.append($slide);
    });

    const $carousel = $("#galleryCarousel");
    $carousel.off("slid.bs.carousel", onCarouselSlid)
             .on("slid.bs.carousel",  onCarouselSlid);

    updateCarouselArrows(activeIdx);

    const activeItem = items[activeIdx];
    if (activeItem && activeItem.type === "frames") {
        setTimeout(function () { playFramesInSlide(activeItem); }, 100);
    }
}

function onCarouselSlid(e) {
    stopFramePlay();
    const item = items[e.to];
    updateCarouselArrows(e.to);
    if (item && item.type === "frames") playFramesInSlide(item);
}

function updateCarouselArrows(idx) {
    const isVideo = items[idx] && items[idx].type === "video";
    $("#galleryCarousel .carousel-control-prev, #galleryCarousel .carousel-control-next")
        .toggle(!isVideo);
}

function playFramesInSlide(item) {
    stopFramePlay();
    const $img = $(`#galleryCarouselInner img[data-item-id="${item.id}"]`);
    if (!$img.length) return;
    let i = 0;
    framePlayTimer = setInterval(function () {
        $img.attr("src", item.frames[i % item.frames.length]);
        i++;
    }, 100);
}

export function initGallery() {
    renderGallery();
}
