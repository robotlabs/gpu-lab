export interface SphereProps {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  sphereColor: [number, number, number, number];
  shader: GPUShaderModule;
  wireframe?: boolean;
  params: [number, number, number, number][];
}
