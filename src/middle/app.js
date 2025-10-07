const express = require("express");
const http = require("http");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { Server } = require("socket.io");
const { io: Client } = require("socket.io-client");

const app = express();
app.use(cors());
app.use(express.json());

// === CONFIG ===
const BACKEND_URL = "http://zeus.hidencloud.com:24650"; // Your actual tunnel target

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

// === CREATE SERVER + SOCKET.IO ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
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

// === FRONTEND SOCKET HANDLING ===
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // Forward messages from client → backend
  socket.on("client-event", (data) => {
    backendSocket.emit("client-event", data);
  });

  // Forward messages from backend → client
  backendSocket.on("server-event", (data) => {
    socket.emit("server-event", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// === START SERVER ===
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🌐 Proxy Gateway running on port ${PORT}`);
  console.log(`🌐 HTTP requests: http://localhost:${PORT}/api/...`);
  console.log(`🌐 Socket.IO endpoint: ws://localhost:${PORT}`);
});
