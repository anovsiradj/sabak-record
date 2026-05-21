# Sabak — Module API Reference

This document lists every exported symbol from each module, with signatures and descriptions.

---

## `js/state.js`

### Exports

#### `BG_COLOR: string`
Canvas background fill colour constant. Value: `"#222"`.

#### `state: object`
Shared mutable application state. All modules read and write this object directly.

| Field | Type | Default | Description |
|---|---|---|---|
| `canvas` | `HTMLCanvasElement \| null` | `null` | The main `<canvas>` element |
| `sbk` | `CanvasRenderingContext2D \| null` | `null` | 2D rendering context of `canvas` |
| `tool` | `string` | `"pen"` | Active tool name |
| `color` | `string` | `"#ffffff"` | Active stroke/fill colour (CSS hex) |
| `lineWidth` | `number` | `2` | Stroke width in canvas pixels |
| `isDrawing` | `boolean` | `false` | True while a pen/eraser stroke is in progress |
| `recordMode` | `string` | `"stream"` | Recording mode: `"stream"` or `"frame"` |
| `fontFace` | `string` | `"sans-serif"` | Active font family for text tool |
| `fontSize` | `number` | `20` | Active font size in pixels |
| `imageFormat` | `string` | `"image/webp"` | MIME type for all `toDataURL` calls |
| `stackSize` | `number` | `10` | Max entries per undo/redo stack (9–99) |
| `selectShapeMode` | `string` | `"rect"` | Active shape for the selection tool |

---

## `js/draw.js`

### Ghost Canvas

#### `initGhost(): void`
Creates the ghost canvas element, positions it absolutely over the main canvas, and appends it to the `.canvas-inner` wrapper. Must be called after `initCanvas()`.

#### `resizeGhost(w: number, h: number): void`
Updates the ghost canvas dimensions. Called by `canvas.js` on resize.

#### `getGhostCtx(): CanvasRenderingContext2D`
Returns the ghost canvas 2D rendering context.

#### `getGhost(): HTMLCanvasElement`
Returns the ghost canvas element.

#### `clearGhost(): void`
Clears the entire ghost canvas with `clearRect`.

### Shape Path Functions

All path functions accept `(ctx, x1, y1, x2, y2)` where `(x1,y1)` is the drag start and `(x2,y2)` is the drag end. They call `ctx.beginPath()` and build the path but do **not** call `stroke()` or `fill()`.

#### `pathTriangle(ctx, x1, y1, x2, y2): void`
Equilateral-style triangle: apex at `((x1+x2)/2, y1)`, base at `(x1, y2)` and `(x2, y2)`.

#### `pathDiamond(ctx, x1, y1, x2, y2): void`
Four-point rhombus with vertices at the midpoints of the bounding box edges.

#### `pathStar(ctx, x1, y1, x2, y2): void`
Five-pointed star. Outer radius `r = min(w,h)/2`, inner radius `r × 0.382`. First outer point at top.

#### `pathArrow(ctx, x1, y1, x2, y2): void`
Open line arrow: shaft from `(x1,y1)` to `(x2,y2)` with two barbs at 30° off the tip. Uses `ctx.save()`/`ctx.translate()`/`ctx.rotate()`/`ctx.restore()` to align with the drag vector.

#### `pathPentagon(ctx, x1, y1, x2, y2): void`
Regular pentagon inscribed in a circle of radius `min(w,h)/2`. First vertex at top.

#### `pathHexagon(ctx, x1, y1, x2, y2): void`
Regular hexagon inscribed in a circle of radius `min(w,h)/2`. First vertex at top.

#### `SHAPE_PATH_FNS: object`
Dispatch map of all shape path functions, keyed by tool name:
```
{ line, rect, circle, triangle, diamond, star, arrow, pentagon, hexagon }
```

### Event Handlers

#### `onDown(e: Event): void`
Handles `mousedown`/`touchstart` for pen, eraser, and shape tools.

#### `onMove(e: Event): void`
Handles `mousemove`/`touchmove`. For pen/eraser: draws directly to main canvas. For shapes: clears ghost and draws preview.

#### `onUp(e: Event): void`
Handles `mouseup`/`touchend`. For shapes: applies zero-area guard, pushes undo snapshot, commits shape to main canvas, clears ghost.

#### `onLeave(): void`
Handles `mouseout`/`touchcancel`. Ends pen/eraser strokes in progress.

### Coordinate Helper

#### `getPos(e: Event): {x: number, y: number}`
Normalises mouse and touch events to canvas coordinates, accounting for CSS scaling.

---

## `js/select.js`

### Event Handlers

#### `onSelectDown(e: Event): void`
Handles pointer-down for the selection tool. If a selection is active and the click is inside it, begins a move drag. If outside, cancels the selection and starts a new gesture.

#### `onSelectMove(e: Event): void`
Handles pointer-move. During a selection gesture: appends to `freeformPath` (pen mode) or updates `curX`/`curY` (shape mode) and redraws the overlay. During a move drag: updates offset and renders the move preview on the ghost canvas.

#### `onSelectUp(e: Event): void`
Handles pointer-up. Finalises the selection (computes bounding box, sets `hasSelection = true`) or drops the moved content onto the main canvas and pushes an undo snapshot.

