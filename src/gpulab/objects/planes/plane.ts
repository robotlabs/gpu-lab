import { Object3D } from "../../core/types";
import gsap from "gsap";
import {
  makeRotationMatrix,
  makeScaleMatrix,
  makeTranslationMatrix,
  multiplyMatrices,
} from "../../core/matrix";
import { Camera } from "../../core/camera";
import { PlaneProps } from "./plane-types";
import { createPlaneGeometry, createSinglePlanePipeline } from "./plane-utils";

export class Plane implements Object3D {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private props: PlaneProps;
  private shader: GPUShaderModule;
  private texture: GPUTexture;
  private sampler: GPUSampler;

  private vertexBuffer!: GPUBuffer;
  private indexBuffer!: GPUBuffer;
  private transformBuffer!: GPUBuffer;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;

  private camera!: Camera;

  private tweens: gsap.core.Tween[] = [];

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    shader: GPUShaderModule,
    texture: GPUTexture,
    sampler: GPUSampler,
    props: PlaneProps
  ) {
    this.device = device;
    this.format = format;
    this.shader = shader;
    this.texture = texture;
    this.sampler = sampler;
    this.props = props;
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  init(): void {
    const { planeVertexBuffer, planeIndexBuffer } = createPlaneGeometry(
      this.device
    );
    this.vertexBuffer = planeVertexBuffer;
    this.indexBuffer = planeIndexBuffer;

    this.pipeline = createSinglePlanePipeline(
      this.device,
      this.format,
      this.shader
    );

    // Transform buffer: 3 matrices (model, view, proj) + color + useTexture flag
    this.transformBuffer = this.device.createBuffer({
      size: (3 * 16 + 4 + 4) * 4, // 3 mat4x4 + vec4 + vec4 (padded)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.transformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.texture.createView() },
      ],
    });

    this.updateCameraTransform();
  }

  updateCameraTransform(): void {
    const {
      posX,
      posY,
      posZ,
      rotX,
      rotY,
      rotZ,
      scaleX,
      scaleY,
      scaleZ,
      color,
      useTexture,
    } = this.props;

    const scale = makeScaleMatrix(scaleX, scaleY, scaleZ);
    const rotation = makeRotationMatrix(rotX, rotY, rotZ);
    const translation = makeTranslationMatrix(posX, posY, posZ);
    const model = multiplyMatrices(
      translation,
      multiplyMatrices(rotation, scale)
    );

    const view = this.camera.getViewMatrix();
    const proj = this.camera.getProjectionMatrix();

    const data = new Float32Array(3 * 16 + 4 + 4);
    data.set(model, 0); // model matrix
    data.set(view, 16); // view matrix
    data.set(proj, 32); // projection matrix
    data.set(color, 48); // color
    data.set([useTexture ? 1 : 0, 0, 0, 0], 52); // useTexture flag + padding

    this.device.queue.writeBuffer(this.transformBuffer, 0, data);
  }

  render(pass: GPURenderPassEncoder): void {
    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, "uint16");
    pass.setBindGroup(0, this.bindGroup);
    pass.drawIndexed(6); // 6 indices for a quad
  }

  addTween(tween: gsap.core.Tween) {
    this.tweens.push(tween);
  }

  destroy(): void {
    this.vertexBuffer?.destroy();
    this.indexBuffer?.destroy();
    this.transformBuffer?.destroy();

    // Help GC
    this.bindGroup = null as any;
    this.pipeline = null as any;
    this.shader = null as any;
    this.camera = null as any;
    (this.props as any) = null;

    this.tweens.forEach((tween) => tween.kill());
    this.tweens = [];
  }

  run(time: number): void {}

  updateProps(callback: (props: PlaneProps) => void): void {
    callback(this.props);
    this.updateCameraTransform();
  }

  getProps(): PlaneProps {
    return this.props;
  }
}
