import { Camera } from "./camera";

export interface Object3D {
  init(): void | Promise<void>;
  render(pass: GPURenderPassEncoder): void;
  updateCameraTransform(): void;
  run?(time: number): void;
  destroy?(): void; // <-- add this
}
export interface UsesCamera {
  setCamera(camera: Camera): void;
}
export type CameraAxis = "x" | "y" | "z";
