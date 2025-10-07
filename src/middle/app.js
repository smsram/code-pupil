import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { io as ClientSocket } from "socket.io-client";

const app = express();
app.use(express.json());

// === CONFIG ===
// This is your backend HTTP server (zeus.hidencloud.com)
const BACKEND_URL = process.env.BACKEND_URL || "http://zeus.hidencloud.com:24650";

// === CORS ===
// Allow Vercel frontend or any frontend
app.use(
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // replace "*" with your domain in production
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    next();
  }
);

// === PROXY FOR HTTP REQUESTS ===
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

// === SOCKET.IO SERVER ===
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: "*", // replace "*" with your Vercel frontend domain
    methods: ["GET", "POST"],
  },
});

// Connect to backend Socket.IO server
console.log("Connecting to backend socket:", BACKEND_URL);
const backendSocket = ClientSocket(BACKEND_URL, {
  transports: ["websocket"],
  reconnection: true,
});

backendSocket.on("connect", () => console.log("✅ Connected to backend socket"));
backendSocket.on("disconnect", () => console.log("⚠️ Disconnected from backend socket"));
backendSocket.on("connect_error", (err) => console.error("❌ Backend socket error:", err.message));

// Forward messages between frontend clients and backend
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // Client → Backend
  socket.on("client-event", (data) => {
    backendSocket.emit("client-event", data);
  });

  // Backend → Client
  backendSocket.on("server-event", (data) => {
    socket.emit("server-event", data);
  });

  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// === START SERVER ===
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🌐 Proxy Gateway running on port ${PORT}`);
  console.log(`🌐 HTTP requests: https://<your-proxy-url>/api/...`);
  console.log(`🌐 Socket.IO endpoint: wss://<your-proxy-url>`);
});
