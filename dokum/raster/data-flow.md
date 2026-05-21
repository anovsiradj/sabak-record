# Sabak — Data Flow and Interaction Sequences

This document describes the key data flows and interaction sequences in the Sabak application using prose and Mermaid diagrams.

---

## 1. Application Initialisation

When the page loads, `raster.js` is executed as an ES module. jQuery's `$(function(){})` defers all initialisation until the DOM is ready.

```mermaid
sequenceDiagram
    participant Browser
    participant raster.js
    participant canvas.js
    participant draw.js
    participant memo.js
    participant ui.js

    Browser->>raster.js: DOMContentLoaded
    raster.js->>canvas.js: initCanvas()
    canvas.js->>state: state.canvas = #sabak
    canvas.js->>state: state.sbk = getContext("2d")
    raster.js->>canvas.js: initCanvasSize()
    canvas.js->>canvas.js: requestAnimationFrame(setDefaultSize)
    canvas.js->>draw.js: resizeGhost(w, h)
    raster.js->>draw.js: initGhost()
    draw.js->>DOM: create ghost <canvas>, append to .canvas-inner
    raster.js->>memo.js: initMemo()
    memo.js->>DOM: bind Ctrl+Z / Ctrl+Y
    raster.js->>ui.js: initColorPalette, initToolButtons, initShapePopover, ...
    raster.js->>DOM: bind mousemove, mousedown, mouseup, mouseout
    raster.js->>DOM: bind touchmove, touchstart, touchend, touchcancel
```

---

## 2. Drawing a Shape

The following sequence describes drawing a rectangle from mousedown to mouseup.

```mermaid
sequenceDiagram
    participant User
    participant raster.js
    participant draw.js
    participant memo.js
    participant Ghost Canvas
    participant Main Canvas

    User->>Main Canvas: mousedown
    raster.js->>draw.js: onDown(e)
    draw.js->>draw.js: getPos(e) → {x, y}
    draw.js->>state: isDrawing = true, startX = x, startY = y

    loop mousemove events
        User->>Main Canvas: mousemove
        raster.js->>draw.js: onMove(e)
        draw.js->>Ghost Canvas: clearRect(0, 0, w, h)
        draw.js->>Ghost Canvas: beginPath()
        draw.js->>Ghost Canvas: SHAPE_PATH_FNS["rect"](ctx, startX, startY, x, y)
        draw.js->>Ghost Canvas: stroke()
    end

    User->>Main Canvas: mouseup
    raster.js->>draw.js: onUp(e)
    draw.js->>draw.js: hypot(x-startX, y-startY) >= 2 ?
    draw.js->>memo.js: pushUndo()
    memo.js->>Main Canvas: toDataURL(imageFormat) → snapshot
    memo.js->>memo.js: undoStack.push(snapshot)
    draw.js->>Main Canvas: beginPath()
    draw.js->>Main Canvas: SHAPE_PATH_FNS["rect"](ctx, startX, startY, x, y)
    draw.js->>Main Canvas: stroke()
    draw.js->>Ghost Canvas: clearRect(0, 0, w, h)
```

---

## 3. Undo Operation

```mermaid
sequenceDiagram
    participant User
    participant memo.js
    participant Main Canvas
    participant state

    User->>memo.js: Ctrl+Z
    memo.js->>Main Canvas: toDataURL(imageFormat) → currentSnapshot
    memo.js->>memo.js: redoStack.push(currentSnapshot)
    memo.js->>memo.js: snapshot = undoStack.pop()
    memo.js->>memo.js: restoreSnapshot(snapshot)
    memo.js->>Main Canvas: new Image().onload → sbk.drawImage(img, 0, 0)
```

---

## 4. Selection Tool — Define and Move

