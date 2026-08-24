import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import http from "http";
import express from "express";

let pythonProcess = null;
const PYTHON_PORT = 8000;
const PYTHON_HOST = "127.0.0.1";

async function isPythonServerRunning() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: PYTHON_HOST,
        port: PYTHON_PORT,
        path: "/",
        method: "GET",
        timeout: 1000,
      },
      (res) => {
        resolve(true);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function getPythonExecutable() {
  const venvPython = "C:\\Users\\lemda\\Documents\\assistant-entretiens-rag\\venv\\Scripts\\python.exe";
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return "python";
}

async function ensurePythonServer(projectRoot) {
  const isRunning = await isPythonServerRunning();
  if (isRunning) return;

  const pythonExec = getPythonExecutable();
  const ragDir = path.join(projectRoot, "backend", "interview_rag");

  console.log(`[Interviews] Lancement du serveur Python RAG sur port ${PYTHON_PORT} via ${pythonExec}...`);
  pythonProcess = spawn(pythonExec, ["-m", "src.web.server"], {
    cwd: ragDir,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    stdio: "inherit",
  });

  pythonProcess.on("error", (err) => {
    console.error("[Interviews] Erreur lors du lancement de Python RAG:", err);
  });

  // Wait for server readiness (max 10 seconds)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isPythonServerRunning()) {
      console.log("[Interviews] Serveur Python RAG prêt !");
      return;
    }
  }
}

export function registerInterviewsRoutes(app) {
  const projectRoot = path.resolve(process.cwd());

  app.post("/api/interviews/start", async (req, res) => {
    try {
      await ensurePythonServer(projectRoot);

      const postData = JSON.stringify(req.body || {});
      const proxyReq = http.request(
        {
          host: PYTHON_HOST,
          port: PYTHON_PORT,
          path: "/api/start",
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(postData),
          },
        },
        (proxyRes) => {
          let body = "";
          proxyRes.on("data", (chunk) => (body += chunk));
          proxyRes.on("end", () => {
            res.status(proxyRes.statusCode).type("application/json").send(body);
          });
        }
      );

      proxyReq.on("error", (err) => {
        console.error("[Interviews Proxy Error]", err);
        res.status(500).json({ error: "Impossible de contacter le service RAG d'entretien." });
      });

      proxyReq.write(postData);
      proxyReq.end();
    } catch (err) {
      console.error("[Interviews Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/interviews/message", async (req, res) => {
    try {
      await ensurePythonServer(projectRoot);

      const postData = JSON.stringify(req.body || {});
      const proxyReq = http.request(
        {
          host: PYTHON_HOST,
          port: PYTHON_PORT,
          path: "/api/message",
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(postData),
          },
        },
        (proxyRes) => {
          let body = "";
          proxyRes.on("data", (chunk) => (body += chunk));
          proxyRes.on("end", () => {
            res.status(proxyRes.statusCode).type("application/json").send(body);
          });
        }
      );

      proxyReq.on("error", (err) => {
        console.error("[Interviews Proxy Error]", err);
        res.status(500).json({ error: "Impossible de contacter le service RAG d'entretien." });
      });

      proxyReq.write(postData);
      proxyReq.end();
    } catch (err) {
      console.error("[Interviews Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post(
    "/api/interviews/audio-message",
    express.raw({ type: "*/*", limit: "50mb" }),
    async (req, res) => {
      try {
        await ensurePythonServer(projectRoot);

        const audioBuffer = req.body;
        const contentType = req.headers["content-type"] || "audio/webm";

        const proxyReq = http.request(
          {
            host: PYTHON_HOST,
            port: PYTHON_PORT,
            path: "/api/audio-message",
            method: "POST",
            headers: {
              "Content-Type": contentType,
              "Content-Length": audioBuffer ? audioBuffer.length : 0,
            },
          },
          (proxyRes) => {
            let body = "";
            proxyRes.on("data", (chunk) => (body += chunk));
            proxyRes.on("end", () => {
              res.status(proxyRes.statusCode).type("application/json").send(body);
            });
          }
        );

        proxyReq.on("error", (err) => {
          console.error("[Interviews Proxy Error]", err);
          res.status(500).json({ error: "Impossible de transcrire l'audio RAG." });
        });

        if (audioBuffer) {
          proxyReq.write(audioBuffer);
        }
        proxyReq.end();
      } catch (err) {
        console.error("[Interviews Audio Error]", err);
        res.status(500).json({ error: err.message });
      }
    }
  );
}

