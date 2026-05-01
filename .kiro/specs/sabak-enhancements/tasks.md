# Implementation Tasks — Sabak Enhancements

## Task List

- [x] 1. Extend shared state (`js/state.js`)
  - [x] 1.1 Add `imageFormat: "image/webp"` field to the `state` object
  - [x] 1.2 Add `stackSize: 10` field to the `state` object
  - [x] 1.3 Add `selectShapeMode: "rect"` field to the `state` object

- [x] 2. Add ghost canvas accessors to `js/draw.js`
  - [x] 2.1 Export `getGhostCtx()` — returns `gctx`
  - [x] 2.2 Export `getGhost()` — returns `ghost`
  - [x] 2.3 Export `clearGhost()` — calls `gctx.clearRect(0, 0, ghost.width, ghost.height)`

- [x] 3. Implement new shape path functions in `js/draw.js`
  - [x] 3.1 Implement and export `pathTriangle(ctx, x1, y1, x2, y2)` — apex at top-centre, base at bottom
  - [x] 3.2 Implement and export `pathDiamond(ctx, x1, y1, x2, y2)` — four vertices at midpoints of bounding box edges
  - [x] 3.3 Implement and export `pathStar(ctx, x1, y1, x2, y2)` — five-pointed star, outer radius `min(w,h)/2`, inner radius `r*0.382`
  - [x] 3.4 Implement and export `pathArrow(ctx, x1, y1, x2, y2)` — shaft along x-axis in local coords, rotated via `ctx.save()`/`ctx.translate()`/`ctx.rotate()`/`ctx.restore()` to align with drag vector
  - [x] 3.5 Implement and export `pathPentagon(ctx, x1, y1, x2, y2)` — five vertices on circle of radius `min(w,h)/2`, first at top
  - [x] 3.6 Implement and export `pathHexagon(ctx, x1, y1, x2, y2)` — six vertices on circle of radius `min(w,h)/2`, first at top
  - [x] 3.7 Export `SHAPE_PATH_FNS` map covering all shape names including `rect`, `circle`, `line`, and the six new shapes

- [x] 4. Update `js/draw.js` event handlers to use `SHAPE_PATH_FNS`
  - [x] 4.1 Refactor `onMove` to use `SHAPE_PATH_FNS` lookup for ghost canvas preview instead of `if/else` chains
  - [x] 4.2 Refactor `onUp` to use `SHAPE_PATH_FNS` lookup for committing shapes to the main canvas
  - [x] 4.3 Apply zero-area guard (2px threshold) in `onUp` for all shape tools — skip commit and clear ghost if drag distance < 2px

- [x] 5. Add new shape tool buttons to `raster.html` sidebar
  - [x] 5.1 Add `<button class="tool-btn" data-tool="triangle">` after the circle button
  - [x] 5.2 Add `<button class="tool-btn" data-tool="diamond">`
  - [x] 5.3 Add `<button class="tool-btn" data-tool="star">`
  - [x] 5.4 Add `<button class="tool-btn" data-tool="arrow">`
  - [x] 5.5 Add `<button class="tool-btn" data-tool="pentagon">`
  - [x] 5.6 Add `<button class="tool-btn" data-tool="hexagon">`
  - [x] 5.7 Choose appropriate Bootstrap Icons for each new shape button

- [x] 6. Update `js/ui.js` to handle new tools
  - [x] 6.1 Add all six new shape names to the `cursors` map in `setTool` (all map to `"crosshair"`)
  - [x] 6.2 Add `"select"` to the `cursors` map (maps to `"crosshair"`)
  - [x] 6.3 Add show/hide logic for `#select_shape_panel` in `setTool` — visible only when `state.tool === "select"`

