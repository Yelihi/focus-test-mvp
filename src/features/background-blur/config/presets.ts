import type { BackgroundPreset } from "../model/types";

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "none", label: "없음", mode: { type: "none" }, thumbnail: "" },
  { id: "blur", label: "블러", mode: { type: "blur" }, thumbnail: "" },
  { id: "library", label: "도서관", mode: { type: "image", src: "/backgrounds/library.jpg" }, thumbnail: "/backgrounds/thumb-library.jpg" },
  { id: "cafe", label: "카페", mode: { type: "image", src: "/backgrounds/cafe.jpg" }, thumbnail: "/backgrounds/thumb-cafe.jpg" },
  { id: "forest", label: "숲", mode: { type: "image", src: "/backgrounds/forest.jpg" }, thumbnail: "/backgrounds/thumb-forest.jpg" },
  { id: "ocean", label: "바다", mode: { type: "image", src: "/backgrounds/ocean.jpg" }, thumbnail: "/backgrounds/thumb-ocean.jpg" },
];
