# Sabak — HTML5 Canvas Whiteboard: Technical Documentation

**Author:** anovsiradj (Mayendra Costanov)  
**Version:** 1.0.0  
**Date:** May 2026

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Background: HTML5 Canvas API](#3-background-html5-canvas-api)
4. [System Architecture](#4-system-architecture)
5. [Module Reference](#5-module-reference)
6. [Drawing Subsystem](#6-drawing-subsystem)
7. [Selection Tool](#7-selection-tool)
8. [Undo/Redo Subsystem](#8-undoredo-subsystem)
9. [Recording Subsystem](#9-recording-subsystem)
10. [Configuration System](#10-configuration-system)
11. [User Interface Design](#11-user-interface-design)
12. [Correctness Properties and Testing](#12-correctness-properties-and-testing)
13. [Discussion](#13-discussion)
14. [References](#14-references)

---

## 1. Abstract

Sabak is a single-page HTML5 Canvas whiteboard application implemented entirely in vanilla JavaScript using ES modules, jQuery v4, and Bootstrap v5. It provides freehand drawing, nine geometric shape tools, a multi-shape selection tool with move and delete operations, text input, screen recording via the MediaRecorder API, an in-session gallery, and a runtime-configurable image format and undo stack. This document describes the technical design, module architecture, key algorithms, and correctness properties of the implementation.

---

## 2. Introduction

Browser-based drawing applications have existed since the introduction of the `<canvas>` element in HTML5 (circa 2004, standardised in HTML5 in 2014). Unlike SVG-based approaches, which maintain a retained-mode scene graph, the Canvas API is an immediate-mode raster surface: every drawing operation directly modifies a pixel buffer, and there is no built-in concept of objects, layers, or undo history.

Sabak addresses these limitations through a set of purpose-built subsystems layered on top of the raw Canvas API:

- A **snapshot-based undo/redo stack** that serialises the full canvas pixel state as a data-URL after each committed action.
- A **ghost canvas overlay** that renders live shape previews without touching the main pixel buffer.
- A **selection tool** that uses `getImageData`/`putImageData` and canvas clipping to implement pixel-level move and delete operations.
- A **recording subsystem** that supports both `MediaRecorder` stream capture and frame-by-frame WebP animation.

The application is structured as a collection of ES modules, each owning a well-defined slice of functionality, communicating through a single shared state object.

---

## 3. Background: HTML5 Canvas API

### 3.1 The `<canvas>` Element

The HTML `<canvas>` element provides a fixed-size rectangular pixel surface. It has no intrinsic content model — it is simply a drawing target. The element exposes a 2D rendering context via:

```js
const ctx = canvas.getContext("2d");
```

The returned `CanvasRenderingContext2D` object provides the full drawing API.

### 3.2 Coordinate System

The canvas coordinate system has its origin at the top-left corner, with the x-axis pointing right and the y-axis pointing down. All coordinates are in CSS pixels by default, but the canvas has an intrinsic pixel size (`canvas.width`, `canvas.height`) that may differ from its CSS display size. Sabak accounts for this with a coordinate scaling helper:

```js
const scaleX = canvas.width  / canvas.getBoundingClientRect().width;
const scaleY = canvas.height / canvas.getBoundingClientRect().height;
```

### 3.3 Immediate-Mode Rendering

Unlike SVG or DOM-based graphics, the Canvas API is immediate-mode: drawing calls modify the pixel buffer directly and are not recorded as objects. There is no way to "select" a previously drawn shape or undo a stroke without external bookkeeping. This is the fundamental reason Sabak requires its own undo stack.

### 3.4 Path Model

The Canvas 2D API uses a path model for shape drawing. A path is a sequence of geometric commands (`moveTo`, `lineTo`, `arc`, `ellipse`, `rect`, `bezierCurveTo`, etc.) accumulated in an internal path buffer. The path is not rendered until `stroke()` or `fill()` is called. This separation between path construction and rendering is central to Sabak's shape preview system: the same path-building functions are called on both the ghost canvas (for preview) and the main canvas (for commit).

### 3.5 Pixel Access

The Canvas API provides direct pixel access via:

```js
const imageData = ctx.getImageData(x, y, width, height);
// imageData.data: Uint8ClampedArray of RGBA values, 4 bytes per pixel
ctx.putImageData(imageData, x, y);
```

Sabak's selection tool uses these methods to copy, move, and delete pixel regions.

### 3.6 Compositing

The `globalCompositeOperation` property controls how new drawing operations combine with existing pixels. Sabak uses `"source-over"` (the default, new pixels drawn on top) for all drawing and fill operations, and explicitly resets it after eraser strokes to prevent compositing artefacts.

### 3.7 Canvas Serialisation

The canvas pixel buffer can be serialised to a data-URL string via:

```js
const dataURL = canvas.toDataURL("image/webp", 0.92);
```

Sabak uses this for undo snapshots, gallery captures, and resize preservation. The MIME type is runtime-configurable; supported formats are detected by probing `toDataURL` and checking whether the returned URL prefix matches the requested format.

---

## 4. System Architecture

### 4.1 Module Dependency Graph

```
raster.js (entry point)
├── js/state.js        — shared application state singleton
├── js/canvas.js       — canvas init, resize, aspect-ratio presets
├── js/draw.js         — pen, eraser, shape tools, ghost canvas
├── js/select.js       — selection tool (move, delete, freeform lasso)
├── js/memo.js         — undo/redo stack
├── js/ui.js           — toolbar, popovers, colour palette
├── js/text.js         — text tool overlay and font picker
├── js/config.js       — config modal (image format, stack size)
├── js/gallery.js      — in-session gallery and lightbox
└── js/record.js       — recording coordinator
    ├── js/record-frame.js   — frame-by-frame capture
    └── js/record-stream.js  — MediaRecorder stream capture
```

### 4.2 Shared State

All modules import from `js/state.js`, which exports a single mutable object:

```js
export const state = {
    canvas:          null,     // HTMLCanvasElement
    sbk:             null,     // CanvasRenderingContext2D
    tool:            "pen",    // active tool name
    color:           "#ffffff",
    lineWidth:       2,
    isDrawing:       false,
    recordMode:      "stream",
    fontFace:        "sans-serif",
    fontSize:        20,
    imageFormat:     "image/webp",
    stackSize:       10,
    selectShapeMode: "rect",
};
```

This is a deliberate design choice: rather than passing state through function arguments or using a pub/sub system, all modules read and write the same object. This keeps inter-module communication simple at the cost of global mutability.

### 4.3 Entry Point

`raster.js` is the application entry point, loaded as an ES module (`<script type="module">`). It:

1. Imports all module initialisation functions.
2. Exposes a small set of functions on `window` for HTML `onclick` attributes (a legacy pattern from the original 2015 codebase).
3. Registers pointer event handlers on the canvas element.
4. Dispatches pointer events to the correct module based on `state.tool`.

### 4.4 Pointer Event Dispatch

```js
function handleDown(e) {
    if (state.tool === "text")   { showTextInput(…); return; }
    if (state.tool === "select") { onSelectDown(e); return; }
    onDown(e);   // draw.js handles all other tools
}
```

The same dispatch pattern applies to `handleMove`, `handleUp`, and `handleLeave`. Both mouse and touch events are bound to the same handlers; `getPos()` in `draw.js` normalises both event types to canvas coordinates.

---

## 5. Module Reference

| Module | Responsibility |
|---|---|
| `state.js` | Shared mutable state singleton and `BG_COLOR` constant |
| `canvas.js` | Canvas initialisation, resize with content preservation, aspect-ratio presets |
| `draw.js` | Pen, eraser, all shape tools; ghost canvas; shape path functions; coordinate helper |
| `select.js` | Selection tool: gesture handling, freeform lasso, move, delete, overlay rendering |
| `memo.js` | Snapshot-based undo/redo stack; dynamic stack size; keyboard bindings |
| `ui.js` | Tool buttons, shape popover, select shape popover, colour popover, line-width popover |
| `text.js` | Text overlay input, font enumeration, font picker popover |
| `config.js` | Runtime image format detection, config modal lifecycle |
| `gallery.js` | In-memory gallery, thumbnail generation, Bootstrap carousel lightbox |
| `record.js` | Recording mode toggle, start/stop coordination, playback preview |
| `record-frame.js` | Frame-by-frame canvas capture at fixed interval |
| `record-stream.js` | `MediaRecorder`-based video stream capture |

---

## 6. Drawing Subsystem

### 6.1 Ghost Canvas

The ghost canvas is a transparent `<canvas>` element positioned absolutely over the main canvas using CSS:

```
position: absolute; top: 0; left: 0;
width: 100%; height: 100%;
pointer-events: none;
z-index: 1;
```

`pointer-events: none` ensures all pointer events pass through to the main canvas below. The ghost canvas is used exclusively for live shape previews during drag gestures. On every `mousemove` event, the ghost is cleared with `clearRect` and the current shape is redrawn. On `mouseup`, the ghost is cleared and the shape is committed to the main canvas.

This two-canvas approach is the standard technique for interactive shape drawing in Canvas applications. It avoids the need to redraw the entire canvas on every pointer-move event.

### 6.2 Shape Path Functions

All shape renderers are implemented as pure path-building functions with the signature:

```js
function pathXxx(ctx, x1, y1, x2, y2)
```

where `(x1, y1)` is the drag start point and `(x2, y2)` is the drag end point. The functions call `ctx.beginPath()` and build the path using `moveTo`/`lineTo`/`closePath`/`ellipse`/`rect`, but do **not** call `stroke()` or `fill()`. The caller is responsible for styling and stroking. This makes the functions reusable for both drawing (on the main canvas) and selection overlays (on the ghost canvas).

The functions are collected in a dispatch map:

```js
export const SHAPE_PATH_FNS = {
    line, rect, circle, triangle, diamond,
    star, arrow, pentagon, hexagon
};
```

Both `draw.js` and `select.js` import this map, guaranteeing that the selection boundary exactly matches the drawn shape.

### 6.3 Shape Geometry

| Shape | Construction |
|---|---|
| **Line** | `moveTo(x1,y1)`, `lineTo(x2,y2)` |
| **Rect** | `ctx.rect(x1, y1, x2-x1, y2-y1)` |
| **Circle** | `ctx.ellipse(cx, cy, rx, ry, 0, 0, 2π)` where `cx=(x1+x2)/2`, `cy=(y1+y2)/2` |
| **Triangle** | Apex at `(cx, y1)`, base corners at `(x1, y2)` and `(x2, y2)` |
| **Diamond** | Four vertices at midpoints of bounding box edges |
| **Star** | 10 alternating outer/inner points on concentric circles; outer radius `r = min(w,h)/2`, inner radius `r × 0.382` (golden ratio complement); first outer point at top (`−π/2`) |
| **Arrow** | Open line + two barbs; built in local coordinates aligned with the x-axis, then rotated via `ctx.save()`/`ctx.translate()`/`ctx.rotate()`/`ctx.restore()` to align with the drag vector |
| **Pentagon** | 5 vertices on circle of radius `min(w,h)/2`, first at top |
| **Hexagon** | 6 vertices on circle of radius `min(w,h)/2`, first at top |

### 6.4 Pen and Eraser

The pen tool draws directly to the main canvas on every `mousemove` event using a continuous `moveTo`/`lineTo`/`stroke()` sequence. An undo snapshot is pushed on `mousedown` (before the first stroke), not on `mouseup`, so the entire stroke is a single undoable action.

The eraser tool uses the same stroke mechanism but sets `strokeStyle = BG_COLOR` and `lineWidth = state.lineWidth * 4`, painting over existing content with the background colour.

### 6.5 Zero-Area Guard

All shape tools apply a 2-pixel drag distance guard on `mouseup`:

```js
if (Math.hypot(pos.x - startX, pos.y - startY) < 2) {
    gctx.clearRect(0, 0, ghost.width, ghost.height);
    return;  // no commit, no undo push
}
```

This prevents accidental single-pixel shapes from being committed and polluting the undo stack.

---

## 7. Selection Tool

### 7.1 Overview

The selection tool (`js/select.js`) allows users to define a region of the canvas using any of eight boundary shapes (rect, circle, triangle, diamond, star, pentagon, hexagon, or freeform lasso), then move or delete the pixel content within that region.

### 7.2 State Machine

The selection tool operates as an implicit state machine with the following states:

| State | Variables | Description |
|---|---|---|
| **Idle** | `hasSelection=false`, `isSelecting=false` | No active gesture or selection |
| **Selecting** | `isSelecting=true` | Drag gesture in progress; overlay drawn on ghost canvas |
| **Selected** | `hasSelection=true` | Gesture complete; selection boundary finalised |
| **Moving** | `isDraggingMove=true` | Pixel content being dragged to new position |

### 7.3 Bounding Box

For all shape modes, the finalised selection stores a normalised axis-aligned bounding box `(selX1, selY1, selX2, selY2)` where `selX1 ≤ selX2` and `selY1 ≤ selY2`. This bounding box is used for `getImageData` and `putImageData` operations.

For freeform (pen) mode, the bounding box is computed from the actual path points:

```js
function pathBBox(points) {
    let minX = Infinity, minY = Infinity,
        maxX = -Infinity, maxY = -Infinity;
    for (const pt of points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
    }
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}
```

This is critical: using the drag start/end points as the bounding box (a common mistake) would capture the wrong pixel region for non-axis-aligned freeform paths.

### 7.4 Freeform Lasso

In pen mode, every `mousemove` event appends the current position to `freeformPath`. On `mouseup`, the path is auto-closed (no explicit close-distance check is required — the user simply releases the mouse). The path is then used for:

- **Overlay rendering**: `ctx.beginPath()` + `forEach(moveTo/lineTo)` + `ctx.closePath()` + `ctx.stroke()`
- **Hit testing** (`isInsideSelection`): the path is replayed on an offscreen canvas and `isPointInPath()` is used
- **Clipping** (`buildSelectionPath`): the path is replayed and `ctx.clip()` restricts fill/draw operations to the shape interior

During the gesture, a closing line is drawn back to the start point so the user can see the shape forming in real time.

### 7.5 Move Operation

The move operation proceeds as follows:

1. **Capture**: `getImageData(selX1, selY1, w, h)` copies the bounding box pixels into `copiedPixels`.
2. **Erase**: The vacated area is filled with `BG_COLOR`. For non-rectangular shapes, `ctx.clip()` restricts the fill to the shape interior.
3. **Drag preview**: On each `mousemove`, `copiedPixels` is drawn on the ghost canvas at `(selX1 + moveOffsetX, selY1 + moveOffsetY)`.
4. **Drop**: On `mouseup`, the copied pixels are composited back onto the main canvas at the clamped drop position. For non-rectangular shapes, the shape path is rebuilt at the new position and `ctx.clip()` ensures only pixels within the shape boundary are composited.
5. **Commit**: The bounding box and freeform path are translated by `(dx, dy)`, the ghost is cleared, the final overlay is redrawn, and `pushUndo()` is called.

Drop position is clamped to keep the selection within canvas bounds:

```js
const clampedX = Math.max(0, Math.min(canvas.width  - w, rawDropX));
const clampedY = Math.max(0, Math.min(canvas.height - h, rawDropY));
```

### 7.6 Delete Operation

`deleteSelection()` fills the selection region with `BG_COLOR` using the same clip-based approach as the move erase step, then calls `pushUndo()` and resets all selection state.

### 7.7 Auto-Cancel

Clicking outside an active selection automatically cancels it and begins a new selection gesture from the click point. This is handled in `onSelectDown`:

```js
if (hasSelection && !isInsideSelection(pos.x, pos.y)) {
    cancelSelection();
    // … start new gesture
}
```

---

## 8. Undo/Redo Subsystem

### 8.1 Snapshot Strategy

Sabak uses a full-canvas snapshot strategy: each undo entry is a complete serialisation of the canvas pixel buffer as a data-URL. This is simple and correct but memory-intensive for large canvases. The stack depth is configurable between 9 and 99 entries (default 10).

### 8.2 Stack Operations

```
pushUndo():
    if undoStack.length >= MAX: undoStack.shift()  // evict oldest
    undoStack.push(canvas.toDataURL(imageFormat, 0.92))
    redoStack.length = 0  // new action invalidates redo history

popUndo():
    redoStack.push(canvas.toDataURL(imageFormat, 0.92))  // save current for redo
    restoreSnapshot(undoStack.pop())

popRedo():
    undoStack.push(canvas.toDataURL(imageFormat, 0.92))  // save current for undo
    restoreSnapshot(redoStack.pop())
```

### 8.3 Snapshot Timing

For pen and eraser tools, `pushUndo()` is called on `mousedown` (before the first pixel is drawn), so the entire stroke is a single undoable action. For shape tools, `pushUndo()` is called on `mouseup` (after the shape is committed). For the selection tool, `pushUndo()` is called after a move drop or delete operation.

### 8.4 Dynamic Stack Size

`setStackSize(n)` updates the `MAX` variable and trims both stacks to `n` entries (removing oldest entries first):

```js
while (undoStack.length > MAX) undoStack.shift();
while (redoStack.length > MAX) redoStack.shift();
```

### 8.5 Image Format

All `toDataURL` calls use `state.imageFormat` rather than a hardcoded format. This applies to undo snapshots, redo snapshots, gallery captures, and canvas resize preservation. The format is validated at runtime by `detectSupportedFormats()` in `config.js`.

---

## 9. Recording Subsystem

### 9.1 Two Recording Modes

Sabak supports two recording modes, selectable at runtime:

**Stream mode** uses the `MediaRecorder` API to capture a `MediaStream` from the canvas:

```js
const stream = canvas.captureStream(30);  // 30 fps
const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
```

The resulting blob is a WebM video file.

**Frame mode** captures the canvas as a WebP data-URL at a fixed interval (approximately 10 fps) and stores the frames in an array. The frames can be played back as a simple animation or saved to the gallery.

### 9.2 Fallback

If `MediaRecorder` is not supported by the browser, the recording mode automatically falls back to frame mode.

### 9.3 Gallery Integration

Completed recordings are saved to the in-session gallery via `addToGallery()`. Stream recordings are stored as `{type: "video", blob}` items; frame recordings are stored as `{type: "frames", frames: [...]}` items. The gallery lightbox handles both types.

---

## 10. Configuration System

### 10.1 Runtime Format Detection

`detectSupportedFormats()` probes the browser's `toDataURL` implementation for each candidate format:

```js
const CANDIDATE_FORMATS = ["image/webp", "image/png", "image/jpeg", "image/avif"];

function detectSupportedFormats() {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    return CANDIDATE_FORMATS.filter(fmt =>
        probe.toDataURL(fmt).startsWith("data:" + fmt)
    );
}
```

A browser that does not support a given format falls back to returning a PNG data-URL regardless of the requested format. The prefix check reliably distinguishes supported from unsupported formats.

### 10.2 Config Modal

The config modal (`#configModal`) is a Bootstrap modal dialog that exposes:

- **Image format selector**: populated dynamically with detected formats on each open. If `state.imageFormat` is not in the detected list, it falls back to `"image/png"`.
- **Stack size input**: a number input with `min=9`, `max=99`, `value=10`. Values outside the range are clamped before applying.

Changes are applied only when the user clicks "Terapkan" (Apply). Dismissing the modal without applying discards all changes.

---

## 11. User Interface Design

### 11.1 Layout

The application uses a three-region layout implemented with CSS Flexbox:

```
┌─────────────────────────────────────────────┐
│  Header (44px fixed height)                 │
├──────┬──────────────────────────────────────┤
│Side  │  Workspace (flex: 1, overflow: auto) │
│bar   │  ┌──────────────────────────────────┐│
│(48px)│  │  Canvas wrapper (100dvh - 44px)  ││
│      │  └──────────────────────────────────┘│
│      │  Playback preview (d-none by default)│
│      │  Gallery section                     │
└──────┴──────────────────────────────────────┘
```

The canvas wrapper has a fixed height equal to the viewport height minus the header, so the canvas always fills the visible area. The gallery and playback preview scroll below it within the workspace.

### 11.2 Popover Pattern

All secondary controls (line width, colour palette, shape picker, selection shape picker, text options) use a consistent hover-reveal popover pattern:

- The popover element is placed at the `<body>` level to escape any `overflow: hidden` containers.
- Position is computed in JavaScript using `getBoundingClientRect()` on the trigger button.
- Show/hide is controlled by adding/removing a `.visible` CSS class that transitions `opacity` from 0 to 1.
- A 80ms debounce on `mouseleave` prevents the popover from closing when the pointer briefly passes between the trigger and the popover.

### 11.3 Sidebar

The sidebar contains five always-visible tool buttons (pencil, eraser, shape trigger, select trigger, text), a line-width trigger, a colour trigger, and a custom colour picker. The shape and select triggers open popovers on hover; clicking the select trigger also activates the select tool.

### 11.4 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Capture canvas to gallery |
| `Delete` / `Backspace` | Delete active selection |
| `Escape` | Cancel selection / cancel text input |
| `Enter` | Commit text |
| `Shift+Enter` | New line in text input |

---

## 12. Correctness Properties and Testing

### 12.1 Property-Based Testing

The test suite (`tests/sabak-enhancements.test.js`) uses **fast-check** for property-based testing. Each property is verified over a minimum of 100 randomly generated inputs. The test runner is **Vitest**.

### 12.2 Properties

| ID | Property | Validates |
|---|---|---|
| P1 | For any shape name, `setTool(name)` sets `state.tool` to that name | Tool activation |
| P2 | For any non-zero bounding box, all vertices of each path function lie within or on the box | Shape geometry |
| P3 | For any shape tool and non-zero drag, `pushUndo()` increases `undoStack.length` by 1 | Undo stack growth |
| P4 | For any sequence of move events, `clearRect` is called before each new ghost preview | Ghost canvas isolation |
| P5 | For any tool value, `#select_shape_panel` visibility matches `state.tool === "select"` | UI state sync |
| P6 | For any `hasSelection` boolean, action controls visibility matches `hasSelection` | UI state sync |
| P7 | For any selection region, `deleteSelection()` fills with `BG_COLOR` and grows undo stack by 1 | Delete correctness |
| P8 | For any canvas state with active selection, `cancelSelection()` leaves main canvas pixels unchanged | Cancel safety |
| P9 | For any mock `toDataURL`, `detectSupportedFormats()` returns exactly the formats with matching prefix | Format detection |
| P10 | For any confirmed format `fmt`, next `pushUndo()` data-URL starts with `"data:" + fmt` | Format propagation |
| P11 | For any `N ∈ [9,99]` and push count `> N`, `undoStack.length === N` | Stack cap |
| P12 | For any stack of length `L` and new size `N < L`, `setStackSize(N)` results in `undoStack.length === N` | Stack trim |
| P13 | For any `imageFormat` and `stackSize`, opening the config modal displays those exact values | Modal reflection |
| P14 | For any changes inside the modal, dismissing without applying leaves state unchanged | Cancel safety |

All 14 properties pass at 100 iterations each.

---

## 13. Discussion

### 13.1 Design Decisions

**Snapshot-based undo vs. command-based undo.** A command-based undo system (storing operations rather than pixel states) would be more memory-efficient but significantly more complex to implement correctly, especially for freehand strokes and pixel-level selection operations. The snapshot approach is simple, correct, and sufficient for the target use case.

**Single shared state object.** Using a single mutable state object rather than a reactive state system (e.g. signals or observables) keeps the codebase simple and avoids framework dependencies. The tradeoff is that state changes are not automatically propagated to the UI — each module is responsible for reading state when it needs it.

**Ghost canvas vs. full redraw.** The ghost canvas approach avoids the need to maintain a scene graph or redraw the entire canvas on every pointer-move event. The tradeoff is that the ghost canvas must be explicitly cleared before each preview, and its lifecycle must be carefully managed (especially during selection move operations).

**Body-level popovers.** Placing popover elements at the `<body>` level rather than inside the sidebar avoids CSS `overflow: hidden` clipping issues. The tradeoff is that popover position must be computed in JavaScript rather than CSS.

### 13.2 Limitations

- **No vector layer.** All drawing is rasterised immediately. There is no way to select and modify a previously drawn shape as an object.
- **No multi-layer support.** The application has a single drawing layer (plus the ghost overlay). Layer compositing is not supported.
- **In-memory gallery.** The gallery is not persisted across page reloads. All captured images and recordings are lost when the page is closed.
- **Single undo granularity.** Each pen/eraser stroke is a single undo entry regardless of length. Very long strokes cannot be partially undone.
- **Freeform selection bounding box.** The move operation copies the full bounding box of the freeform path, not just the pixels within the path. Pixels outside the path shape but inside the bounding box are also copied and moved.

### 13.3 Browser Compatibility

The application requires a browser with support for:

- HTML5 Canvas 2D API (universal)
- ES Modules (all modern browsers)
- `canvas.captureStream()` (Chrome, Firefox, Edge; not Safari as of 2026)
- `MediaRecorder` (Chrome, Firefox, Edge; limited Safari support)
- `window.queryLocalFonts()` (Chrome 103+; gracefully degraded elsewhere)

---

## 14. References

- WHATWG. *HTML Living Standard — The canvas element*. https://html.spec.whatwg.org/multipage/canvas.html
- Mozilla Developer Network. *CanvasRenderingContext2D*. https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
- Mozilla Developer Network. *MediaRecorder API*. https://developer.mozilla.org/en-US/docs org/Web/API/MediaRecorder
- Claessen, K. & Hughes, J. (2000). *QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs*. ACM SIGPLAN Notices, 35(9), 268–279.
- fast-check. *Property-based testing framework for JavaScript*. https://fast-check.dev
- Bootstrap. *Bootstrap v5 Documentation*. https://getbootstrap.com/docs/5.3
- jQuery. *jQuery v4 API Documentation*. https://api.jquery.com
