const http = require("http");

// Create the server with Express app
const server = http.createServer(app);

// Socket.IO
const io = new (require("socket.io").Server)(server, {
  cors: { origin: "*" },
});

// Your backend Socket.IO connection
const { io: Client } = require("socket.io-client");
const BACKEND_URL = "https://zeus.hidencloud.com:24650";
const backendSocket = Client(BACKEND_URL, { transports: ["websocket"], reconnection: true });

backendSocket.on("connect", () => console.log("✅ Connected to backend socket!"));
backendSocket.on("disconnect", () => console.log("⚠️ Disconnected from backend socket"));

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  socket.on("client-event", (data) => backendSocket.emit("client-event", data));
  backendSocket.on("server-event", (data) => socket.emit("server-event", data));
  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// Listen on PORT
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🌐 Proxy Gateway running on port ${PORT}`);
});
