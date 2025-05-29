import App from "@/app/app";

// Bootstrap
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById(
    "canvasPlayground"
  ) as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  const app = new App();
  app.init(canvas);
});
