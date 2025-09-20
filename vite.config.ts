import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import "dotenv/config"; 
import path from "path";
import { createServer, initializeSocket } from "./server";

// ✅ Final working config
export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    plugins: [react(), isDev ? expressPlugin() : undefined].filter(Boolean),

    build: {
      outDir: "client/dist", // ✅ Output for production deployment
      emptyOutDir: true,
      sourcemap: false, // Disable sourcemaps for production
      minify: "esbuild", // Use esbuild for faster builds
    },

    base: "/", // Ensure correct base path for production

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./client"),
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },

    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
    },
  };
});

// ✅ Dev plugin (Express middleware for dev)
function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(viteServer) {
      const app = createServer();

      // Initialize Socket.io with the Vite HTTP server
      if (viteServer.httpServer) {
        initializeSocket(viteServer.httpServer);
        console.log("🔌 Socket.io initialized in Vite dev server");
      }

      viteServer.middlewares.use(app);
    },
  };
}
