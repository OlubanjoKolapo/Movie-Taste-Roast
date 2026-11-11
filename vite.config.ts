import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/** Runs the Vercel edge functions in /api during `vite dev`, so the whole app works locally. */
function devApi(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z]+)(?:[?/]|$)/.exec(req.url ?? "");
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`);
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          Object.entries(req.headers).forEach(([k, v]) => typeof v === "string" && headers.set(k, v));
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
          });
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.config.logger.error(String(err));
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Not found" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Server-side keys (no VITE_ prefix) are exposed to the dev API only, never to the browser bundle.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) if (!k.startsWith("VITE_") && process.env[k] === undefined) process.env[k] = v;
  return { plugins: [react(), tailwindcss(), devApi()] };
});
