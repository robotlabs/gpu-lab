import { sampleCount } from "../../core/config";

//* Plane geometry data (quad with UV coordinates)
const PLANE_VERTICES = new Float32Array([
  //* Position     Normal      UV
  -1,
  -1,
  0,
  0,
  0,
  1,
  0,
  0, //* bottom-left
  1,
  -1,
  0,
  0,
  0,
  1,
  1,
  0, //* bottom-right
  -1,
  1,
  0,
  0,
  0,
  1,
  0,
  1, //* top-left
  1,
  1,
  0,
  0,
  0,
  1,
  1,
  1, //* top-right
]);

const PLANE_INDICES = new Uint16Array([
  0,
  1,
  2, //* first triangle
  2,
  1,
  3, //* second triangle
]);

interface PlaneBuffers {
  planeVertexBuffer: GPUBuffer;
  planeIndexBuffer: GPUBuffer;
}

//* Creates WebGPU buffers for plane geometry
export function createPlaneGeometry(device: GPUDevice): PlaneBuffers {
  const planeVertexBuffer = device.createBuffer({
    label: "Plane Vertices",
    size: PLANE_VERTICES.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const planeIndexBuffer = device.createBuffer({
    label: "Plane Indices",
    size: PLANE_INDICES.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(planeVertexBuffer, 0, PLANE_VERTICES);
  device.queue.writeBuffer(planeIndexBuffer, 0, PLANE_INDICES);

  return { planeVertexBuffer, planeIndexBuffer };
}

//* Creates render pipeline for instanced plane groups with texture support
export function createPlaneGroupPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule
): GPURenderPipeline {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "Plane Group Bind Group Layout",
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
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
      },
    ],
  });

  return device.createRenderPipeline({
    label: "Plane Group Pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 8 * 4, // 3 position + 3 normal + 2 UV
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" }, // position
            { shaderLocation: 1, offset: 12, format: "float32x3" }, // normal
            { shaderLocation: 2, offset: 24, format: "float32x2" }, // UV
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
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
      cullMode: "none", // Planes can be viewed from both sides
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: false,
      depthCompare: "less",
    },
    multisample: { count: sampleCount },
  });
}

//*  Utility function to load texture from image URL
export async function createTextureFromImage(
  device: GPUDevice,
  url: string
): Promise<GPUTexture> {
  const response = await fetch(url);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  const texture = device.createTexture({
    label: `Texture from ${url}`,
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: texture },
    [imageBitmap.width, imageBitmap.height]
  );

  return texture;
}

//* Creates a solid color texture for planes that don't need image textures
export function createSolidColorTexture(
  device: GPUDevice,
  color: [number, number, number, number] = [1, 1, 1, 1]
): GPUTexture {
  const texture = device.createTexture({
    label: "Solid Color Texture",
    size: [1, 1, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  const data = new Uint8Array([
    Math.floor(color[0] * 255),
    Math.floor(color[1] * 255),
    Math.floor(color[2] * 255),
    Math.floor(color[3] * 255),
  ]);

  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: 4 },
    { width: 1, height: 1 }
  );

  return texture;
}

export function createSinglePlanePipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule
): GPURenderPipeline {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "Single Plane Bind Group Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
      },
    ],
  });

  return device.createRenderPipeline({
    label: "Single Plane Pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 8 * 4, // 3 position + 3 normal + 2 UV
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" }, // position
            { shaderLocation: 1, offset: 12, format: "float32x3" }, // normal
            { shaderLocation: 2, offset: 24, format: "float32x2" }, // UV
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
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
      cullMode: "none", // Planes can be viewed from both sides
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: false,
      depthCompare: "less",
    },
    multisample: { count: sampleCount },
  });
}
