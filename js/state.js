// js/state.js
// Shared application state. All modules import from here.

export const BG_COLOR = "#222";

export const state = {
    canvas:     null,   // <canvas> DOM element
    sbk:        null,   // CanvasRenderingContext2D
    tool:       "pen",  // active tool: pen | eraser | line | rect | circle | text
    color:      "#ffffff",
    lineWidth:  2,
    isDrawing:  false,
    recordMode: "frame", // "frame" | "stream"
};
