import { PixelGrid, PixelGridProps } from "./pixel-grid";
import { Camera } from "@/gpulab/core/camera";
import { Scene } from "@/gpulab/core/scene";

export interface PixelGridInstanceData {
  props: PixelGridProps;
  imagePath: string;
}

//* High-level wrapper for creating and managing multiple PixelGrids
export class PixelGridLayout {
  private readonly grids: PixelGrid[] = [];

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    camera: Camera,
    scene: Scene,
    instances: Array<{
      shader: GPUShaderModule;
      props: PixelGridProps;
    }>
  ) {
    instances.forEach(async (instance) => {
      const grid = new PixelGrid(
        device,
        format,
        instance.shader,
        instance.props
      );

      grid.setCamera(camera);
      scene.add(grid);

      this.grids.push(grid);
    });
  }

  //* Get all grid instances for external manipulation
  getGrids(): PixelGrid[] {
    return this.grids;
  }

  //* Get a specific grid by index
  getGrid(index: number): PixelGrid | undefined {
    return this.grids[index];
  }

  //* Get the number of grid instances
  get gridCount(): number {
    return this.grids.length;
  }

  //* Update camera transform for all grids
  updateCameraTransform(): void {
    this.grids.forEach((grid) => grid.updateCameraTransform());
  }

  //* Run time updates for all grids
  run(time: number): void {
    this.grids.forEach((grid) => grid.run(time));
  }

  //* Render all grids
  render(pass: GPURenderPassEncoder): void {
    this.grids.forEach((grid) => grid.render(pass));
  }
}
