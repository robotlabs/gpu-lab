import { sampleCount } from "../../core/config";

interface SphereBuffers {
  sphereVertexBuffer: GPUBuffer;
  sphereIndexBuffer: GPUBuffer;
  sphereWireframeIndexBuffer: GPUBuffer;
  indexCount: number;
  wireframeIndexCount: number;
}

// Generate sphere geometry using UV sphere method
function generateSphere(
  radius: number = 1,
  widthSegments: number = 32,
  heightSegments: number = 16
) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const wireframeIndices: number[] = [];

  let vertexIndex = 0;

  // Helper function to add vertex
  function addVertex(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number
  ) {
    vertices.push(x, y, z, nx, ny, nz);
    return vertexIndex++;
  }

  // Generate vertices
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      // Calculate position
      const px = -radius * Math.cos(theta) * Math.sin(phi);
      const py = radius * Math.cos(phi);
      const pz = radius * Math.sin(theta) * Math.sin(phi);

      // Calculate normal (for sphere, normal = normalized position)
      const length = Math.sqrt(px * px + py * py + pz * pz);
      const nx = px / length;
      const ny = py / length;
      const nz = pz / length;

      addVertex(px, py, pz, nx, ny, nz);
    }
  }

  // Generate indices
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      const c = a + 1;
      const d = b + 1;

      if (y !== 0) {
        // First triangle
        indices.push(a, b, c);
        wireframeIndices.push(a, b, b, c, c, a);
      }

      if (y !== heightSegments - 1) {
        // Second triangle
        indices.push(b, d, c);
        wireframeIndices.push(b, d, d, c, c, b);
      }
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    wireframeIndices: new Uint16Array(wireframeIndices),
  };
}

//* Creates WebGPU buffers for sphere geometry
export function createSphereGeometry(
  device: GPUDevice,
  radius: number = 1,
  widthSegments: number = 32,
  heightSegments: number = 16
): SphereBuffers {
  const { vertices, indices, wireframeIndices } = generateSphere(
    radius,
    widthSegments,
    heightSegments
  );

  const sphereVertexBuffer = device.createBuffer({
    label: "Sphere Vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const sphereIndexBuffer = device.createBuffer({
    label: "Sphere Indices",
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  const sphereWireframeIndexBuffer = device.createBuffer({
    label: "Sphere Wireframe Indices",
    size: wireframeIndices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(sphereVertexBuffer, 0, vertices);
  device.queue.writeBuffer(sphereIndexBuffer, 0, indices);
  device.queue.writeBuffer(sphereWireframeIndexBuffer, 0, wireframeIndices);

  return {
    sphereVertexBuffer,
    sphereIndexBuffer,
    sphereWireframeIndexBuffer,
    indexCount: indices.length,
    wireframeIndexCount: wireframeIndices.length,
  };
}

//* Creates render pipeline for single sphere instances
export function createSingleSpherePipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule,
  wireframe: boolean = false
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: wireframe
      ? "Single Sphere Wireframe Pipeline"
      : "Single Sphere Pipeline",
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
      cullMode: wireframe ? "none" : "back",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
    multisample: { count: sampleCount },
  });
}

//* Creates render pipeline for instanced sphere groups
export function createSphereGroupPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule,
  wireframe: boolean = false
): GPURenderPipeline {
  const bindGroupLayout = device.createBindGroupLayout({
    label: "Sphere Group Bind Group Layout",
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
    label: wireframe
      ? "Sphere Group Wireframe Pipeline"
      : "Sphere Group Pipeline",
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
      entryPoint: wireframe ? "fs_wireframe" : "fs_main",
      targets: [{ format }],
    },
    primitive: {
      topology: wireframe ? "line-list" : "triangle-list",
      cullMode: wireframe ? "none" : "back",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
    multisample: { count: sampleCount },
  });
}
