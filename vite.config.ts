import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

const ROSLIB_THIS = "var ROSLIB = this.ROSLIB ||";

function roslibGlobalThis(): Plugin {
  return {
    name: "roslib-global-this",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/roslib/src/RosLib.js")) return;
      if (!code.includes(ROSLIB_THIS)) this.error(`roslib no longer starts with "${ROSLIB_THIS}"`);
      return { code: code.replace(ROSLIB_THIS, "var ROSLIB = globalThis.ROSLIB ||"), map: null };
    },
  };
}

// TEMP (tmp/mesh-load-bench): serve the committed GLBs as cached static files,
// only *.glb inside the workspace's src/*_urdf trees.
function meshFiles(): Plugin {
  const srcRoot = fs.realpathSync(path.resolve(process.cwd(), ".."));
  const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith("/mesh-files/")) return next();
    let file = "";
    try {
      file = fs.realpathSync(decodeURIComponent(req.url.slice("/mesh-files".length).split("?")[0]));
    } catch { /* missing: 404 below */ }
    const rel = path.relative(srcRoot, file);
    if (!file || rel.startsWith("..") || !/^[^/]+_urdf\//.test(rel) || !file.endsWith(".glb")) {
      res.statusCode = 404;
      return res.end();
    }
    res.setHeader("Content-Type", "model/gltf-binary");
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: "mesh-files",
    configureServer: (s) => { s.middlewares.use(handler); },
    configurePreviewServer: (s) => { s.middlewares.use(handler); },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // VITE_HTTPS=true must serve https: missing paths or unreadable certs are a
  // hard error, not a silent fall back to http.
  let https: { key: Buffer; cert: Buffer } | undefined;
  if (env.VITE_HTTPS === "true") {
    if (!env.VITE_SSL_KEY_PATH || !env.VITE_SSL_CERT_PATH) {
      throw new Error(
        "[vite] VITE_HTTPS=true but VITE_SSL_KEY_PATH / VITE_SSL_CERT_PATH are not set. " +
          "Set both to your cert/key paths, or set VITE_HTTPS=false."
      );
    }
    try {
      https = {
        key: fs.readFileSync(env.VITE_SSL_KEY_PATH),
        cert: fs.readFileSync(env.VITE_SSL_CERT_PATH),
      };
    } catch {
      throw new Error(
        `[vite] VITE_HTTPS=true but the cert/key files could not be read ` +
          `(cert: ${env.VITE_SSL_CERT_PATH}, key: ${env.VITE_SSL_KEY_PATH}). ` +
          "Add the certificates, or set VITE_HTTPS=false."
      );
    }
  }

  // Vite 5.4.12+ blocks requests whose host header isn't whitelisted, which breaks reverse proxies (e.g. Caddy).
  // Allow the public host from the env.
  const allowedHosts = env.VITE_ALLOWED_HOST
    ? env.VITE_ALLOWED_HOST.split(",").map((h) => h.trim()).filter(Boolean)
    : undefined;
  const port = parseInt(env.VITE_PORT || "4004");

  return {
    plugins: [react(), roslibGlobalThis(), meshFiles()],
    server: {
      https,
      host: "127.0.0.1",
      allowedHosts,
      port,
      hmr: https
        ? { protocol: "wss", clientPort: port }
        : undefined,
      proxy: {
        "^/rosbridge": {
          target: `ws://127.0.0.1:${env.PORT_ROSBRIDGE || process.env.PORT_ROSBRIDGE || "9090"}`,
          ws: true,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/rosbridge/, ""),
        },
      },
    },
    preview: { port, strictPort: true },
  };
});
