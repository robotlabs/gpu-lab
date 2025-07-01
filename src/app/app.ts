import { GUIView } from "@/gui/guiView";
//* libs */
import Stats from "stats.js";
import gsap from "gsap";

//* shaders */
import cubeShader from "@/shaders/cube-shader.wgsl";
import gridShader from "@/shaders/grid-shader.wgsl";
import singlePlaneShader from "@/shaders/plane-shader.wgsl";
import glbShader from "@/shaders/glb-shader.wgsl";

//* gpu lab */
import { Engine } from "@/gpulab/core/engine";
import { Scene } from "@/gpulab/core/scene";
import { CameraAxis } from "@/gpulab/core/types";

//* cubes
import { Cube } from "@/gpulab/objects/cubes/cube";

//* planes
import { Plane } from "@/gpulab/objects/planes/plane";

//* grids
import { PixelGridLayout } from "@/gpulab/objects/grids/pixel-grid-layout";

import { createTextureFromImage } from "@/gpulab/objects/planes/plane-utils";
import { vec3 } from "gl-matrix";
import { GLBModel } from "@/gpulab/objects/glb/glb-model";

export default class App {
  private stats!: ReturnType<typeof Stats>;
  private engine!: Engine;
  private scene!: Scene;

  constructor() {}

  async init(canvas: HTMLCanvasElement): Promise<void> {
    var cameraInitPos: vec3 = [5, 5, 20];

    new GUIView(this, cameraInitPos);
    const datGUIRoot = document.querySelector(".tp-dfwv");
    if (datGUIRoot) {
      (datGUIRoot as HTMLElement).style.position = "fixed";
      (datGUIRoot as HTMLElement).style.top = "0px";
      (datGUIRoot as HTMLElement).style.right = "0px";
      (datGUIRoot as HTMLElement).style.zIndex = "889900998";
    }
    this.initStats();

    this.engine = new Engine({ canvas }, cameraInitPos);
    await this.engine.init();

    this.scene = new Scene(this.engine.getCamera());
    this.engine.setScene(this.scene);

    const device = this.engine.getDevice();
    const format = this.engine.getFormat();

    // this.testCubes(device, format);
    // this.testGrids(device, format);
    // this.testGLBModel(device, format);
    this.testGLBModel(device, format);
    // this.testPlanes(device, format);

    this.setupResizeListener();
    this.startRendering();
  }

  private initStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(0);

    const dom = this.stats.dom;
    dom.style.position = "fixed";
    dom.style.top = "0px";
    dom.style.left = "0px";
    dom.style.zIndex = "9999999";

