# WebGPU Playground

A low-level playground to experiment with the [WebGPU API](https://gpuweb.github.io/gpuweb/).  
This project initializes a WebGPU context and provides rendering primitives such as cubes, textured or solid planes, and animated pixel grids.

---

Working on: interaction. Time to build a game with this

## 🚀 Getting Started

```bash
# Install dependencies
yarn

# Start the development server
yarn serve
```

---

## 📁 Project Structure

```
gpu-lab/
├── public/
├── src/
│   ├── app/
│   ├── gpulab/
│   │   ├── core/          # webgpu engine
│   │   │   ├── camera/
│   │   │   ├── engine/
│   │   │   ├── scene/
│   │   │   ├── ...../
│   │   ├── objects/        # Cubes, planes, grids
│   │   │   ├── cubes/
│   │   │   ├── grids/
│   │   │   ├── planes/
│   ├── gui/                # GUIView and parameter controls (tweakpane)
│   ├── shaders/            # WGSL shader modules
│   └── main.ts             # Application bootstrap
├── index.html              # HTML entry point
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler configuration
└── package.json            # Project metadata and dependencies
```

---

## ✨ Features

- WebGPU rendering context
- Cubes, planes and grids rendering with WGSL shaders
- Real-time camera and object control via Tweakpane
- GSAP integration for smooth animations
- Modular structure to support shader and object experimentation

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
