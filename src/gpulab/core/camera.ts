import { vec3 } from "gl-matrix";
import { mat4 } from "wgpu-matrix";

export enum CameraType {
  Perspective = "perspective",
  Orthographic = "orthographic",
}

export interface CameraOptions {
  pos?: vec3;
  target?: vec3;
  up?: vec3;
  // for perspective
  fov?: number;
  // for both
  aspect?: number;
  near?: number;
  far?: number;
  // for orthographic
  orthoSize?: number; // half-height of the ortho box
  type?: CameraType;
}

export class Camera {
  private position: vec3;
  private target: vec3;
  private up: vec3;

  private fov: number;
  private aspect: number;
  private near: number;
  private far: number;

  private orthoSize: number;
  private type: CameraType;

  constructor(options: CameraOptions = {}) {
    this.position = options.pos ?? [5, 5, 20];
    this.target = options.target ?? [0, 0, 0];
    this.up = options.up ?? [0, 1, 0];

    this.fov = options.fov ?? Math.PI / 4;
    this.aspect = options.aspect ?? 1;
    this.near = options.near ?? 0.1;
    this.far = options.far ?? 100;

    // orthographic-specific
    this.orthoSize = options.orthoSize ?? 10;

    this.type = options.type ?? CameraType.Perspective;
  }

  setType(type: CameraType) {
    this.type = type;
  }

  setAspect(aspect: number) {
    this.aspect = aspect;
  }

  setOrthoSize(size: number) {
    this.orthoSize = size;
  }

  setPosition(pos: vec3) {
    this.position = pos;
  }

  getPosition(): vec3 {
    return this.position;
  }

  getViewMatrix(): Float32Array {
    return mat4.lookAt(this.position, this.target, this.up);
  }

  getProjectionMatrix(): Float32Array {
    if (this.type === CameraType.Perspective) {
      return mat4.perspective(this.fov, this.aspect, this.near, this.far);
    } else {
      // compute left/right/top/bottom from orthoSize and aspect
      const halfH = this.orthoSize;
      const halfW = halfH * this.aspect;
      return mat4.ortho(-halfW, halfW, -halfH, halfH, this.near, this.far);
    }
  }
}
