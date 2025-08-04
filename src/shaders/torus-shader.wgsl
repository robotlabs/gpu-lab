
// WGSL Shader for Torus (torus-shader.wgsl)

struct Transform {
  modelTorus: mat4x4<f32>,
  modelGrid: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  torusColor: vec4<f32>,
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
  let u_time = transform.params[0].z;
  let u_mouse = transform.params[0].xy;
  
  // You can add torus-specific animations here
  // For example, twist the torus based on time
  let twist = 1.0;//sin(u_time * 0.5) * 0.3;
  let angle = atan2(pos.z, pos.x) + twist * pos.y;
  let radius = sqrt(pos.x * pos.x + pos.z * pos.z);
  
  let animatedPos = vec3<f32>(
    radius * cos(angle),
    pos.y + sin(u_time + pos.x) * 0.1, // Add some wave motion
    radius * sin(angle)
  );
  let posStatic = pos;

  
  
  var output: VertexOutput;
  

  //uncomment this if you want to animate the vertex of torus
//   let world = transform.modelTorus * vec4f(animatedPos, 1.0);
//static torus
  let world = transform.modelTorus * vec4f(posStatic, 1.0);
  
  let worldNormal = normalize((transform.modelTorus * vec4f(normal, 0.0)).xyz);
  
  output.Position = transform.projectionMatrix * transform.viewMatrix * world;
  output.vPosition = world.xyz;
  output.vNormal = worldNormal;
  output.vColor = transform.torusColor.rgb;
  return output;
}

@fragment fn fs_main(
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>
) -> @location(0) vec4<f32> {
  let u_time = transform.params[0].z;
  let u_mouse = transform.params[0].xy;
  let u_resolution = transform.params[1].xy;
  
    // Your existing lighting code...
  let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.3));
  let viewDir = normalize(-vPosition);
  let normal = normalize(vNormal);

  let ambient = 0.25;
  let diffuse = max(dot(normal, lightDir), 0.0);
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

  let lighting = ambient + 0.7 * diffuse + 0.3 * specular;

  return vec4<f32>((vColor * 1.0) * lighting, 1.0);
}

// reflective shader
// @fragment fn fs_main(
//   @location(0) vPosition: vec3<f32>,
//   @location(1) vNormal: vec3<f32>,
//   @location(2) vColor: vec3<f32>
// ) -> @location(0) vec4<f32> {
//   let u_time = transform.params[0].z;
//   let u_mouse = transform.params[0].xy;
//   let u_resolution = transform.params[1].xy;
  
//   // Rim lighting effect (like in your Three.js example)
//   let viewDir = normalize(-vPosition);
//   let normal = normalize(vNormal);
//   let rimFactor = 1.0 - max(dot(normal, viewDir), 0.0);
//   let rimLight = pow(rimFactor, 3.0) * vec3<f32>(1.0, 1.0, 1.0) * 1.6;
  
//   // Basic lighting
//   let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.3));
//   let ambient = 0.15;
//   let diffuse = max(dot(normal, lightDir), 0.0);
//   let reflectDir = reflect(-lightDir, normal);
//   let specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  
//   let lighting = ambient + 0.7 * diffuse + 0.3 * specular;
//   let finalColor = vColor * lighting + rimLight;
  
//   return vec4<f32>(finalColor, 1.0);
// }

@fragment fn fs_wireframe(
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>
) -> @location(0) vec4<f32> {
  let wireframeColor = vec3(1.0, 1.0, 1.0);
  return vec4<f32>(wireframeColor, 1.0);
}