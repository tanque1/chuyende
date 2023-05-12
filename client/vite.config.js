import react from "@vitejs/plugin-react";
import fs from "fs/promises";
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl"
// https://vitejs.dev/config/
export default defineConfig({
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.js?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "load-js-files-as-jsx",
          setup(build) {
            build.onLoad({ filter: /src\\.*\.js$/ }, async (args) => ({
              loader: "jsx",
              contents: await fs.readFile(args.path, "utf8"),
            }));
          },
        },
      ],
    },
  },
  plugins: [react(),basicSsl()],
  server: {
    watch: {
      usePolling: true,
    },
    https: true, 
    host: true,
    port: 3000,
    secure: false,
    strictPort: true,
    hmr: {
      port: 3000,
      host: "27.75.17.119",
    }, 
  },
});
