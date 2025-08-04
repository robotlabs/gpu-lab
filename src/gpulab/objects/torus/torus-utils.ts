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
  minorRadius = 0.3, // Make sure minorRadius < majorRadius to avoid self-intersection
  majorSegments = 64, // Increase tessellation for smoother curves
  minorSegments = 32
) {
  // Ensure we don't create self-intersecting torus
  if (minorRadius >= majorRadius) {
    console.warn(
      `Warning: minorRadius (${minorRadius}) should be < majorRadius (${majorRadius}) to avoid self-intersection`
    );
    minorRadius = majorRadius * 0.4; // Safe ratio
  }

  const vertices: number[] = [];
  const indices: number[] = [];
  const wireframeIndices: number[] = [];

  // Generate vertices with better parameterization
  for (let i = 0; i <= majorSegments; i++) {
    const u = (i / majorSegments) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let j = 0; j <= minorSegments; j++) {
      const v = (j / minorSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      // Calculate position - this is the standard torus equation
      const x = (majorRadius + minorRadius * cosV) * cosU;
      const y = minorRadius * sinV;
      const z = (majorRadius + minorRadius * cosV) * sinU;

      // Calculate proper normals
      const centerX = majorRadius * cosU;
      const centerZ = majorRadius * sinU;

      // Normal points from the center of the tube outward
      const normalX = cosV * cosU;
      const normalY = sinV;
      const normalZ = cosV * sinU;

      vertices.push(x, y, z, normalX, normalY, normalZ);
    }
  }

  // Generate indices with proper winding order
  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const a = i * (minorSegments + 1) + j;
      const b = (i + 1) * (minorSegments + 1) + j;
      const c = (i + 1) * (minorSegments + 1) + (j + 1);
      const d = i * (minorSegments + 1) + (j + 1);

      // Ensure consistent winding order (counter-clockwise)
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

export function createSolidTorusPipelineWithOffset(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule,
  polygonOffset: number = 0
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "Single Torus Solid Pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 6 * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" },
            { shaderLocation: 1, offset: 12, format: "float32x3" },
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
      // Depth bias works with triangle-list
      depthBias: Math.floor(polygonOffset * 1000),
      depthBiasSlopeScale: 1.0,
      depthBiasClamp: 0.01,
    },
    multisample: { count: sampleCount },
  });
}

export function createWireframeTorusPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: "Single Torus Wireframe Pipeline",
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 6 * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" },
            { shaderLocation: 1, offset: 12, format: "float32x3" },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_wireframe",
      targets: [{ format }],
    },
    primitive: {
      topology: "line-list",
      cullMode: "none",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
      // NO depth bias for line-list topology
    },
    multisample: { count: sampleCount },
  });
}
