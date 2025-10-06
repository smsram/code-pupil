require('dotenv').config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const authRouter = require("./routes/auth");
const testRouter = require("./routes/test");
const settingsRouter = require("./routes/settings");
const notificationRouter = require("./routes/notifications");
const { initializeSocketServer } = require("./socket/code-runner.js");

const app = express();
const PORT = process.env.PORT || 4000;

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }))
app.use(express.raw({ type: "*/*", limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use("/auth", authRouter);
app.use("/test", testRouter);
app.use("/settings", settingsRouter);
app.use("/notifications", notificationRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", message: "Server is running!" });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// Create one HTTP server
const server = http.createServer(app);

// Attach socket server to this HTTP server
initializeSocketServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`✅ CodeSphere API running on http://localhost:${PORT}`);
  console.log(`✅ Code Runner WebSocket available at ws://localhost:${PORT}/code-runner`);
});
