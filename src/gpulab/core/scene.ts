// webGpu/scene/Scene.ts
import { Camera } from "./camera";
import { Object3D } from "./types";

export class Scene {
  private objects: Object3D[] = [];
  private camera: Camera;

  constructor(camera: Camera) {
    this.camera = camera;
  }

  add(obj: Object3D) {
    if ("setCamera" in obj && typeof obj.setCamera === "function") {
      obj.setCamera(this.camera);
    }
    this.objects.push(obj);
    obj.init();
  }

  remove(obj: Object3D) {
    this.objects = this.objects.filter((o) => o !== obj);
  }
  clear() {
    for (const obj of this.objects) {
      if ("destroy" in obj && typeof obj.destroy === "function") {
        obj.destroy();
      }
    }
    this.objects = [];
  }

  render(pass: GPURenderPassEncoder) {
    for (const obj of this.objects) {
      obj.render(pass);
    }
  }

  updateCameraTransform() {
    for (const obj of this.objects) {
      obj.updateCameraTransform();
    }
  }

  run(time: number) {
    for (const obj of this.objects) {
      obj.run?.(time);
    }
  }
}
