export type CubeProps = {
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
  cubeColor: [number, number, number, number];
};
