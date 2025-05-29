import { sampleCount } from "../../core/config";

//* Grid geometry data (simple quad for instanced rendering)
const GRID_VERTICES = new Float32Array([
  //* Triangle 1 (bottom-left)
  -1, -1, 1, -1, 1, 1,

  //* Triangle 2 (top-right)
  -1, -1, 1, 1, -1, 1,
]);

interface GridBuffers {
  gridVertexBuffer: GPUBuffer;
  vertexData: Float32Array;
}

//** Creates WebGPU buffers for grid geometry
export function createGridGeometry(device: GPUDevice): GridBuffers {
  const gridVertexBuffer = device.createBuffer({
    label: "Grid Vertices",
    size: GRID_VERTICES.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(gridVertexBuffer, 0, GRID_VERTICES);

  return {
    gridVertexBuffer,
    vertexData: GRID_VERTICES,
  };
}

//** Creates render pipeline for pixel grids
export function createPixelGridPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule
): GPURenderPipeline {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "Pixel Grid Bind Group Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 5,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  return device.createRenderPipeline({
    label: "Pixel Grid Pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: 8,
          attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "always",
    },
    multisample: { count: sampleCount },
  });
}

//** Process image into pixel grid data
export async function processImageToPixelData(
  imagePath: string,
  gridSize: number
): Promise<Uint32Array> {
  const response = await fetch(imagePath);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(gridSize, gridSize);
  const ctx = canvas.getContext("2d")!;

  //* Draw and scale image to grid size
  ctx.drawImage(imageBitmap, 0, 0, gridSize, gridSize);

  const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
  const pixelData = new Uint32Array(gridSize * gridSize);

  //* Convert to binary based on brightness threshold
  for (let i = 0; i < pixelData.length; i++) {
    const pixelIndex = i * 4;
    const r = imageData.data[pixelIndex];
    const g = imageData.data[pixelIndex + 1];
    const b = imageData.data[pixelIndex + 2];
    const brightness = (r + g + b) / 3;

    //* Threshold for black/white conversion
    pixelData[i] = brightness > 128 ? 1 : 0;
  }

  return pixelData;
}

//** Utility to remove random element from array (for animation)
export function removeRandomElement<T>(array: T[]): T {
  if (array.length === 0) return array[0];

  const randomIndex = Math.floor(Math.random() * array.length);
  return array.splice(randomIndex, 1)[0];
}
