struct Transform {
  modelMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  projMatrix: mat4x4<f32>,
  color: vec4<f32>,
  useTexture: vec4<f32>, // x component: 0 or 1, others padding
};

@group(0) @binding(0) var<uniform> transform: Transform;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var textureData: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragColor: vec4<f32>,
  @location(1) fragNormal: vec3<f32>,
  @location(2) fragWorldPos: vec3<f32>,
  @location(3) fragUV: vec2<f32>,
};

@vertex
fn vs_main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>
) -> VertexOutput {
  let world = transform.modelMatrix * vec4<f32>(position, 1.0);
  let worldNormal = normalize((transform.modelMatrix * vec4<f32>(normal, 0.0)).xyz);

  var output: VertexOutput;
  output.Position = transform.projMatrix * transform.viewMatrix * world;
  output.fragWorldPos = world.xyz;
  output.fragNormal = worldNormal;
  output.fragUV = uv;
  output.fragColor = transform.color;
  
  return output;
}

@fragment
fn fs_main(
  @location(0) fragColor: vec4<f32>,
  @location(1) fragNormal: vec3<f32>,
  @location(2) fragWorldPos: vec3<f32>,
  @location(3) fragUV: vec2<f32>
) -> @location(0) vec4<f32> {
  let lightDir = normalize(vec3<f32>(0.3, 1.0, 0.6));
  let viewDir = normalize(-fragWorldPos);
  let halfway = normalize(lightDir + viewDir);
  
  let ambient = 0.15;
  let diffuse = abs(dot(fragNormal, lightDir));
  let specular = pow(max(dot(fragNormal, halfway), 0.0), 16.0);
  let lighting = ambient + diffuse * 0.6 + specular * 0.4;

  let texColor = textureSample(textureData, textureSampler, fragUV);
  
  // Mix between texture and solid color based on useTexture flag
  let useTextureFlag = transform.useTexture.x > 0.5;
  let finalColor = select(fragColor.rgb * lighting, texColor.rgb, useTextureFlag);
  let finalAlpha = select(fragColor.a, texColor.a, useTextureFlag);
  
  return vec4<f32>(finalColor, finalAlpha);
}