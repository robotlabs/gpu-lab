import { vec3 } from "gl-matrix";
import { mat4 } from "wgpu-matrix";

export class Camera {
  private position: vec3;
  private target: vec3;
  private up: vec3;
  private fov: number;
  private aspect: number;
  private near: number;
  private far: number;

  constructor(
    pos: vec3 = [5, 5, 20],
    target: vec3 = [0, 0, 0],
    up: vec3 = [0, 1, 0],
    fov = Math.PI / 4,
    aspect = 1,
    near = 0.1,
    far = 100
  ) {
    this.position = pos;
    this.target = target;
    this.up = up;
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  setAspect(aspect: number) {
    this.aspect = aspect;
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
    return mat4.perspective(this.fov, this.aspect, this.near, this.far);
  }
}
