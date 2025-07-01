import { sampleCount } from "@/gpulab/core/config";
import {
  makeIdentityMatrix,
  makeScaleMatrix,
  makeTranslationMatrix,
  multiplyMatrices,
} from "@/gpulab/core/matrix";
import { MeshData } from "@/gpulab/core/types";
import { Document, NodeIO } from "@gltf-transform/core";

export function getNodeTransform(node: any): Float32Array {
  const translation = node.getTranslation() || [0, 0, 0];
  const rotation = node.getRotation() || [0, 0, 0, 1];
  const scale = node.getScale() || [1, 1, 1];

  //* Check if node has a pre-computed matrix
  const matrix = node.getMatrix();
  if (matrix && !isIdentityMatrix(matrix)) {
    return new Float32Array(matrix);
  }

  const T = makeTranslationMatrix(
    translation[0],
    translation[1],
    translation[2]
  );
  const S = makeScaleMatrix(scale[0], scale[1], scale[2]);

  //* Convert quaternion to rotation matrix
  //* Note: glTF uses [x, y, z, w] format
  const [x, y, z, w] = rotation;
  const R = new Float32Array(16);

  const length = Math.sqrt(x * x + y * y + z * z + w * w);
  const nx = x / length,
    ny = y / length,
    nz = z / length,
    nw = w / length;

  const xx = nx * nx,
    yy = ny * ny,
    zz = nz * nz;
  const xy = nx * ny,
    xz = nx * nz,
    yz = ny * nz;
  const wx = nw * nx,
    wy = nw * ny,
    wz = nw * nz;

  //* Column-major matrix for WebGPU
  R[0] = 1 - 2 * (yy + zz);
  R[1] = 2 * (xy + wz);
  R[2] = 2 * (xz - wy);
  R[3] = 0;
  R[4] = 2 * (xy - wz);
  R[5] = 1 - 2 * (xx + zz);
  R[6] = 2 * (yz + wx);
  R[7] = 0;
  R[8] = 2 * (xz + wy);
  R[9] = 2 * (yz - wx);
  R[10] = 1 - 2 * (xx + yy);
  R[11] = 0;
  R[12] = 0;
  R[13] = 0;
  R[14] = 0;
  R[15] = 1;

  const result = multiplyMatrices(T, multiplyMatrices(R, S));
  return result;
}
function isIdentityMatrix(matrix: number[]): boolean {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return matrix.every((val, i) => Math.abs(val - identity[i]) < 0.0001);
}

export async function createTextureFromGLTFTexture(
  gltfTexture: any,
  defaultTexture: GPUTexture,
  textureCache: Map<string, GPUTexture>,
  device: GPUDevice
): Promise<GPUTexture> {
  try {
    const image = gltfTexture.getImage ? gltfTexture.getImage() : null;
    if (!image) {
      console.warn("No image found in texture");
      return defaultTexture;
    }

    //* GLB could get different approaches, so try different methods to get image data
    let imageData: ArrayBuffer | Uint8Array | null = null;

    if (typeof image.getImage === "function") {
      imageData = image.getImage();
    } else if (typeof image.getArray === "function") {
      imageData = image.getArray();
    } else if (image.buffer) {
      imageData = image.buffer;
    } else if (image.data) {
      imageData = image.data;
    }

    if (!imageData) {
      console.warn("No image data available");
      return defaultTexture;
    }

    let cacheKey: string;
    if (imageData instanceof ArrayBuffer) {
      const view = new Uint8Array(
        imageData,
        0,
        Math.min(16, imageData.byteLength)
      );
      cacheKey = `texture_${imageData.byteLength}_${Array.from(view).join(
        "_"
      )}`;
    } else if (imageData instanceof Uint8Array) {
      const view = imageData.slice(0, Math.min(16, imageData.length));
      cacheKey = `texture_${imageData.length}_${Array.from(view).join("_")}`;
    } else {
      cacheKey = `texture_${Date.now()}_${Math.random()}`;
    }

    if (textureCache.has(cacheKey)) {
      return textureCache.get(cacheKey)!;
    }

    let uint8Data: Uint8Array;
    if (imageData instanceof ArrayBuffer) {
      uint8Data = new Uint8Array(imageData);
    } else if (imageData instanceof Uint8Array) {
      uint8Data = imageData;
    } else {
      console.warn("Unknown image data format:", typeof imageData);
      return defaultTexture;
    }

    const blob = new Blob([uint8Data], { type: "image/png" }); // Try PNG first
    const imageUrl = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = "anonymous";

    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);
          const imagePixelData = ctx.getImageData(0, 0, img.width, img.height);

          const texture = device.createTexture({
            size: [img.width, img.height, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
          });

          device.queue.writeTexture(
            { texture },
            imagePixelData.data,
            { bytesPerRow: img.width * 4 },
            { width: img.width, height: img.height }
          );

          textureCache.set(cacheKey, texture);

          URL.revokeObjectURL(imageUrl);

          resolve(texture);
        } catch (error) {
          console.error(`Failed to process texture ${cacheKey}:`, error);
          URL.revokeObjectURL(imageUrl);
          resolve(defaultTexture);
        }
      };

      img.onerror = () => {
        console.error(`Failed to load texture image: ${cacheKey}`);
        URL.revokeObjectURL(imageUrl);
        resolve(defaultTexture);
      };

      img.src = imageUrl;
    });
  } catch (error) {
    console.error(`Error in createTextureFromGLTFTexture:`, error);
    return defaultTexture;
  }
}

