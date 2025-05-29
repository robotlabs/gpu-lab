struct Transform {
  modelCube: mat4x4<f32>,
  modelGrid: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  cubeColor: vec4<f32>,
};

@group(0) @binding(0) var<uniform> transform: Transform;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>,
  
};

@vertex
fn vs_main(@location(0) pos: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOutput {
  var output: VertexOutput;
  let world = transform.modelCube * vec4f(pos, 1.0);
  let worldNormal = normalize((transform.modelCube * vec4f(normal, 0.0)).xyz);

  output.Position = transform.projectionMatrix * transform.viewMatrix * world;
  output.vPosition = world.xyz;
  output.vNormal = worldNormal;
  // output.vColor = vec3<f32>(0.0, 0.5, 0.2); 
  output.vColor = transform.cubeColor.rgb;
  return output;
}

@fragment
fn fs_main(
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>
) -> @location(0) vec4<f32> {
  let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.3));
  let viewDir = normalize(-vPosition);
  let normal = normalize(vNormal);

  let ambient = 0.15;
  let diffuse = max(dot(normal, lightDir), 0.0);
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

  let lighting = ambient + 0.7 * diffuse + 0.3 * specular;

  return vec4<f32>(vColor * lighting, 1.0);
}