- [x] 7. Update `js/memo.js` for dynamic stack size and configurable image format
  - [x] 7.1 Change `const MAX = 10` to `let MAX = state.stackSize` (or just `let MAX = 10`)
  - [x] 7.2 Implement and export `setStackSize(n)` — updates `MAX`, trims both stacks to `n` entries (oldest first), updates `state.stackSize`
  - [x] 7.3 Update `pushUndo()` to use `state.imageFormat` instead of hardcoded `"image/webp"`
  - [x] 7.4 Update `popUndo()` to use `state.imageFormat` for the redo snapshot
  - [x] 7.5 Update `popRedo()` to use `state.imageFormat` for the undo snapshot

- [x] 8. Update `js/gallery.js` and `js/canvas.js` for configurable image format
  - [x] 8.1 Update `captureToGallery()` in `gallery.js` to use `state.imageFormat` instead of `"image/webp"`
  - [x] 8.2 Update `resizeCanvas()` in `canvas.js` to use `state.imageFormat` instead of `"image/webp"`

- [x] 9. Create `js/config.js` — Config Modal module
  - [x] 9.1 Implement `detectSupportedFormats()` — probes `canvas.toDataURL` for each candidate format and returns only those returning a non-generic data-URL
  - [x] 9.2 Implement `populateModal()` — reflects `state.imageFormat` and `state.stackSize` into the modal controls
  - [x] 9.3 Implement `applyConfig()` — reads format and stack size from controls, validates stack size is in `[9, 99]` (clamping if needed), updates `state.imageFormat`, calls `setStackSize()`, hides modal
  - [x] 9.4 Implement `initConfig()` — wires up Config button click (populate + show modal), Apply button click, and populates the format `<select>` with detected formats
  - [x] 9.5 Handle edge case: if `state.imageFormat` is not in the detected list on modal open, fall back to `"image/png"`
  - [x] 9.6 Handle edge case: if `detectSupportedFormats()` returns empty array, use `["image/png"]` as fallback

- [x] 10. Add Config Modal HTML to `raster.html`
  - [x] 10.1 Add Config button (`id="btn_config"`) to the header status area, before the Info button
  - [x] 10.2 Add Config Modal (`id="configModal"`) Bootstrap modal markup at end of `<body>`, before the Info Modal
  - [x] 10.3 Modal body: format `<select id="config_format_select">` with label "Format Gambar"
  - [x] 10.4 Modal body: stack size `<input type="number" id="config_stack_size" min="9" max="99" value="10">` with label "Ukuran Stack Undo/Redo"
  - [x] 10.5 Modal footer: "Batal" dismiss button and "Terapkan" apply button (`id="config_apply"`)

- [x] 11. Create `js/select.js` — Selection Tool module
  - [x] 11.1 Declare module-level state variables: `anchorX`, `anchorY`, `curX`, `curY`, `isSelecting`, `hasSelection`, `selX1`, `selY1`, `selX2`, `selY2`, `freeformPath`, `copiedPixels`, `isDraggingMove`, `moveOffsetX`, `moveOffsetY`
  - [x] 11.2 Implement `drawOverlay()` — clears ghost canvas, draws dashed selection boundary using `SHAPE_PATH_FNS` (or freeform path) on the ghost canvas
  - [x] 11.3 Implement `onSelectDown(e)` — records anchor point, sets `isSelecting = true`; if a selection is active and click is outside boundary, cancel selection and start new gesture; if move drag is in progress, handle move anchor
  - [x] 11.4 Implement `onSelectMove(e)` — updates `curX`/`curY`, calls `drawOverlay()` during selection gesture; during move drag, renders `copiedPixels` on ghost canvas at current offset
  - [x] 11.5 Implement `onSelectUp(e)` — finalises selection (sets `hasSelection = true`, records bounding box); applies zero-area guard (no selection if drag < 2px); on move drop, composites pixels back to main canvas using `ctx.clip()` for non-rectangular shapes, clears ghost, calls `pushUndo()`
  - [x] 11.6 Implement `onSelectLeave()` — cancels in-progress selection gesture without modifying canvas
  - [x] 11.7 Implement `deleteSelection()` — fills selection region with `BG_COLOR` (using `ctx.clip()` for non-rectangular shapes), clears ghost, calls `pushUndo()`, resets selection state; no-op if `hasSelection === false`
  - [x] 11.8 Implement `cancelSelection()` — resets all selection state, clears ghost canvas, does not modify main canvas
  - [x] 11.9 Implement `initSelectTool()` — wires up Delete/Backspace key for `deleteSelection()`, Escape key for `cancelSelection()`, shape-mode button clicks in `#select_shape_panel`, and delete button click
  - [x] 11.10 Export all public functions: `onSelectDown`, `onSelectMove`, `onSelectUp`, `onSelectLeave`, `deleteSelection`, `cancelSelection`, `initSelectTool`

