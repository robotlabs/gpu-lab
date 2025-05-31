# WebGPU Playground

A low-level playground to experiment with the [WebGPU API](https://gpuweb.github.io/gpuweb/).  
This project initializes a WebGPU context and provides rendering primitives such as cubes, textured or solid planes, and animated pixel grids.

---

## 🚀 Getting Started

```bash
# Install dependencies
yarn

# Start the development server
yarn serve
```

Then open [http://localhost:3000](http://localhost:3000) in a WebGPU-compatible browser.  
(Chrome 113+ recommended — may require the `--enable-unsafe-webgpu` flag.)

---

## 📁 Project Structure

```
gpu-lab/
├── public/                 # Static assets
├── src/
│   ├── core/               # Engine, scene, camera, math types
│   ├── gui/                # GUIView and parameter controls (tweakpane)
│   ├── objects/            # Cubes, planes, grids
│   │   ├── cubes/
│   │   ├── planes/
│   │   └── grids/
│   ├── shaders/            # WGSL shader modules
│   ├── data/               # Position presets and input datasets
│   └── main.ts             # Application bootstrap
├── index.html              # HTML entry point
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler configuration
└── package.json            # Project metadata and dependencies
```

---

## ✨ Features

- ✅ WebGPU rendering context
- 🔲 Cube and plane rendering with WGSL shaders
- 🖼️ Texture sampling and solid color modes
- 🟦 Pixel grid rendering with animation support
- 🎮 Real-time camera and object control via Tweakpane
- ⏱️ GSAP integration for smooth animations
- 🧪 Modular structure to support shader and object experimentation

---

## 🛠️ Built With

- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [WebGPU](https://gpuweb.github.io/gpuweb/)
- [WGSL](https://www.w3.org/TR/WGSL/) (WebGPU Shading Language)
- [GSAP](https://gsap.com/)
- [Tweakpane](https://cocopon.github.io/tweakpane/)

---

## 📄 License

MIT © [robotlabs](https://github.com/robotlabs)
