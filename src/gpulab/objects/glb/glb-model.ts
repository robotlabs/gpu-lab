// glb-model.ts
import { Document, NodeIO } from "@gltf-transform/core";
import { AABB, MeshData, Object3D } from "../../core/types";
import { Camera } from "../../core/camera";
import { computeAABB } from "../../core/collision";
import {
  makeScaleMatrix,
  makeRotationMatrix,
  makeTranslationMatrix,
  multiplyMatrices,
  makeIdentityMatrix,
} from "../../core/matrix";
import { sampleCount } from "../../core/config";
import gsap from "gsap";
import {
  createMeshesBindGroup,
  createPipeline,
  createTextureFromGLTFTexture,
  getNodeTransform,
  load3DModel,
  traverseNodes,
} from "./glb-model-utils";

export interface GLBModelProps {
  url: string;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  shader: GPUShaderModule;
}

// const vertexShaderSource = `
// struct Uniforms {
//   model: mat4x4<f32>,
//   view: mat4x4<f32>,
//   proj: mat4x4<f32>,
//   baseColor: vec4<f32>,
// }

// @group(0) @binding(0) var<uniform> uniforms: Uniforms;
// @group(0) @binding(1) var textureSampler: sampler;
// @group(0) @binding(2) var baseTexture: texture_2d<f32>;

// struct VertexInput {
//   @location(0) position: vec3<f32>,
//   @location(1) normal: vec3<f32>,
//   @location(2) uv: vec2<f32>,
//   @location(3) color: vec4<f32>,
// }

// struct VertexOutput {
//   @builtin(position) position: vec4<f32>,
//   @location(0) worldPos: vec3<f32>,
//   @location(1) normal: vec3<f32>,
//   @location(2) uv: vec2<f32>,
//   @location(3) color: vec4<f32>,
// }

// @vertex
// fn vs_main(input: VertexInput) -> VertexOutput {
//   var output: VertexOutput;

//   let worldPos = uniforms.model * vec4<f32>(input.position, 1.0);
//   output.worldPos = worldPos.xyz;
//   output.position = uniforms.proj * uniforms.view * worldPos;
//   output.normal = normalize((uniforms.model * vec4<f32>(input.normal, 0.0)).xyz);
//   output.uv = input.uv;
//   output.color = input.color;

//   return output;
// }
// `;
// const fragmentShaderSource = `
// struct VertexOutput {
//   @builtin(position) position: vec4<f32>,
//   @location(0) worldPos: vec3<f32>,
//   @location(1) normal: vec3<f32>,
//   @location(2) uv: vec2<f32>,
//   @location(3) color: vec4<f32>,
// }

// @group(0) @binding(0) var<uniform> uniforms: Uniforms;
// @group(0) @binding(1) var textureSampler: sampler;
// @group(0) @binding(2) var baseTexture: texture_2d<f32>;

// struct Uniforms {
//   model: mat4x4<f32>,
//   view: mat4x4<f32>,
//   proj: mat4x4<f32>,
//   baseColor: vec4<f32>,
// }

// @fragment
// fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
//   // Sample texture
//   var textureColor = textureSample(baseTexture, textureSampler, input.uv);

//   // Use material base color
//   var materialColor = uniforms.baseColor;

//   // Check if vertex colors are not default white
//   let hasVertexColors = (input.color.r != 1.0 || input.color.g != 1.0 || input.color.b != 1.0 || input.color.a != 1.0);

//   // Combine colors based on glTF 2.0 specification
//   var finalColor: vec3<f32>;
//   var finalAlpha: f32;

//   if (hasVertexColors) {
//     // Vertex colors multiply with material and texture
//     finalColor = input.color.rgb * materialColor.rgb * textureColor.rgb;
//     finalAlpha = input.color.a * materialColor.a;
//   } else {
//     // No vertex colors, just material * texture
//     finalColor = materialColor.rgb * textureColor.rgb;
//     finalAlpha = materialColor.a;
//   }

//   // Simple lighting
//   let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
//   let ambient = 0.6;
//   let diffuse = max(dot(input.normal, lightDir), 0.0);
//   let lighting = ambient + diffuse * 0.4;

//   finalColor = finalColor * lighting;

//   return vec4<f32>(finalColor, finalAlpha);
// }
// `;

export class GLBModel implements Object3D {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private props: GLBModelProps;

