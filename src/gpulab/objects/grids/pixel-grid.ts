import { Object3D } from "@/gpulab/core/types";
import {
  createGridGeometry,
  createPixelGridPipeline,
  processImageToPixelData,
  removeRandomElement,
} from "./pixel-grid-utils";
import {
  makeRotationMatrix,
  makeTranslationMatrix,
  multiplyMatrices,
} from "@/gpulab/core/matrix";
import { Camera } from "@/gpulab/core/camera";
import gsap from "gsap";

export interface PixelGridProps {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  gridSize: number;
  gridSpace: number;
  gridActiveColor: [number, number, number, number];
}

export class PixelGrid implements Object3D {
  private readonly device: GPUDevice;
  private readonly format: GPUTextureFormat;
  private readonly shader: GPUShaderModule;

  private camera!: Camera;
  private props: PixelGridProps;

  private vertexBuffer!: GPUBuffer;
  private vertexData!: Float32Array;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;

  private gridUniformBuffer!: GPUBuffer;
  private cellStateStorage!: GPUBuffer;
  private transformBuffer!: GPUBuffer;
  private timeUniformBuffer!: GPUBuffer;
  private gridSpaceUniformBuffer!: GPUBuffer;
  private gridActiveColorBuffer!: GPUBuffer;

  private cellStateArrayInit!: Uint32Array;
  private cellStateArrayEnd!: Uint32Array;

  private isDestroyed: boolean = false;

  // Tween management
  private tweens: gsap.core.Tween[] = [];

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    shader: GPUShaderModule,
    props: PixelGridProps
  ) {
    this.device = device;
    this.format = format;
    this.shader = shader;
    this.props = props;
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  async init(): Promise<void> {
    await this.createGeometry();
    await this.createCellStateBuffers();
    this.createUniformBuffers();
    this.createPipeline();
    this.createBindGroup();
    this.updateCameraTransform();
  }

  addTween(tween: gsap.core.Tween): void {
    this.tweens.push(tween);
  }

  updateCameraTransform(): void {
    if (this.isDestroyed || !this.camera || !this.transformBuffer) return;

    const { posX, posY, posZ, rotX, rotY, rotZ } = this.props;

    const rotation = makeRotationMatrix(rotX, rotY, rotZ);
    const translation = makeTranslationMatrix(posX, posY, posZ);
    const model = multiplyMatrices(translation, rotation);

    const view = this.camera.getViewMatrix();
    const proj = this.camera.getProjectionMatrix();

    const transformData = new Float32Array(48); // 3 mat4x4
    transformData.set(model, 0);
    transformData.set(view, 16);
    transformData.set(proj, 32);

    this.device.queue.writeBuffer(this.transformBuffer, 0, transformData);
  }

  updateGridSpace(): void {
    if (this.isDestroyed || !this.gridSpaceUniformBuffer) return;
    const gridSpaceData = new Float32Array([this.props.gridSpace]);
    this.device.queue.writeBuffer(
      this.gridSpaceUniformBuffer,
      0,
      gridSpaceData
    );
  }

  updateGridColor(): void {
    if (this.isDestroyed || !this.gridActiveColorBuffer) return;
    const colorData = new Float32Array(this.props.gridActiveColor);
    this.device.queue.writeBuffer(this.gridActiveColorBuffer, 0, colorData);
  }

  render(pass: GPURenderPassEncoder): void {
    if (this.isDestroyed || !this.vertexData || !this.pipeline) return;
    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(
      this.vertexData.length / 2,
      this.props.gridSize * this.props.gridSize
    );
  }

  destroy(): void {
    if (this.isDestroyed) return; // Prevent double destruction

    this.isDestroyed = true;
    // Kill all stored tweens
    this.tweens.forEach((tween) => {
      if (tween && tween.isActive()) {
        tween.kill();
      }
    });
    this.tweens = [];

    // Kill any remaining tweens targeting this object and its properties
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.props);
    gsap.killTweensOf(this.props.gridActiveColor);

    // Destroy GPU resources
    this.vertexBuffer?.destroy();
    this.gridUniformBuffer?.destroy();
    this.cellStateStorage?.destroy();
    this.transformBuffer?.destroy();
    this.timeUniformBuffer?.destroy();
    this.gridSpaceUniformBuffer?.destroy();
    this.gridActiveColorBuffer?.destroy();

    // Clear arrays
    this.vertexData = new Float32Array();
    this.cellStateArrayInit = new Uint32Array();
    this.cellStateArrayEnd = new Uint32Array();
  }

  run(time: number): void {
    if (!this.timeUniformBuffer) return;
    const timeData = new Float32Array([time]);
    this.device.queue.writeBuffer(this.timeUniformBuffer, 0, timeData);
  }

  getProps(): PixelGridProps {
    return this.props;
  }

  //* Private helper methods
  private async createGeometry(): Promise<void> {
    const { gridVertexBuffer, vertexData } = createGridGeometry(this.device);
    this.vertexBuffer = gridVertexBuffer;
    this.vertexData = vertexData;
  }

  private async createCellStateBuffers(): Promise<void> {
    const totalCells = this.props.gridSize * this.props.gridSize;

    //* Initialize cells array
    this.cellStateArrayInit = new Uint32Array(totalCells).fill(0);
    this.cellStateArrayEnd = new Uint32Array(totalCells).fill(1);

    this.cellStateStorage = this.device.createBuffer({
      label: "Cell State Storage",
      size: this.cellStateArrayInit.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(
      this.cellStateStorage,
      0,
      this.cellStateArrayEnd
    );
  }

  private createUniformBuffers(): void {
    //* Grid dimensions
    const gridUniformArray = new Float32Array([
      this.props.gridSize,
      this.props.gridSize,
    ]);
    this.gridUniformBuffer = this.device.createBuffer({
      label: "Grid Uniforms",
      size: gridUniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.gridUniformBuffer, 0, gridUniformArray);

    //* Transform matrices
    this.transformBuffer = this.device.createBuffer({
      label: "Transform Matrices",
      size: 3 * 16 * 4, // 3 mat4x4<f32>
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    //* Time uniform
    this.timeUniformBuffer = this.device.createBuffer({
      label: "Time Uniform",
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      this.timeUniformBuffer,
      0,
      new Float32Array([0.0])
    );

    //* Grid space uniform
    this.gridSpaceUniformBuffer = this.device.createBuffer({
      label: "Grid Space Uniform",
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      this.gridSpaceUniformBuffer,
      0,
      new Float32Array([this.props.gridSpace])
    );

    //* Grid active color uniform
    this.gridActiveColorBuffer = this.device.createBuffer({
      label: "Grid Active Color Uniform",
      size: 16, // 4 floats * 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      this.gridActiveColorBuffer,
      0,
      new Float32Array(this.props.gridActiveColor)
    );
  }

  private createPipeline(): void {
    this.pipeline = createPixelGridPipeline(
      this.device,
      this.format,
      this.shader
    );
  }

  private createBindGroup(): void {
    this.bindGroup = this.device.createBindGroup({
      label: "Pixel Grid Bind Group",
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.gridUniformBuffer } },
        { binding: 1, resource: { buffer: this.cellStateStorage } },
        { binding: 2, resource: { buffer: this.transformBuffer } },
        { binding: 3, resource: { buffer: this.timeUniformBuffer } },
        { binding: 4, resource: { buffer: this.gridSpaceUniformBuffer } },
        { binding: 5, resource: { buffer: this.gridActiveColorBuffer } },
      ],
    });
  }
}
