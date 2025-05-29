import { sampleCount } from "./config";

export async function initWebGPU(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    alert("WebGPU is not supported on your browser.");
    throw new Error();
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    alert("Adapter is not available.");
    throw new Error();
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  if (!context) {
    throw new Error();
  }

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = devicePixelRatio * canvas.clientWidth;
  canvas.height = devicePixelRatio * canvas.clientHeight;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  const multiSampledTexture = createMultiSampledTexture(
    device,
    canvas,
    presentationFormat,
    sampleCount
  );

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    sampleCount,
  });

  const renderPassDescriptor = createDefaultRenderPassDescriptor(depthTexture);

  return {
    canvas,
    device,
    presentationFormat,
    context,
    multiSampledTexture,
    depthTexture,
    renderPassDescriptor,
  };
}

export function createDefaultRenderPassDescriptor(
  depthTexture: GPUTexture
): GPURenderPassDescriptor {
  return {
    label: "3D rendering pass",
    colorAttachments: [
      {
        view: undefined as unknown as GPUTextureView, // Will be set per frame
        clearValue: [0, 0, 0, 0],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };
}
export function createMultiSampledTexture(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  format: GPUTextureFormat,
  sampleCount: number = 4
) {
  let multiSampledTexture: GPUTexture | null;

  multiSampledTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    sampleCount: sampleCount, // 4x MSAA
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  return multiSampledTexture;
}
