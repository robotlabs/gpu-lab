struct Uniforms {
  model: mat4x4<f32>,
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  baseColor: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var baseTexture: texture_2d<f32>;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>,
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  
  let worldPos = uniforms.model * vec4<f32>(input.position, 1.0);
  output.worldPos = worldPos.xyz;
  output.position = uniforms.proj * uniforms.view * worldPos;
  output.normal = normalize((uniforms.model * vec4<f32>(input.normal, 0.0)).xyz);
  output.uv = input.uv;
  output.color = input.color;
  
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  var textureColor = textureSample(baseTexture, textureSampler, input.uv);
  
  var materialColor = uniforms.baseColor;
  
  let hasVertexColors = (input.color.r != 1.0 || input.color.g != 1.0 || input.color.b != 1.0 || input.color.a != 1.0);
  
  var finalColor: vec3<f32>;
  var finalAlpha: f32;
  
  if (hasVertexColors) {
    finalColor = input.color.rgb * materialColor.rgb * textureColor.rgb;
    finalAlpha = input.color.a * materialColor.a;
  } else {
    finalColor = materialColor.rgb * textureColor.rgb;
    finalAlpha = materialColor.a;
  }
  
  let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
  let ambient = 0.6;
  let diffuse = max(dot(input.normal, lightDir), 0.0);
  let lighting = ambient + diffuse * 0.4;
  
  finalColor = finalColor * lighting;
  
  return vec4<f32>(finalColor, finalAlpha);
}