import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { type Server } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Add static file serving for reports BEFORE Vite middleware
  app.use('/reports', express.static(path.join(process.cwd(), 'mcp-server/src/public/reports')));

  // Dynamic imports to avoid loading vite/plugin-react in production
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { nanoid } = await import("nanoid");
  const viteLogger = createLogger();

  // Use configFile to let Vite load vite.config.ts from disk at runtime,
  // avoiding bundling @vitejs/plugin-react into the server bundle
  const vite = await createViteServer({
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - let them be handled by the API routes middleware
    if (url.startsWith("/api")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production build, __dirname is dist/, so public/ is at ./public
  // In development, __dirname is server/, so we need ../dist/public
  const distPath = fs.existsSync(path.resolve(__dirname, "public"))
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