#### `onSelectLeave(): void`
Cancels an in-progress selection gesture without modifying the canvas.

### Operations

#### `deleteSelection(): void`
Fills the selection region with `BG_COLOR` (using `ctx.clip()` for non-rectangular shapes), clears the ghost canvas, pushes an undo snapshot, and resets all selection state. No-op if `hasSelection === false`.

#### `cancelSelection(): void`
Resets all selection state and clears the ghost canvas without modifying the main canvas.

### Initialisation

#### `initSelectTool(): void`
Wires up keyboard shortcuts (`Delete`/`Backspace`, `Escape`) and shape-mode button clicks in `#select_shape_popover`.

---

## `js/memo.js`

#### `setStackSize(n: number): void`
Sets the maximum stack depth to `n`. Trims both stacks to `n` entries (oldest first). Updates `state.stackSize`.

#### `pushUndo(): void`
Serialises the current canvas state as a data-URL and pushes it onto the undo stack. Clears the redo stack.

#### `popUndo(): void`
Saves the current canvas state to the redo stack, then restores the most recent undo snapshot.

#### `popRedo(): void`
Saves the current canvas state to the undo stack, then restores the most recent redo snapshot.

#### `clearUndo(): void`
Empties both the undo and redo stacks.

#### `initMemo(): void`
Registers `Ctrl+Z` (undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (redo) keyboard handlers.

---

## `js/canvas.js`

#### `PRESETS: Array<[string, number, number]>`
Array of aspect-ratio presets: `[label, widthRatio, heightRatio]`.

#### `initCanvas(): void`
Assigns `state.canvas` and `state.sbk` from the `#sabak` element.

#### `initCanvasSize(): void`
Wires up the canvas size `<select>` and window resize handler. Calls `setDefaultSize()` on the next animation frame.

#### `setDefaultSize(): void`
Resizes the canvas to fill the `#canvas_wrapper` element.

#### `applyPreset(label: string): void`
Resizes the canvas to the named aspect-ratio preset, fitting within the wrapper.

#### `clearCanvas(): void`
Fills the canvas with `BG_COLOR`.

---

## `js/ui.js`

#### `initColorPalette(): void`
Wires up the colour trigger button, colour popover, preset swatches, and custom colour picker.

#### `setTool(name: string): void`
Sets `state.tool`, updates canvas cursor, highlights the active tool button, and updates the shape trigger icon.

#### `initToolButtons(): void`
Wires click handlers to direct sidebar tool buttons (pen, eraser, text).

#### `initShapePopover(): void`
Wires the shape trigger button to show/hide `#shape_popover` on hover, and wires shape button clicks inside the popover.

#### `initSelectShapePopover(): void`
Wires the select trigger button to show/hide `#select_shape_popover` on hover, activates the select tool on click, and wires shape-mode button clicks inside the popover.

#### `initLineWidth(): void`
Wires the line-width trigger button to show/hide `#lw_popover` on hover, and syncs the slider to `state.lineWidth`.

#### `resetCanvas(): void`
Clears the undo stack, clears the canvas, resets the tool to pen, and resets the colour to white.

#### `updateOrdinat(x: number, y: number): void`
Updates the `#sbk_ordinat` coordinate badge in the header.

---

## `js/config.js`

#### `detectSupportedFormats(): string[]`
Probes `canvas.toDataURL` for each candidate format and returns only those that produce a matching data-URL prefix. Candidate formats: `["image/webp", "image/png", "image/jpeg", "image/avif"]`.

#### `initConfig(): void`
Wires the Config button to open the config modal (populating it with current state and detected formats), and wires the Apply button to `applyConfig()`.

---

## `js/gallery.js`

#### `addToGallery(item: object): void`
Adds an item to the in-memory gallery and re-renders the grid. Item types: `{type: "image", src, label}`, `{type: "video", src, blob, label}`, `{type: "frames", frames, label}`.

#### `captureToGallery(): void`
Captures the current canvas state as a data-URL and adds it to the gallery.

#### `openLightbox(startIdx: number): void`
Opens the gallery lightbox Bootstrap modal at the given item index.

#### `initGallery(): void`
Renders the initial (empty) gallery grid.

---

## `js/text.js`

#### `showTextInput(x: number, y: number): void`
Creates and positions a `<textarea>` overlay at the given canvas coordinates. Commits text to the canvas on `Enter` or `blur`; cancels on `Escape`.

#### `initTextTool(): Promise<void>`
Enumerates available fonts (web-safe list + `document.fonts` + `queryLocalFonts` if available), populates the font picker `<select>`, and wires the text tool hover popover.

---

## `js/record.js`

#### `recordStart(): void`
Starts recording in the current mode. Falls back to frame mode if `MediaRecorder` is unavailable.

#### `recordStop(): void`
Stops recording and shows the playback preview.

#### `recordToggle(): void`
Toggles recording on/off.

#### `play(): void`
Plays back the most recent recording in the preview area.

#### `closePreview(): void`
Hides the playback preview.

#### `saveRecordingToGallery(): void`
Saves the most recent recording to the gallery.

#### `toggleRecordMode(): void`
Switches between `"stream"` and `"frame"` recording modes.

#### `syncModeToggle(): void`
Updates the record mode button label and tooltip to reflect `state.recordMode`.