export async function traverseNodes(
  node: any,
  meshes: MeshData[],
  defaultTexture: GPUTexture,
  textureCache: Map<string, GPUTexture>,
  device: GPUDevice,
  parentTransform: Float32Array = makeIdentityMatrix()
): Promise<void> {
  const localTransform = getNodeTransform(node);
  const worldTransform = multiplyMatrices(parentTransform, localTransform);

  const mesh = node.getMesh();
  if (mesh) {
    for (let i = 0; i < mesh.listPrimitives().length; i++) {
      const primitive = mesh.listPrimitives()[i];
      const meshData = await processPrimitive(
        primitive,
        worldTransform,
        `${mesh.getName() || "unnamed"}_${i}`,
        defaultTexture,
        textureCache,
        device
      );
      if (meshData) {
        meshes.push(meshData);
      }
    }
  }

  //* Recursively process child nodes. important, as nodes could be different level of children
  for (const child of node.listChildren()) {
    await traverseNodes(
      child,
      meshes,
      defaultTexture,
      textureCache,
      device,
      worldTransform
    );
  }
}
export async function processPrimitive(
  primitive: any,
  nodeTransform: Float32Array,
  meshName: string = "unknown",
  defaultTexture: GPUTexture,
  textureCache: Map<string, GPUTexture>,
  device: GPUDevice
): Promise<MeshData | null> {
  const position = primitive
    .getAttribute("POSITION")
    ?.getArray() as Float32Array;
  const normal =
    primitive.getAttribute("NORMAL")?.getArray() ??
    new Float32Array((position.length / 3) * 3).fill(0);
  const uv =
    primitive.getAttribute("TEXCOORD_0")?.getArray() ??
    new Float32Array((position.length / 3) * 2).fill(0);

  let color: Float32Array;
  const colorAttr = primitive.getAttribute("COLOR_0");
  const vertexCount = position.length / 3;
  if (colorAttr) {
    const cArr = colorAttr.getArray() as Float32Array;
    const comps = cArr.length / vertexCount;
    color = new Float32Array(vertexCount * 4);
    if (comps === 3) {
      for (let i = 0; i < vertexCount; i++) {
        color.set([cArr[i * 3], cArr[i * 3 + 1], cArr[i * 3 + 2], 1], i * 4);
      }
    } else if (comps === 4) {
      color.set(cArr);
    } else {
      color.fill(1);
    }
  } else {
    color = new Float32Array(vertexCount * 4).fill(1);
  }

  const material = primitive.getMaterial();
  let materialData: MeshData["material"] = {
    baseColor: [1, 1, 1, 1],
    texture: defaultTexture,
  };
  if (material) {
    const bcf = material.getBaseColorFactor();
    if (bcf?.length >= 4)
      materialData.baseColor = [bcf[0], bcf[1], bcf[2], bcf[3]];
    const tex = material.getBaseColorTexture();
    if (tex) {
      try {
        materialData.texture = await createTextureFromGLTFTexture(
          tex,
          defaultTexture,
          textureCache,
          device
        );
      } catch {
        materialData.texture = defaultTexture;
      }
    }
  }

  //*  ---------------------------------------------------
  //* upcast 16 to 32 bit
  let indices = primitive.getIndices()?.getArray() as
    | Uint16Array
    | Uint32Array
    | undefined;
  if (!indices) {
    console.warn(`Skipping primitive for mesh "${meshName}" without indices`);
    return null;
  }
  if (indices instanceof Uint16Array) {
    //* up-cast a 32 bit
    indices = new Uint32Array(indices);
  }
  const vertexData = new Float32Array(vertexCount * 12);
  for (let i = 0; i < vertexCount; i++) {
    const o = i * 12;
    vertexData[o] = position[i * 3];
    vertexData[o + 1] = position[i * 3 + 1];
    vertexData[o + 2] = position[i * 3 + 2];
    vertexData[o + 3] = normal[i * 3];
    vertexData[o + 4] = normal[i * 3 + 1];
    vertexData[o + 5] = normal[i * 3 + 2];
    vertexData[o + 6] = uv[i * 2];
    vertexData[o + 7] = uv[i * 2 + 1];
    vertexData[o + 8] = color[i * 4];
    vertexData[o + 9] = color[i * 4 + 1];
    vertexData[o + 10] = color[i * 4 + 2];
    vertexData[o + 11] = color[i * 4 + 3];
  }
  const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  // e il buffer degli indici (ora sempre allineato a 4 byte)
  const indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indices);

  // buffer di trasformazione uniforme
  const transformBuffer = device.createBuffer({
    size: 64 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: indices.length,
    indexFormat: "uint32",
    transform: nodeTransform,
    transformBuffer,
    bindGroup: null as any,
    material: materialData,
  };
}

