import { mat4 } from "wgpu-matrix";

export function makeScaleMatrix(
  sx: number,
  sy: number,
  sz: number
): Float32Array {
  return mat4.scaling([sx, sy, sz]);
}

export function makeTranslationMatrix(
  tx: number,
  ty: number,
  tz: number
): Float32Array {
  return mat4.translation([tx, ty, tz]);
}

export function makeRotationMatrix(
  rx: number,
  ry: number,
  rz: number
): Float32Array {
  const rotX = mat4.rotationX(rx);
  const rotY = mat4.rotationY(ry);
  const rotZ = mat4.rotationZ(rz);
  return mat4.multiply(mat4.multiply(rotZ, rotY), rotX);
}

export function multiplyMatrices(
  a: Float32Array,
  b: Float32Array
): Float32Array {
  return mat4.multiply(a, b);
}
export function makeIdentityMatrix(): Float32Array {
  return mat4.identity();
}
