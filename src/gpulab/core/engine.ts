import {
  initWebGPU,
  createDefaultRenderPassDescriptor,
  createMultiSampledTexture,
} from "./utils";
import { Scene } from "./scene";
import { Camera, CameraType } from "./camera";
import { sampleCount } from "./config";
import { vec3 } from "gl-matrix";

export class Engine {
  private device!: GPUDevice;
  private canvas!: HTMLCanvasElement;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private multiSampledTexture!: GPUTexture;
  private depthTexture!: GPUTexture;
  private renderPassDescriptor!: GPURenderPassDescriptor;

  private scene: Scene;
  private camera: Camera;

  constructor(
    { canvas }: { canvas: HTMLCanvasElement },
    cameraPos: vec3 = [5, 5, 20]
  ) {
    this.canvas = canvas;

    // Perspective camera
    const perspCam = new Camera({
      type: CameraType.Perspective,
      fov: Math.PI / 3,
      aspect: canvas.width / canvas.height,
      pos: cameraPos,
    });

    // Orthographic camera
    const orthoCam = new Camera({
      type: CameraType.Orthographic,
      aspect: canvas.width / canvas.height,
      orthoSize: 5, // half-height of view volume
      near: -20,
      far: 20,
      pos: cameraPos,
    });
    this.camera = perspCam; //new Camera(cameraPos);
  }

  async init(): Promise<void> {
    const gpu = await initWebGPU(this.canvas);
    this.device = gpu.device;
    this.context = gpu.context;
    this.format = gpu.presentationFormat;

    this.resize();
  }

  setScene(scene: Scene): void {
    this.scene = scene;
    this.scene.updateCameraTransform();
  }

  render(): void {
    if (!this.scene) return;

    const colorAttachments = this.renderPassDescriptor
      .colorAttachments as GPURenderPassColorAttachment[];
    colorAttachments[0].view = this.multiSampledTexture.createView();
    colorAttachments[0].resolveTarget = this.context
      .getCurrentTexture()
      .createView();
    this.renderPassDescriptor.depthStencilAttachment!.view =
      this.depthTexture.createView();

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass(this.renderPassDescriptor);

    this.scene.render(pass);

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  resize(): void {
    this.canvas.width = window.innerWidth * devicePixelRatio;
    this.canvas.height = window.innerHeight * devicePixelRatio;

    this.multiSampledTexture?.destroy();
    this.multiSampledTexture = createMultiSampledTexture(
      this.device,
      this.canvas,
      this.format
    );

    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount,
    });

    this.renderPassDescriptor = createDefaultRenderPassDescriptor(
      this.depthTexture
    );
  }

  getDevice(): GPUDevice {
    return this.device;
  }

  getFormat(): GPUTextureFormat {
    return this.format;
  }

  getCamera(): Camera {
    return this.camera;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getScene(): Scene | undefined {
    return this.scene;
  }
}