export function createPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shader: GPUShaderModule
) {
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shader,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 3 * 4 + 3 * 4 + 2 * 4 + 4 * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" }, // position
            { shaderLocation: 1, offset: 12, format: "float32x3" }, // normal
            { shaderLocation: 2, offset: 24, format: "float32x2" }, // uv
            { shaderLocation: 3, offset: 32, format: "float32x4" }, // color
          ],
        },
      ],
    },
    fragment: {
      module: shader,
      entryPoint: "fs_main",
      targets: [{ format: format }],
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
    multisample: {
      count: sampleCount,
    },
  });
  return pipeline;
}
export function createMeshesBindGroup(
  device: GPUDevice,
  pipeline: GPURenderPipeline,
  defaultSampler: GPUSampler,
  defaultTexture: GPUTexture,
  meshes: MeshData[]
) {
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    if (!mesh.transformBuffer) {
      throw new Error(`Mesh ${i} has no transform buffer`);
    }

    mesh.bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: mesh.transformBuffer } },
        { binding: 1, resource: defaultSampler },
        {
          binding: 2,
          resource: (mesh.material?.texture || defaultTexture).createView(),
        },
      ],
    });
  }
}

export async function load3DModel(url: string) {
  const io = new NodeIO();
  let doc: Document;

  if (url.toLowerCase().endsWith(".glb")) {
    const arrayBuffer = await fetch(url).then((res) => res.arrayBuffer());
    doc = await io.readBinary(new Uint8Array(arrayBuffer));
  } else if (url.toLowerCase().endsWith(".gltf")) {
    const response = await fetch(url);
    const gltfJson = await response.json();
    doc = await io.readJSON(gltfJson);
  } else {
    throw new Error("Unsupported file format. Use .glb or .gltf files.");
  }
  return doc;
}