    document.body.appendChild(this.stats.dom);
  }

  //* from gui
  public updateCameraAxis(axis: CameraAxis, value: number): void {
    const camera = this.engine.getCamera();
    const [x, y, z] = camera.getPosition();

    const newPos: [number, number, number] = [
      axis === "x" ? value : x,
      axis === "y" ? value : y,
      axis === "z" ? value : z,
    ];

    camera.setPosition(newPos);
    this.scene.updateCameraTransform();
    //@ts-ignore
    window.camera = camera;
  }

  public runCubes() {
    this.scene.clear();
    const device = this.engine.getDevice();
    const format = this.engine.getFormat();

    this.testCubes(device, format);
  }
  public runGrids() {
    this.scene.clear();
    const device = this.engine.getDevice();
    const format = this.engine.getFormat();

    this.testGrids(device, format);
  }
  public runPlanes() {
    this.scene.clear();
    const device = this.engine.getDevice();
    const format = this.engine.getFormat();

    this.testPlanes(device, format);
  }
  public runGlb() {
    this.scene.clear();
    const device = this.engine.getDevice();
    const format = this.engine.getFormat();

    this.testGLBModel(device, format);
  }
  public runGlb2() {
    this.scene.clear();
    const device = this.engine.getDevice();
    const format = this.engine.getFormat();

    this.testGLBModel2(device, format);
  }

  private setupResizeListener(): void {
    window.addEventListener("resize", () => {
      this.engine.resize();
      this.engine
        .getCamera()
        .setAspect(
          this.engine.getCanvas().width / this.engine.getCanvas().height
        );
    });
  }
  private startRendering(): void {
    const camera = this.engine.getCamera();
    const canvas = this.engine.getCanvas();
    camera.setAspect(canvas.width / canvas.height);

    let time = 0;
    let startTimer = false;
    setTimeout(() => (startTimer = true), 300);

    gsap.ticker.add(() => {
      this.stats.begin();
      if (startTimer) {
        time += 0.05;
        this.scene.run(time);
      }
      this.engine.render();
      this.stats.end();
    });
  }

  private testCubes(device: GPUDevice, format: GPUTextureFormat): void {
    const cubeShaderModule = device.createShaderModule({ code: cubeShader });

    //** single cube */
    const rnMultiplierPos = 10;
    for (let i = 0; i < 1000; i++) {
      const cube = new Cube(device, format, {
        posX: Math.random() * rnMultiplierPos - 3,
        posY: Math.random() * rnMultiplierPos - 3,
        posZ: Math.random() * rnMultiplierPos - 0,
        rotX: Math.random() * rnMultiplierPos,
        rotY: Math.random() * rnMultiplierPos,
        rotZ: Math.random() * rnMultiplierPos,
        scaleX: Math.random() * 1,
        scaleY: Math.random() * 1,
        scaleZ: Math.random() * 1,
        cubeColor: [Math.random(), Math.random(), Math.random(), 1],
        shader: cubeShaderModule,
      });
      this.scene.add(cube);

      const tween = gsap.to(cube.getProps(), {
        posX: Math.random() * rnMultiplierPos - 3,
        posY: Math.random() * rnMultiplierPos - 3,
        posZ: Math.random() * rnMultiplierPos - 0,
        rotX: Math.random() * rnMultiplierPos,
        rotY: Math.random() * rnMultiplierPos,
        rotZ: Math.random() * rnMultiplierPos,
        scaleX: Math.random() * 1,
        scaleY: Math.random() * 1,
        scaleZ: Math.random() * 1,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power4.inOut",
        onUpdate: () => cube.updateCameraTransform(),
      });

      cube.addTween(tween);
    }
  }
  private testGrids(device: GPUDevice, format: GPUTextureFormat): void {
    const gridShaderModule = device.createShaderModule({
      code: gridShader,
    });

    // Generate random grids similar to cubes
    const pixelGridInstances = [];
    const rnMultiplierPos = 10;
    const gridCount = 100; // Adjust number of grids as needed

    for (let i = 0; i < gridCount; i++) {
      pixelGridInstances.push({
        shader: gridShaderModule,
        props: {
          posX: Math.random() * rnMultiplierPos - 5,
          posY: Math.random() * rnMultiplierPos - 5,
          posZ: Math.random() * rnMultiplierPos - 2,
          rotX: Math.random() * Math.PI * 2 - Math.PI,
          rotY: Math.random() * Math.PI * 2 - Math.PI,
          rotZ: Math.random() * Math.PI * 2 - Math.PI,
          gridSize: Math.floor(Math.random() * 64) + 16, // Random grid size between 16-80
          gridSpace: Math.random() * 0.8 + 0.1, // Random grid space between 0.1-0.9
          gridActiveColor: [Math.random(), Math.random(), Math.random(), 1] as [
            number,
            number,
            number,
            number
          ],
        },
      });
    }

    // Create the pixel grid layout
    const pixelGridsLayout = new PixelGridLayout(
      device,
      format,
      this.engine.getCamera(),
      this.scene,
      pixelGridInstances
    );

    // Animate each grid
    for (let i = 0; i < gridCount; i++) {
      const grid = pixelGridsLayout.getGrid(i);

      if (grid) {
        // Random delay for staggered animation start
        const randomDelay = Math.random() * 2;

        // Position animation
        const positionTween = gsap.to(grid.getProps(), {
          posX: Math.random() * rnMultiplierPos - 5,
          posY: Math.random() * rnMultiplierPos - 5,
          posZ: Math.random() * rnMultiplierPos - 2,
          rotX: Math.random() * Math.PI * 2 - Math.PI,
          rotY: Math.random() * Math.PI * 2 - Math.PI,
          rotZ: Math.random() * Math.PI * 2 - Math.PI,
          duration: 4 + Math.random() * 2, // Random duration between 4-6 seconds
          repeat: -1,
          yoyo: true,
          ease: "power4.inOut",
          delay: randomDelay,
          onUpdate: () => grid.updateCameraTransform(),
        });

        // Grid space animation
        const gridSpaceTween = gsap.to(grid.getProps(), {
          gridSpace: Math.random() * 0.8 + 0.1,
          duration: 3 + Math.random() * 2, // Random duration between 3-5 seconds
          repeat: -1,
          yoyo: true,
          ease: "power2.inOut",
          delay: randomDelay + 0.5,
          onUpdate: () => grid.updateGridSpace(),
        });

        // Color animation
        const colorTween = gsap.to(grid.getProps().gridActiveColor, {
          0: Math.random(), // R
          1: Math.random(), // G
          2: Math.random(), // B
          3: 1.0, // A (keep alpha at 1)
          duration: 5 + Math.random() * 3, // Random duration between 5-8 seconds
          repeat: -1,
          yoyo: true,
          ease: "power3.inOut",
          delay: randomDelay + 1,
          onUpdate: () => grid.updateGridColor(),
        });

        // Store tweens if your grid class supports it (similar to cube.addTween)
        if (grid.addTween) {
          grid.addTween(positionTween);
          grid.addTween(gridSpaceTween);
          grid.addTween(colorTween);
        }
      }
    }
  }
  private async testPlanes(
    device: GPUDevice,
    format: GPUTextureFormat
  ): Promise<void> {
    const planeShaderModule = device.createShaderModule({
      code: singlePlaneShader,
    });

    // Create shared texture and sampler
    const planeTexture = await createTextureFromImage(
      device,
      "./images/marlene.png"
    );
    const planeSampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });

    // Create multiple single planes
    const rnMultiplierPos = 10;
    for (let i = 0; i < 100; i++) {
      const plane = new Plane(
        device,
        format,
        planeShaderModule,
        planeTexture,
        planeSampler,
        {
          posX: Math.random() * rnMultiplierPos - 5,
          posY: Math.random() * rnMultiplierPos - 5,
          posZ: Math.random() * rnMultiplierPos - 5,
          rotX: Math.random() * Math.PI * 2,
          rotY: Math.random() * Math.PI * 2,
          rotZ: Math.random() * Math.PI * 2,
          scaleX: Math.random() * 2 + 0.5,
          scaleY: Math.random() * 2 + 0.5,
          scaleZ: 1,
          color: [Math.random(), Math.random(), Math.random(), 1],
          useTexture: false, //Math.random() > 0.5,
        }
      );
      this.scene.add(plane);

      // Animate the plane
      const tween = gsap.to(plane.getProps(), {
        posX: Math.random() * rnMultiplierPos - 5,
        posY: Math.random() * rnMultiplierPos - 5,
        posZ: Math.random() * rnMultiplierPos - 5,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        scaleX: Math.random() * 2 + 0.5,
        scaleY: Math.random() * 2 + 0.5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power4.inOut",
        onUpdate: () => plane.updateCameraTransform(),
      });

      plane.addTween(tween);
    }
  }
  private async testGLBModel(
    device: GPUDevice,
    format: GPUTextureFormat
  ): Promise<void> {
    const glbShaderModule = device.createShaderModule({ code: glbShader });

    const glbModel = new GLBModel(
      this.engine.getDevice(),
      this.engine.getFormat(),
      {
        url: "./models/car7.glb",
        posX: 3.5,
        posY: 4,
        posZ: 16,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        shader: glbShaderModule,
      }
    );
    const tween = gsap.to(glbModel.getProps(), {
      rotX: 0,
      rotY: Math.PI * 2,
      rotZ: 0,
      duration: 4,
      ease: "power4.inOut",
      yoyo: true,
      repeat: -1,
      onUpdate: () => glbModel.updateCameraTransform(),
    });
    glbModel.addTween(tween);

    glbModel.setCamera(this.engine.getCamera());
    await glbModel.init();
    this.scene.add(glbModel);
  }

  private async testGLBModel2(
    device: GPUDevice,
    format: GPUTextureFormat
  ): Promise<void> {
    const glbShaderModule = device.createShaderModule({ code: glbShader });

    const glbModel = new GLBModel(
      this.engine.getDevice(),
      this.engine.getFormat(),
      {
        url: "./models/city2.glb",
        posX: 3.5,
        posY: 4,
        posZ: 16,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        scaleZ: 0.2,
        shader: glbShaderModule,
      }
    );
    const tween = gsap.to(glbModel.getProps(), {
      rotX: 0,
      rotY: Math.PI * 2,
      rotZ: 0,
      duration: 4,
      ease: "power4.inOut",
      yoyo: true,
      repeat: -1,
      onUpdate: () => glbModel.updateCameraTransform(),
    });
    glbModel.addTween(tween);

    glbModel.setCamera(this.engine.getCamera());
    await glbModel.init();
    this.scene.add(glbModel);
  }
}
