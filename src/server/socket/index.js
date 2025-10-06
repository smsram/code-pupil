import 'dotenv/config';
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { initializeSocketServer } = require("./socket/code-runner.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 24650;
const JDK_FOLDER = path.join(__dirname, 'jdk-21');
const JAVA_BIN = path.join(JDK_FOLDER, 'bin', 'java');
const JAVAC_BIN = path.join(JDK_FOLDER, 'bin', 'javac');

// Check Java
const javaCheck = spawnSync(JAVA_BIN, ['-version'], { stdio: 'inherit' });
if (javaCheck.error) {
  console.warn('⚠ Java not found in jdk-21 folder. Make sure it is present.');
} else {
  console.log('✅ Java is ready');
}

const app = express();

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: "*/*", limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get("/health", (req, res) => {
  res.json({ status: "healthy", message: "Server is running!" });
});

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

const server = http.createServer(app);
initializeSocketServer(server, JAVA_BIN, JAVAC_BIN);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ CodeSphere API running on http://localhost:${PORT}`);
  console.log(`✅ Code Runner WebSocket available at ws://localhost:${PORT}/code-runner`);
});