- [x] 12. Add Selection Tool HTML to `raster.html` sidebar
  - [x] 12.1 Add selection tool button (`data-tool="select"`) to the drawing-tools group with a distinct icon (e.g. `bi-bounding-box`)
  - [x] 12.2 Add `<div id="select_shape_panel" class="d-none">` sub-panel after the drawing-tools group — contains shape-mode buttons (rect, circle, triangle, diamond, star, arrow, pentagon, hexagon, pen/freeform) and a "Hapus Seleksi" delete button
  - [x] 12.3 Add a separator between the drawing-tools group and the select shape panel

- [x] 13. Update `raster.js` entry point
  - [x] 13.1 Import `onSelectDown`, `onSelectMove`, `onSelectUp`, `onSelectLeave`, `initSelectTool` from `./js/select.js`
  - [x] 13.2 Import `initConfig` from `./js/config.js`
  - [x] 13.3 Add `if (state.tool === "select")` dispatch branches to `handleDown`, `handleMove`, `handleUp`, `handleLeave`
  - [x] 13.4 Call `initSelectTool()` and `initConfig()` in the `$(function () { … })` bootstrap block

- [x] 14. Write property-based tests using fast-check
  - [x] 14.1 P1 — Shape button activates correct state: for any shape name in the set, clicking its button sets `state.tool` to that name
  - [x] 14.2 P2 — Shape path points lie within bounding box: for any non-zero bounding box, all vertices from each path function lie within or on the box
  - [x] 14.3 P3 — Shape commit grows undo stack: for any shape tool and non-zero drag, `undoStack.length` increases by 1 after mouseup
  - [x] 14.4 P4 — Ghost canvas cleared on each move event: for any sequence of move events, ghost canvas contains only the most recent preview
  - [x] 14.5 P5 — Selection sub-panel visibility matches tool: for any tool value, `#select_shape_panel` is visible iff `state.tool === "select"`
  - [x] 14.6 P6 — Action controls visible iff selection active: for any `hasSelection` boolean, move/delete controls visibility matches `hasSelection`
  - [x] 14.7 P7 — Delete fills BG_COLOR and pushes snapshot: for any selection region, after `deleteSelection()` all pixels in region equal `BG_COLOR` and `undoStack.length` increased by 1
  - [x] 14.8 P8 — Escape leaves canvas pixels unchanged: for any canvas state with active selection, pressing Escape leaves all pixels unchanged
  - [x] 14.9 P9 — Format probe correctness: for any mock `toDataURL`, `detectSupportedFormats()` returns exactly the formats returning non-generic data-URLs
  - [x] 14.10 P10 — Confirmed format used in snapshots: for any supported format confirmed via Config Modal, next `pushUndo()` data-URL starts with `"data:" + fmt`
  - [x] 14.11 P11 — Stack cap enforced: for any `N` in `[9, 99]` and push count > `N`, `undoStack.length === N`
  - [x] 14.12 P12 — Stack trimmed on size reduction: for any stack of length `L` and new size `N < L`, `setStackSize(N)` results in `undoStack.length === N`
  - [x] 14.13 P13 — Config modal reflects current state: for any `imageFormat` and `stackSize` values, opening modal displays those exact values
  - [x] 14.14 P14 — Cancel discards changes: for any changes made inside modal, dismissing without "Terapkan" leaves `state.imageFormat` and `state.stackSize` unchanged
