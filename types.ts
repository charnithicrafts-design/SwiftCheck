export interface ImageState {
  id: string;
  src: string;
  name: string;
  dimensions?: { width: number; height: number };
  size?: number;
}

export interface TransformState {
  x: number;
  y: number;
  scale: number;
}
