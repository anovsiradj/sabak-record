# Requirements Document

## Introduction

This document describes three enhancement features for Sabak, an HTML5 Canvas whiteboard application. The enhancements are:

1. **Enriched Geometric Shapes** — additional shape tools (triangle, diamond, star, arrow, pentagon, hexagon) added alongside the existing line, rect, and circle tools.
2. **Selection Tool** — a tool that lets users select a rectangular or freeform region of the canvas using the same shape options as the Shape Tool, then move or delete that region.
3. **Config Modal** — a settings dialog accessible from the header that controls the default image format and the undo/redo stack size.

All three features must integrate cleanly with the existing ES-module architecture, jQuery v4, Bootstrap v5 dark theme, left sidebar, and header action bar.

---

## Glossary

- **Sabak**: The single-page HTML5 Canvas whiteboard application being enhanced.
- **Canvas**: The HTML `<canvas>` element with id `sabak` on which all drawing occurs.
- **Ghost_Canvas**: The transparent overlay canvas used for live shape previews without dirtying the main Canvas.
- **Sidebar**: The left panel (`aside.sabak-sidebar`) containing tool buttons and the colour palette.
- **Header**: The top bar (`header.sabak-header`) containing action buttons and status indicators.
- **State**: The shared application state object exported from `js/state.js`.
- **Undo_Stack**: The array of canvas snapshots maintained by `js/memo.js` that supports undo operations.
- **Redo_Stack**: The array of canvas snapshots maintained by `js/memo.js` that supports redo operations.
- **Snapshot**: A data-URL string representing the full canvas pixel content at a point in time, used by the Undo_Stack and Redo_Stack.
- **BG_COLOR**: The canvas background fill colour constant (`#222`) defined in `js/state.js`.
- **Shape_Tool**: Any tool that draws a closed or open geometric path on the Canvas (line, rect, circle, and the new shapes).
- **Selection_Shape**: The boundary shape used to define a Selection region — one of the same shape types available in the Shape_Tool (rect, freeform/pen path, circle, triangle, diamond, star, arrow, pentagon, hexagon).
- **Selection**: A user-defined region of the Canvas bounded by a Selection_Shape, that can be moved or deleted.
- **Selection_Overlay**: A visual indicator (dashed border) rendered on the Ghost_Canvas to show the active Selection boundary.
- **Config_Modal**: The Bootstrap modal dialog opened by the new "Config" header button, containing application settings.
- **Image_Format**: The MIME type used when encoding canvas Snapshots and gallery captures. The available options are all formats supported by the browser's `HTMLCanvasElement.toDataURL()` implementation.
- **Stack_Size**: The maximum number of Snapshots the Undo_Stack and Redo_Stack may each hold, configurable between 9 and 99.

---

## Requirements

### Requirement 1: Extended Shape Tools

**User Story:** As a user, I want additional geometric shape tools (triangle, diamond, star, arrow, pentagon, hexagon), so that I can draw richer diagrams without switching to a different application.

#### Acceptance Criteria

1. THE Sidebar SHALL display tool buttons for triangle, diamond, star, arrow, pentagon, and hexagon in the existing drawing-tools group, after the circle button.
2. WHEN a shape tool button is clicked, THE State SHALL set `tool` to the corresponding shape identifier (`triangle`, `diamond`, `star`, `arrow`, `pentagon`, `hexagon`).
3. WHEN the user presses the mouse button on the Canvas while a Shape_Tool is active, THE Ghost_Canvas SHALL begin rendering a live preview of the shape scaled to the bounding box defined by the pointer-down point and the current pointer position.
4. WHEN the user releases the mouse button on the Canvas while a Shape_Tool is active, THE Draw_Module SHALL commit the final shape to the Canvas using the current stroke colour and line width, then clear the Ghost_Canvas.
5. WHEN a shape is committed to the Canvas, THE Undo_Stack SHALL receive a Snapshot of the Canvas state taken immediately before the shape was drawn.
6. THE Draw_Module SHALL render each shape as follows:
   - **Triangle**: equilateral-style triangle inscribed in the drag bounding box, apex at the top-centre.
   - **Diamond**: four-point rhombus with vertices at the midpoints of the bounding box edges.
   - **Star**: five-pointed star inscribed in the drag bounding box.
   - **Arrow**: directional arrow oriented from the drag start point toward the drag end point, with a shaft and arrowhead scaled to the drag distance.
   - **Pentagon**: regular five-sided polygon inscribed in the drag bounding box.
   - **Hexagon**: regular six-sided polygon inscribed in the drag bounding box.
7. WHEN the user drags a Shape_Tool on the Canvas, THE Ghost_Canvas SHALL update the preview on every pointer-move event without accumulating previous previews.
8. IF the pointer is released outside the Canvas boundary, THE Draw_Module SHALL commit the shape using the last known in-bounds pointer position.

---

