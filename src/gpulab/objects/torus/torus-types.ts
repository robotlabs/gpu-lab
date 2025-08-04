// torus-types.ts
export interface TorusProps {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  torusColor: [number, number, number, number];
  shader: GPUShaderModule;
  wireframe?: boolean;
  params: [number, number, number, number][];
  // Torus-specific properties
  majorRadius?: number; // Main radius of the torus
  minorRadius?: number; // Tube radius
  majorSegments?: number; // Segments around the main circle
  minorSegments?: number; // Segments around the tube
  depthOffset?: 10;
}
