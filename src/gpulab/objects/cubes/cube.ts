import { Object3D } from "../../core/types";
import gsap from "gsap";
import {
  makeRotationMatrix,
  makeScaleMatrix,
  makeTranslationMatrix,
  multiplyMatrices,
} from "../../core/matrix";
import { Camera } from "../../core/camera";
import { CubeProps } from "./cube-types";
import { createCubeGeometry, createSingleCubePipeline } from "./cube-utils";

export class Cube implements Object3D {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private props: CubeProps;
  private shader: GPUShaderModule;

  private vertexBuffer!: GPUBuffer;
  private indexBuffer!: GPUBuffer;
  private transformBuffer!: GPUBuffer;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;

  private camera!: Camera;

  private tweens: gsap.core.Tween[] = [];

  constructor(device: GPUDevice, format: GPUTextureFormat, props: CubeProps) {
    this.device = device;
    this.format = format;
    this.props = props;
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  init(): void {
    const { cubeVertexBuffer, cubeIndexBuffer } = createCubeGeometry(
      this.device
    );
    this.vertexBuffer = cubeVertexBuffer;
    this.indexBuffer = cubeIndexBuffer;

    this.pipeline = createSingleCubePipeline(
      this.device,
      this.format,
      this.props.shader
    );
    this.transformBuffer = this.device.createBuffer({
      size: (4 * 16 + 4) * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.transformBuffer } }],
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
      cubeColor,
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

    const data = new Float32Array(4 * 16 + 4);
    data.set(model, 0);
    data.set(view, 32);
    data.set(proj, 48);
    data.set(cubeColor, 64);

    this.device.queue.writeBuffer(this.transformBuffer, 0, data);
  }

  render(pass: GPURenderPassEncoder): void {
    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, "uint16");
    pass.setBindGroup(0, this.bindGroup);
    pass.drawIndexed(36);
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

  updateProps(callback: (props: CubeProps) => void): void {
    callback(this.props);
    this.updateCameraTransform();
  }

  getProps(): CubeProps {
    return this.props;
  }
}
