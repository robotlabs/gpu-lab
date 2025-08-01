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
  private wireframeIndexBuffer!: GPUBuffer;
  private transformBuffer!: GPUBuffer;
  private pipeline!: GPURenderPipeline;
  private wireframePipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private wireframeBindGroup!: GPUBindGroup;

  private camera!: Camera;

  private subdivisions: number = 8;
  private totalIndices: number = 0;
  private totalWireframeIndices: number = 0;

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
    const { cubeVertexBuffer, cubeIndexBuffer, cubeWireframeIndexBuffer } =
      createCubeGeometry(this.device, this.subdivisions);

    this.vertexBuffer = cubeVertexBuffer;
    this.indexBuffer = cubeIndexBuffer;
    this.wireframeIndexBuffer = cubeWireframeIndexBuffer;

    // Calculate total indices
    this.totalIndices = this.subdivisions * this.subdivisions * 6 * 6; // 6 faces, subdivisions^2 quads per face, 6 indices per quad
    this.totalWireframeIndices = this.subdivisions * this.subdivisions * 6 * 12; // 12 wireframe indices per quad

    // Create both solid and wireframe pipelines
    this.pipeline = createSingleCubePipeline(
      this.device,
      this.format,
      this.props.shader,
      false // solid
    );

    this.wireframePipeline = createSingleCubePipeline(
      this.device,
      this.format,
      this.props.shader,
      true // wireframe
    );

    this.transformBuffer = this.device.createBuffer({
      size: (4 * 16 + 4 + 4 + 4) * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.transformBuffer } }],
    });

    this.wireframeBindGroup = this.device.createBindGroup({
      layout: this.wireframePipeline.getBindGroupLayout(0),
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
      params = [],
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

    // Calculate buffer layout (same as Plane class logic)
    const MAT_SIZE = 16; // floats per mat4x4
    const COLOR_SIZE = 4; // vec4
    const PARAM_SLOTS = params.length; // number of vec4 slots
    const PARAM_SIZE = 4; // floats per vec4
    const FLOAT_COUNT =
      MAT_SIZE * 4 + // modelCube, modelGrid, view, proj (4 matrices)
      COLOR_SIZE + // cubeColor
      PARAM_SLOTS * PARAM_SIZE;

    // Offsets (in floats)
    const OFF_MODEL_CUBE = 0;
    const OFF_MODEL_GRID = OFF_MODEL_CUBE + MAT_SIZE;
    const OFF_VIEW = OFF_MODEL_GRID + MAT_SIZE;
    const OFF_PROJ = OFF_VIEW + MAT_SIZE;
    const OFF_COLOR = OFF_PROJ + MAT_SIZE;
    const OFF_PARAMS = OFF_COLOR + COLOR_SIZE;

    const data = new Float32Array(FLOAT_COUNT);
    data.set(model, OFF_MODEL_CUBE);
    data.set(model, OFF_MODEL_GRID); // Using same model matrix for both
    data.set(view, OFF_VIEW);
    data.set(proj, OFF_PROJ);
    data.set(cubeColor, OFF_COLOR);

    // Write each params[i] at the correct offset
    for (let i = 0; i < PARAM_SLOTS; i++) {
      data.set(params[i], OFF_PARAMS + i * PARAM_SIZE);
    }

    this.device.queue.writeBuffer(this.transformBuffer, 0, data);
  }

  render(pass: GPURenderPassEncoder): void {
    const isWireframe = (this.props as any).wireframe || false;

    if (isWireframe) {
      pass.setPipeline(this.wireframePipeline);
      pass.setVertexBuffer(0, this.vertexBuffer);
      pass.setIndexBuffer(this.wireframeIndexBuffer, "uint16");
      pass.setBindGroup(0, this.wireframeBindGroup);
      pass.drawIndexed(this.totalWireframeIndices);
    } else {
      pass.setPipeline(this.pipeline);
      pass.setVertexBuffer(0, this.vertexBuffer);
      pass.setIndexBuffer(this.indexBuffer, "uint16");
      pass.setBindGroup(0, this.bindGroup);
      pass.drawIndexed(this.totalIndices);
    }
  }

  addTween(tween: gsap.core.Tween) {
    this.tweens.push(tween);
  }

  destroy(): void {
    this.vertexBuffer?.destroy();
    this.indexBuffer?.destroy();
    this.wireframeIndexBuffer?.destroy();
    this.transformBuffer?.destroy();

    // Help GC
    this.bindGroup = null as any;
    this.wireframeBindGroup = null as any;
    this.pipeline = null as any;
    this.wireframePipeline = null as any;
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
