import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [glsl(), tsconfigPaths()],
  resolve: {
    alias: [{ find: "@", replacement: "/src" }],
  },
});