### Requirement 2: Selection Tool

**User Story:** As a user, I want to select a region of the canvas using the same shape options available in the Shape Tool, and then move or delete it, so that I can rearrange or remove parts of my drawing without redrawing everything.

#### Acceptance Criteria

1. THE Sidebar SHALL display a selection tool button (distinct icon) in the drawing-tools group.
2. WHEN the selection tool button is clicked, THE State SHALL set `tool` to `"select"`.
3. WHILE `tool` is `"select"`, THE Canvas cursor SHALL be set to `"crosshair"`.
4. THE Selection_Tool SHALL support the same set of Selection_Shape options as the Shape_Tool: rectangular (rect), freeform (pen path), circle, triangle, diamond, star, arrow, pentagon, and hexagon. The active Selection_Shape SHALL be determined by a shape-mode control visible in the Sidebar only when the selection tool is active.
5. WHEN the user presses the mouse button on the Canvas, THE Selection_Tool SHALL record the anchor point and, on pointer-move, render a dashed Selection_Overlay on the Ghost_Canvas in the active Selection_Shape, scaled to the current pointer position.
6. WHEN the user presses the mouse button on the Canvas in freeform mode, THE Selection_Tool SHALL record the path of pointer positions and render a dashed freeform Selection_Overlay on the Ghost_Canvas tracing that path.
7. WHEN the user releases the mouse button after defining a Selection, THE Selection_Tool SHALL finalise the Selection boundary and keep the Selection_Overlay visible on the Ghost_Canvas.
8. WHILE a Selection is active, THE Selection_Tool SHALL display move and delete action controls accessible to the user (buttons in the Sidebar or keyboard shortcuts).
9. WHEN the user initiates a move action on an active Selection, THE Selection_Tool SHALL copy the pixel content within the Selection boundary from the Canvas, fill the vacated area with BG_COLOR, and allow the user to drag the copied content to a new position on the Canvas.
10. WHEN the user drops the moved content at a new position, THE Selection_Tool SHALL composite the copied pixels onto the Canvas at the new position, clear the Selection_Overlay from the Ghost_Canvas, and push a Snapshot to the Undo_Stack.
11. WHEN the user initiates a delete action on an active Selection, THE Selection_Tool SHALL fill the Selection boundary area on the Canvas with BG_COLOR, clear the Selection_Overlay from the Ghost_Canvas, and push a Snapshot to the Undo_Stack.
12. WHEN the user presses the `Escape` key while a Selection is active, THE Selection_Tool SHALL cancel the Selection and clear the Selection_Overlay without modifying the Canvas.
13. WHEN the user clicks on the Canvas outside an active Selection boundary, THE Selection_Tool SHALL cancel the current Selection and begin a new selection gesture from the click point.
14. IF the user releases the mouse button without dragging (zero-area selection), THE Selection_Tool SHALL cancel the gesture without creating a Selection.

---

### Requirement 3: Config Modal

**User Story:** As a user, I want a Config dialog accessible from the header, so that I can adjust the default image format and undo/redo stack size to suit my workflow.

#### Acceptance Criteria

1. THE Header SHALL display a "Config" button positioned to the left of the existing "Info" button in the right-side status area.
2. WHEN the Config button is clicked, THE Config_Modal SHALL open as a Bootstrap modal dialog.
3. THE Config_Modal SHALL contain an Image_Format selector whose options are all image MIME types supported by the browser's `HTMLCanvasElement.toDataURL()` at runtime, with `image/webp` selected by default.
4. THE Config_Modal SHALL detect supported formats at runtime by probing `HTMLCanvasElement.toDataURL()` for each candidate format (`image/webp`, `image/png`, `image/jpeg`, `image/avif`) and include only those that return a non-generic data-URL.
5. THE Config_Modal SHALL contain a Stack_Size control (number input or slider) with a minimum value of 9, a maximum value of 99, and a default value of 10, displaying the current value to the user.
6. WHEN the user changes the Image_Format setting and confirms, THE State SHALL update the active Image_Format and THE Memo_Module SHALL use the new format for all subsequent Snapshots.
7. WHEN the user changes the Stack_Size setting and confirms, THE Memo_Module SHALL update the maximum Undo_Stack and Redo_Stack capacity to the new value.
8. WHEN the Stack_Size is reduced below the current number of entries in the Undo_Stack or Redo_Stack, THE Memo_Module SHALL trim the oldest entries from each stack until each stack length is within the new Stack_Size limit.
9. THE Gallery_Module and THE Canvas_Module SHALL use the active Image_Format when encoding canvas captures and resize snapshots.
10. WHEN the Config_Modal is opened, THE Config_Modal SHALL display the currently active Image_Format and Stack_Size values.
11. IF the user closes the Config_Modal without confirming (dismiss or Escape), THE Config_Modal SHALL discard any unsaved changes and retain the previously active settings.
