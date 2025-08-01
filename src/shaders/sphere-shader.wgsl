struct Transform {
  modelSphere: mat4x4<f32>,
  modelGrid: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  sphereColor: vec4<f32>,
  params: array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> transform: Transform;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>,
};

@vertex fn vs_main(@location(0) pos: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOutput {
  var output: VertexOutput;
  let world = transform.modelSphere * vec4f(pos, 1.0);
  let worldNormal = normalize((transform.modelSphere * vec4f(normal, 0.0)).xyz);

  output.Position = transform.projectionMatrix * transform.viewMatrix * world;
  output.vPosition = world.xyz;
  output.vNormal = worldNormal;
  output.vColor = transform.sphereColor.rgb;
  return output;
}

// Solid rendering fragment shader
@fragment fn fs_main(
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>
) -> @location(0) vec4<f32> {
  let u_time = transform.params[0].z;
  let u_duration = transform.params[0].w;
  let u_mouse = transform.params[0].xy;
  let u_resolution = transform.params[1].xy;
  
  // Simple lighting calculation
  let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.3));
  let viewDir = normalize(-vPosition);
  let normal = normalize(vNormal);

  let ambient = 0.15;
  let diffuse = max(dot(normal, lightDir), 0.0);
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

  let lighting = ambient + 0.7 * diffuse + 0.3 * specular;

  // You can use the params for effects, for example:
  let timeEffect = sin(u_time) * 0.1 + 1.0;
  
  return vec4<f32>((vColor * timeEffect) * lighting, 1.0);
}

// Wireframe rendering fragment shader
@fragment fn fs_wireframe(
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>
) -> @location(0) vec4<f32> {
  // Simple unlit wireframe rendering
  let wireframeColor = vec3(1.0, 1.0, 1.0);
  return vec4<f32>(wireframeColor, 1.0);
}