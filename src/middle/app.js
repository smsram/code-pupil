// pages/api/proxy.js (CommonJS version)
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { Server: IOServer } = require("socket.io");
const { io: Client } = require("socket.io-client");

const app = express();
app.use(cors());
app.use(express.json());

// === CONFIG ===
const BACKEND_URL = "https://zeus.hidencloud.com:24650"; // Use HTTPS

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
module.exports = (req, res) => {
  if (!io) {
    // Create Socket.IO server once
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
};
