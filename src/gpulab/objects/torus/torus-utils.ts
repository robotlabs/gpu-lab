// torus-utils.ts
import { sampleCount } from "../../core/config";

interface TorusBuffers {
  torusVertexBuffer: GPUBuffer;
  torusIndexBuffer: GPUBuffer;
  torusWireframeIndexBuffer: GPUBuffer;
}

// Generate torus geometry
function generateTorus(
  majorRadius = 1.0,
  minorRadius = 0.4,
  majorSegments = 32,
  minorSegments = 16
) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const wireframeIndices: number[] = [];

  // Generate vertices
  for (let i = 0; i <= majorSegments; i++) {
    const u = (i / majorSegments) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let j = 0; j <= minorSegments; j++) {
      const v = (j / minorSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      // Position
      const x = (majorRadius + minorRadius * cosV) * cosU;
      const y = minorRadius * sinV;
      const z = (majorRadius + minorRadius * cosV) * sinU;

      // Correct normal calculation for torus
      // The normal at any point on a torus surface points outward
      // from the minor circle's center in the direction of that point
      const nx = cosV * cosU;
      const ny = sinV;
      const nz = cosV * sinU;

      vertices.push(x, y, z, nx, ny, nz);
    }
  }

  // Generate indices
  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const a = i * (minorSegments + 1) + j;
      const b = (i + 1) * (minorSegments + 1) + j;
      const c = (i + 1) * (minorSegments + 1) + (j + 1);
      const d = i * (minorSegments + 1) + (j + 1);

      // First triangle
      indices.push(a, b, d);
      wireframeIndices.push(a, b, b, d, d, a);

      // Second triangle
      indices.push(b, c, d);
      wireframeIndices.push(b, c, c, d, d, b);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    wireframeIndices: new Uint16Array(wireframeIndices),
  };
}

// Creates WebGPU buffers for torus geometry
export function createTorusGeometry(
  device: GPUDevice,
  majorRadius = 1.0,
  minorRadius = 0.4,
  majorSegments = 32,
  minorSegments = 16
): TorusBuffers {
  const { vertices, indices, wireframeIndices } = generateTorus(
    majorRadius,
    minorRadius,
    majorSegments,
    minorSegments
  );

  const torusVertexBuffer = device.createBuffer({
    label: "Torus Vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const torusIndexBuffer = device.createBuffer({
    label: "Torus Indices",
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  const torusWireframeIndexBuffer = device.createBuffer({
    label: "Torus Wireframe Indices",
    size: wireframeIndices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(torusVertexBuffer, 0, vertices);
  device.queue.writeBuffer(torusIndexBuffer, 0, indices);
  device.queue.writeBuffer(torusWireframeIndexBuffer, 0, wireframeIndices);

  return { torusVertexBuffer, torusIndexBuffer, torusWireframeIndexBuffer };
}

// Creates render pipeline for single torus instances
export function createSingleTorusPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule,
  wireframe: boolean = false
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: wireframe
      ? "Single Torus Wireframe Pipeline"
      : "Single Torus Pipeline",
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
      entryPoint: wireframe ? "fs_wireframe" : "fs_main",
      targets: [{ format }],
    },
    primitive: {
      topology: wireframe ? "line-list" : "triangle-list",
      cullMode: "none",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
    multisample: { count: sampleCount },
  });
}
