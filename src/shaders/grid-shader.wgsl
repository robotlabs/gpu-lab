@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>;
@group(0) @binding(2) var<uniform> transform: Transform;
@group(0) @binding(3) var<uniform> time: f32;
@group(0) @binding(4) var<uniform> gridSpace: f32;
@group(0) @binding(5) var<uniform> gridActiveColor: vec4f;

struct Transform {
  modelGrid: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) cellStateValue: f32,
};

@vertex
fn vertexMain(
  @location(0) pos: vec2f, 
  @builtin(instance_index) instance: u32
) -> VertexOutput {
  let i = f32(instance);
  let cell = vec2f(i % grid.x, floor(i / grid.x));

  let gridScale = 8.0;
  let spacingFactor = gridSpace;

  let tileSize = vec2f(gridScale / grid.x, gridScale / grid.y);
  let halfGrid = vec2f(gridScale * 0.5, gridScale * 0.5);
  let cellOffset = (cell * tileSize) - halfGrid + tileSize * 0.5;

  
  let x = pos.x * tileSize.x * 0.5 * spacingFactor + cellOffset.x;
  let z = pos.y * tileSize.y * 0.5 * spacingFactor + cellOffset.y;

  let state = f32(cellState[instance]);
  let y = 0.0;

  // ✅ Rotate around true grid center (now centered)
  let localPosition = vec4f(x, y, z, 1.0);
  let worldPosition = transform.modelGrid * localPosition;
  let viewPosition = transform.viewMatrix * worldPosition;
  let finalPosition = transform.projectionMatrix * viewPosition;

  var output: VertexOutput;
  output.position = finalPosition;
  output.cellStateValue = state;
  return output;
}

@fragment
fn fragmentMain(@location(0) cellStateValue: f32) -> @location(0) vec4f {
  if (cellStateValue == 0.0) {
    return vec4f(0, 0, 0, 1);
  }
  return gridActiveColor;
}
