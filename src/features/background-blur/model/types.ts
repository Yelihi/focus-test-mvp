export type BackgroundMode =
  | { type: "none" }
  | { type: "blur" }
  | { type: "image"; src: string };

export interface BackgroundPreset {
  id: string;
  label: string;
  mode: BackgroundMode;
  thumbnail: string;
}
