import { sampleCount } from "../../core/config";

//* Cube geometry data
const CUBE_VERTICES = new Float32Array([
  //* Position        Normal
  //* Front face
  -1, -1, 1, 0, 0, 1, 1, -1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, -1, 1, 1, 0, 0, 1,

  //* Back face
  -1, -1, -1, 0, 0, -1, -1, 1, -1, 0, 0, -1, 1, 1, -1, 0, 0, -1, 1, -1, -1, 0,
  0, -1,

  //* Top face
  -1, 1, -1, 0, 1, 0, -1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, -1, 0, 1, 0,

  //* Bottom face
  -1, -1, -1, 0, -1, 0, 1, -1, -1, 0, -1, 0, 1, -1, 1, 0, -1, 0, -1, -1, 1, 0,
  -1, 0,

  //* Right face
  1, -1, -1, 1, 0, 0, 1, 1, -1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, -1, 1, 1, 0, 0,

  //* Left face
  -1, -1, -1, -1, 0, 0, -1, -1, 1, -1, 0, 0, -1, 1, 1, -1, 0, 0, -1, 1, -1, -1,
  0, 0,
]);

const CUBE_INDICES = new Uint16Array([
  0,
  1,
  2,
  2,
  3,
  0, //* Front
  4,
  5,
  6,
  6,
  7,
  4, //* Back
  8,
  9,
  10,
  10,
  11,
  8, //* Top
  12,
  13,
  14,
  14,
  15,
  12, //* Bottom
  16,
  17,
  18,
  18,
  19,
  16, //* Right
  20,
  21,
  22,
  22,
  23,
  20, //* Left
]);

interface CubeBuffers {
  cubeVertexBuffer: GPUBuffer;
  cubeIndexBuffer: GPUBuffer;
}

//* Creates WebGPU buffers for cube geometry
export function createCubeGeometry(device: GPUDevice): CubeBuffers {
  const cubeVertexBuffer = device.createBuffer({
    label: "Cube Vertices",
    size: CUBE_VERTICES.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const cubeIndexBuffer = device.createBuffer({
    label: "Cube Indices",
    size: CUBE_INDICES.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(cubeVertexBuffer, 0, CUBE_VERTICES);
  device.queue.writeBuffer(cubeIndexBuffer, 0, CUBE_INDICES);

  return { cubeVertexBuffer, cubeIndexBuffer };
}

//* Creates render pipeline for single cube instances
export function createSingleCubePipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "Single Cube Pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 6 * 4, // 3 floats position + 3 floats normal
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" }, // position
            { shaderLocation: 1, offset: 12, format: "float32x3" }, // normal
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
    multisample: { count: sampleCount },
  });
}

//* Creates render pipeline for instanced cube groups
export function createCubeGroupPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule
): GPURenderPipeline {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "Cube Group Bind Group Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  return device.createRenderPipeline({
    label: "Cube Group Pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 6 * 4, // 3 floats position + 3 floats normal
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" }, // position
            { shaderLocation: 1, offset: 12, format: "float32x3" }, // normal
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
    multisample: { count: sampleCount },
  });
}