  private meshes: MeshData[] = [];
  private pipeline!: GPURenderPipeline;
  private defaultTexture!: GPUTexture;
  private defaultSampler!: GPUSampler;
  private textureCache: Map<string, GPUTexture> = new Map();

  private camera!: Camera;
  private tweens: gsap.core.Tween[] = [];
  private globalAABB: AABB = {
    minX: 0,
    minY: 0,
    minZ: 0,
    maxX: 0,
    maxY: 0,
    maxZ: 0,
  };

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    props: GLBModelProps
  ) {
    this.device = device;
    this.format = format;
    this.props = props;
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  async init(): Promise<void> {
    //* load glb or gltf
    const doc: Document = await load3DModel(this.props.url);

    //* and let's start
    const root = doc.getRoot();
    const scene = root.getDefaultScene() || root.listScenes()[0];

    if (!scene) {
      throw new Error("No scenes found in GLB file");
    }

    //* Create default texture and sampler first
    this.defaultTexture = this.device.createTexture({
      size: [1, 1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    //* Write white pixel to default texture
    this.device.queue.writeTexture(
      { texture: this.defaultTexture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      { width: 1, height: 1 }
    );

    this.defaultSampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    //* Traverse the scene graph starting from root nodes (this will load textures)
    for (const rootNode of scene.listChildren()) {
      await traverseNodes(
        rootNode,
        this.meshes,
        this.defaultTexture,
        this.textureCache,
        this.device
      );
    }

    if (this.meshes.length === 0) {
      throw new Error("No renderable meshes found in GLB file");
    }

    this.pipeline = createPipeline(this.device, this.format, this.props.shader);
    createMeshesBindGroup(
      this.device,
      this.pipeline,
      this.defaultSampler,
      this.defaultTexture,
      this.meshes
    );

    this.updateCameraTransform();
  }

  updateCameraTransform(): void {
    const { posX, posY, posZ, rotX, rotY, rotZ, scaleX, scaleY, scaleZ } =
      this.props;

    const scale = makeScaleMatrix(scaleX, scaleY, scaleZ);
    const rotation = makeRotationMatrix(rotX, rotY, rotZ);
    const translation = makeTranslationMatrix(posX, posY, posZ);
    const globalTransform = multiplyMatrices(
      translation,
      multiplyMatrices(rotation, scale)
    );
    const view = this.camera.getViewMatrix();
    const proj = this.camera.getProjectionMatrix();

    for (const mesh of this.meshes) {
      const finalTransform = multiplyMatrices(globalTransform, mesh.transform);

      const data = new Float32Array(16 * 3 + 4);
      data.set(finalTransform, 0);
      data.set(view, 16);
      data.set(proj, 32);

      const baseColor = mesh.material?.baseColor || [1, 1, 1, 1];
      data.set(baseColor, 48);

      this.device.queue.writeBuffer(mesh.transformBuffer, 0, data);
    }
  }

  render(pass: GPURenderPassEncoder): void {
    pass.setPipeline(this.pipeline);

    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];

      if (!mesh.bindGroup) {
        console.error(`Mesh ${i} has no bind group, skipping`);
        continue;
      }

      pass.setVertexBuffer(0, mesh.vertexBuffer);
      pass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat);
      pass.setBindGroup(0, mesh.bindGroup);
      pass.drawIndexed(mesh.indexCount);
    }
  }

  addTween(tween: gsap.core.Tween) {
    this.tweens.push(tween);
  }

  destroy(): void {
    // Clean up all mesh resources
    for (const mesh of this.meshes) {
      mesh.vertexBuffer?.destroy();
      mesh.indexBuffer?.destroy();
      mesh.transformBuffer?.destroy();
    }
    this.meshes = [];

    // Clean up cached textures
    for (const texture of this.textureCache.values()) {
      texture.destroy();
    }
    this.textureCache.clear();

    this.defaultTexture?.destroy();

    // Help GC
    this.pipeline = null as any;
    this.camera = null as any;
    (this.props as any) = null;

    this.tweens.forEach((tween) => tween.kill());
    this.tweens = [];
  }

  run(_: number): void {}

  updateProps(callback: (props: GLBModelProps) => void): void {
    callback(this.props);
    this.updateCameraTransform();
  }

  getProps(): GLBModelProps {
    return this.props;
  }
}
