import { sampleCount } from "../../core/config";

interface CubeBuffers {
  cubeVertexBuffer: GPUBuffer;
  cubeIndexBuffer: GPUBuffer;
  cubeWireframeIndexBuffer: GPUBuffer;
}

// Generate subdivided cube geometry
function generateSubdividedCube(subdivisions = 8) {
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

  // Generate each face with subdivisions
  const faces = [
    // Front face (z = 1)
    { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], offset: [0, 0, 1] },
    // Back face (z = -1)
    { normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], offset: [0, 0, -1] },
    // Top face (y = 1)
    { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], offset: [0, 1, 0] },
    // Bottom face (y = -1)
    { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], offset: [0, -1, 0] },
    // Right face (x = 1)
    { normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], offset: [1, 0, 0] },
    // Left face (x = -1)
    { normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], offset: [-1, 0, 0] },
  ];

  faces.forEach((face) => {
    const faceStartIndex = vertexIndex;

    // Generate grid of vertices for this face
    for (let i = 0; i <= subdivisions; i++) {
      for (let j = 0; j <= subdivisions; j++) {
        const u = (i / subdivisions) * 2 - 1; // -1 to 1
        const v = (j / subdivisions) * 2 - 1; // -1 to 1

        const x = face.offset[0] + face.u[0] * u + face.v[0] * v;
        const y = face.offset[1] + face.u[1] * u + face.v[1] * v;
        const z = face.offset[2] + face.u[2] * u + face.v[2] * v;

        addVertex(x, y, z, face.normal[0], face.normal[1], face.normal[2]);
      }
    }

    // Generate triangles for this face
    for (let i = 0; i < subdivisions; i++) {
      for (let j = 0; j < subdivisions; j++) {
        const a = faceStartIndex + i * (subdivisions + 1) + j;
        const b = faceStartIndex + (i + 1) * (subdivisions + 1) + j;
        const c = faceStartIndex + (i + 1) * (subdivisions + 1) + (j + 1);
        const d = faceStartIndex + i * (subdivisions + 1) + (j + 1);

        // First triangle
        indices.push(a, b, c);
        wireframeIndices.push(a, b, b, c, c, a);

        // Second triangle
        indices.push(c, d, a);
        wireframeIndices.push(c, d, d, a, a, c);
      }
    }
  });

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    wireframeIndices: new Uint16Array(wireframeIndices),
  };
}

//* Creates WebGPU buffers for cube geometry
export function createCubeGeometry(
  device: GPUDevice,
  subdivisions = 8
): CubeBuffers {
  const { vertices, indices, wireframeIndices } =
    generateSubdividedCube(subdivisions);

  const cubeVertexBuffer = device.createBuffer({
    label: "Cube Vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const cubeIndexBuffer = device.createBuffer({
    label: "Cube Indices",
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  const cubeWireframeIndexBuffer = device.createBuffer({
    label: "Cube Wireframe Indices",
    size: wireframeIndices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(cubeVertexBuffer, 0, vertices);
  device.queue.writeBuffer(cubeIndexBuffer, 0, indices);
  device.queue.writeBuffer(cubeWireframeIndexBuffer, 0, wireframeIndices);

  return { cubeVertexBuffer, cubeIndexBuffer, cubeWireframeIndexBuffer };
}

//* Creates render pipeline for single cube instances
export function createSingleCubePipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule,
  wireframe: boolean = false
): GPURenderPipeline {
  return device.createRenderPipeline({
    label: wireframe
      ? "Single Cube Wireframe Pipeline"
      : "Single Cube Pipeline",
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

//* Creates render pipeline for instanced cube groups
export function createCubeGroupPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule,
  wireframe: boolean = false
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
    label: wireframe ? "Cube Group Wireframe Pipeline" : "Cube Group Pipeline",
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