```mermaid
sequenceDiagram
    participant User
    participant select.js
    participant Ghost Canvas
    participant Main Canvas
    participant memo.js

    Note over User,select.js: Phase 1: Define selection
    User->>Main Canvas: mousedown
    select.js->>select.js: isSelecting = true, anchorX/Y = pos

    loop mousemove
        User->>Main Canvas: mousemove
        select.js->>Ghost Canvas: clearGhost()
        select.js->>Ghost Canvas: draw dashed overlay (shape or freeform path)
    end

    User->>Main Canvas: mouseup
    select.js->>select.js: compute selX1/Y1/X2/Y2 (bbox)
    select.js->>select.js: hasSelection = true
    select.js->>Ghost Canvas: drawFinalOverlay()

    Note over User,select.js: Phase 2: Move selection
    User->>Main Canvas: mousedown (inside selection)
    select.js->>Main Canvas: getImageData(selX1, selY1, w, h) → copiedPixels
    select.js->>Main Canvas: fill vacated area with BG_COLOR
    select.js->>select.js: isDraggingMove = true

    loop mousemove
        User->>Main Canvas: mousemove
        select.js->>Ghost Canvas: clearGhost()
        select.js->>Ghost Canvas: drawImage(offscreen, dropX, dropY)
    end

    User->>Main Canvas: mouseup
    select.js->>Main Canvas: putImageData / drawImage with clip
    select.js->>select.js: update selX1/Y1/X2/Y2
    select.js->>Ghost Canvas: clearGhost()
    select.js->>Ghost Canvas: drawFinalOverlay()
    select.js->>memo.js: pushUndo()
```

---

## 5. Config Modal — Apply Changes

```mermaid
sequenceDiagram
    participant User
    participant config.js
    participant state
    participant memo.js

    User->>config.js: click #btn_config
    config.js->>config.js: detectSupportedFormats()
    config.js->>DOM: populate #config_format_select
    config.js->>DOM: #config_stack_size.val = state.stackSize
    config.js->>DOM: bsModal.show()

    User->>config.js: click #config_apply
    config.js->>state: state.imageFormat = selected format
    config.js->>memo.js: setStackSize(n)
    memo.js->>memo.js: MAX = n
    memo.js->>memo.js: trim undoStack / redoStack to n entries
    memo.js->>state: state.stackSize = n
    config.js->>DOM: bsModal.hide()
```

---

## 6. State Object Lifecycle

The `state` object is the single source of truth for all runtime configuration. The diagram below shows which modules write to which fields.

```
state.canvas          ← canvas.js (initCanvas)
state.sbk             ← canvas.js (initCanvas)
state.tool            ← ui.js (setTool)
state.color           ← ui.js (setColor)
state.lineWidth       ← ui.js (initLineWidth → sync)
state.isDrawing       ← draw.js (onDown, onUp, onLeave)
state.recordMode      ← record.js (toggleRecordMode)
state.fontFace        ← text.js (initTextTool → $select.on("change"))
state.fontSize        ← text.js (initTextTool → $size.on("input"))
state.imageFormat     ← config.js (applyConfig)
state.stackSize       ← memo.js (setStackSize)
state.selectShapeMode ← select.js (initSelectTool → popover click)
                      ← select.js (onSelectDown — arrow guard)
```

All other modules read these fields but do not write them (with the exception of `state.isDrawing`, which is also read by `draw.js` to gate `onMove`).

---

## 7. Ghost Canvas Lifecycle

The ghost canvas is used by two independent subsystems. Their usage must not overlap.

| Subsystem | Uses ghost canvas when |
|---|---|
| `draw.js` | `state.isDrawing === true` and tool is a shape (not pen/eraser) |
| `select.js` | `state.tool === "select"` — during gesture, after finalise, during move drag |

Because `raster.js` dispatches pointer events exclusively to either `draw.js` or `select.js` based on `state.tool`, the two subsystems never use the ghost canvas simultaneously. The ghost is always cleared before use by both subsystems.

---

## 8. Recording Data Flow

```
Frame mode:
  canvas → toDataURL("image/webp") → frames[] → gallery (type: "frames")
                                              → playback (<img> animation)

Stream mode:
  canvas → captureStream(30fps) → MediaRecorder → Blob (video/webm)
                                                → gallery (type: "video")
                                                → playback (<video>)
```

The two modes share the same start/stop/toggle/save API surface in `record.js`, with the implementation delegated to `record-frame.js` and `record-stream.js` respectively.
