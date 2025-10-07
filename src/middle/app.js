// app.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { Server: IOServer } = require("socket.io");
const { io: Client } = require("socket.io-client");

// === EXPRESS APP ===
const app = express();
app.use(cors());
app.use(express.json());

// === CONFIG ===
const BACKEND_URL = "https://zeus.hidencloud.com:24650"; // HTTPS backend

// === HTTP PROXY ===
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

// === CREATE HTTP SERVER ===
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// === SOCKET.IO SERVER ===
const io = new IOServer(server, { cors: { origin: "*" } });

// === BACKEND SOCKET CONNECTION ===
const backendSocket = Client(BACKEND_URL, {
  reconnection: true,
  transports: ["websocket"],
});

backendSocket.on("connect", () => console.log("✅ Connected to backend socket!"));
backendSocket.on("disconnect", () => console.log("⚠️ Disconnected from backend socket"));

// === CLIENT SOCKET CONNECTION ===
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("client-event", (data) => backendSocket.emit("client-event", data));

  backendSocket.on("server-event", (data) => socket.emit("server-event", data));

  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// === START SERVER ===
server.listen(PORT, () => {
  console.log(`🌐 Proxy Gateway running on port ${PORT}`);
  console.log(`🌐 HTTP proxy: http://localhost:${PORT}/api/...`);
});
