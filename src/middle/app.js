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
const BACKEND_URL = "http://zeus.hidencloud.com:24650"; // HTTP backend
const FRONTEND_PREFIX = "/api"; // All client calls go through this

// === PROXY SETUP ===
app.use(
  FRONTEND_PREFIX,
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: { [`^${FRONTEND_PREFIX}`]: "" },
    secure: false, // allows HTTP target
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
  transports: ["websocket"],
  reconnection: true,
});

backendSocket.on("connect", () => console.log("✅ Connected to backend socket!"));
backendSocket.on("disconnect", () => console.log("⚠️ Disconnected from backend socket"));

// === CLIENT SOCKET CONNECTION ===
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // forward client events to backend
  socket.on("client-event", (data) => backendSocket.emit("client-event", data));

  // forward backend events to client
  backendSocket.on("server-event", (data) => socket.emit("server-event", data));

  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// === START SERVER ===
server.listen(PORT, () => {
  console.log(`🌐 Middle server running on port ${PORT}`);
  console.log(`🌐 Proxy available at https://<your-domain>${FRONTEND_PREFIX}/...`);
});
