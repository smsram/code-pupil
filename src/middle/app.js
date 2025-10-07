// pages/api/proxy.js (or api/proxy.js for Vercel serverless)
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { Server as IOServer } from "socket.io";
import { io as Client } from "socket.io-client";

const app = express();
app.use(cors());
app.use(express.json());

// === CONFIG ===
const BACKEND_URL = "https://zeus.hidencloud.com:24650"; // Use HTTPS if backend supports it

// === EXPRESS PROXY FOR HTTP REQUESTS ===
app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
    onError(err, req, res) {
      console.error("Proxy error:", err.message);
      res.status(500).json({ error: "Backend unreachable" });
    },
  })
);

// === SOCKET.IO HANDLING ===
let io;
export default function handler(req, res) {
  if (!io) {
    // Vercel doesn't allow persistent servers, but we can attach Socket.IO once
    io = new IOServer({
      cors: { origin: "*" },
      path: "/api/socket.io",
    });

    console.log("Connecting to backend socket:", BACKEND_URL);
    const backendSocket = Client(BACKEND_URL, {
      reconnection: true,
      transports: ["websocket"],
    });

    backendSocket.on("connect", () => {
      console.log("✅ Connected to backend socket!");
    });

    backendSocket.on("disconnect", () => {
      console.log("⚠️ Disconnected from backend socket");
    });

    io.on("connection", (socket) => {
      console.log("🟢 Client connected:", socket.id);

      socket.on("client-event", (data) => {
        backendSocket.emit("client-event", data);
      });

      backendSocket.on("server-event", (data) => {
        socket.emit("server-event", data);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
      });
    });
  }

  app(req, res);
}
