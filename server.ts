import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy endpoint to Wan2GP local Gradio API at http://localhost:7860
  app.all("/api/wan2gp-proxy/*", async (req, res) => {
    const targetPath = req.params[0] || "";
    const queryStr = req.url.split("?")[1] || "";
    const targetUrl = `http://localhost:7860/${targetPath}${queryStr ? "?" + queryStr : ""}`;

    try {
      const fetchOptions: any = {
        method: req.method,
        headers: {
          "Content-Type": req.headers["content-type"] || "application/json",
        },
      };

      if (req.method !== "GET" && req.method !== "HEAD") {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const contentType = response.headers.get("content-type") || "";

      res.status(response.status);
      
      if (contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        res.send(text);
      }
    } catch (err: any) {
      console.error(`Proxy error to ${targetUrl}:`, err);
      res.status(502).json({
        error: "Bad Gateway",
        message: `Could not connect to local Wan2GP instance at http://localhost:7860. Is it running? Error: ${err.message}`,
        targetUrl,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
