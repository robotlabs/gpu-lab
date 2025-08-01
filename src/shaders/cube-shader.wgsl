struct Transform {
  modelCube: mat4x4<f32>,
  modelGrid: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  cubeColor: vec4<f32>,
  params:      array<vec4<f32>, 2>, 
};

@group(0) @binding(0) var<uniform> transform: Transform;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>,
};

@vertex fn vs_main(@location(0) pos: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOutput {
  let u_time = transform.params[0].z;    // time
  let u_radius = 1.0; // radius
  
  // Calculate delta for animation (same as your GLSL)
  let delta: f32 = ((sin(u_time) + 1.0) / 2.0);
  
  // Create normalized position scaled by radius
  let v: vec3<f32> = normalize(pos) * u_radius;
  
  // Mix between original position and scaled normalized position
  let animatedPos: vec3<f32> = mix(pos, v, delta);
  
  // Calculate the animated normal by mixing between original normal and spherical normal
  let sphericalNormal: vec3<f32> = normalize(pos); // For a sphere, normal = normalized position
  let animatedNormal: vec3<f32> = normalize(mix(normal, sphericalNormal, delta));
  
  var output: VertexOutput;
  let world = transform.modelCube * vec4f(animatedPos, 1.0); // Use animated position
  let worldNormal = normalize((transform.modelCube * vec4f(animatedNormal, 0.0)).xyz); // Use animated normal

  output.Position = transform.projectionMatrix * transform.viewMatrix * world;
  output.vPosition = world.xyz;
  output.vNormal = worldNormal;
  output.vColor = transform.cubeColor.rgb;
  return output;
}

// Solid rendering fragment shader
@fragment fn fs_main(
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>
) -> @location(0) vec4<f32> {
  let u_time = transform.params[0].z;        // Now you can use this
  let u_duration = transform.params[0].w;
  let u_mouse = transform.params[0].xy;
  let u_resolution = transform.params[1].xy;
  
  let speed : f32 = .51;                       
  let v     : f32 = sin(u_time * speed) / 1;
  
  // Your existing lighting code...
  let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.3));
  let viewDir = normalize(-vPosition);
  let normal = normalize(vNormal);

  let ambient = 0.15;
  let diffuse = max(dot(normal, lightDir), 0.0);
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

  let lighting = ambient + 0.7 * diffuse + 0.3 * specular;

  return vec4<f32>((vColor * 1.0) * lighting, 1.0);
}


// Wireframe rendering fragment shader
@fragment
fn fs_wireframe(
  @location(0) vPosition: vec3<f32>,
  @location(1) vNormal: vec3<f32>,
  @location(2) vColor: vec3<f32>
) -> @location(0) vec4<f32> {
    
  // Simple unlit wireframe rendering
  let wireframeColor = vec3(1.0, 1.0, 1.0);
  return vec4<f32>(wireframeColor, 1.0);
}