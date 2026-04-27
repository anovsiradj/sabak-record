// js/state.js
// Shared application state. All modules import from here.

export const BG_COLOR = "#222";

export const state = {
    canvas:     null,
    sbk:        null,
    tool:       "pen",
    color:      "#ffffff",
    lineWidth:  2,
    isDrawing:  false,
    recordMode: "stream",
    fontFace:   "sans-serif",
    fontSize:   20,          // px, independent of lineWidth
};
