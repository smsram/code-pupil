const http = require("http");
const httpProxy = require("http-proxy");

// Proxy target
const TARGET = "http://zeus.hidencloud.com:24650"; // your hidden cloud server

// Create proxy server
const proxy = httpProxy.createProxyServer({
  target: TARGET,
  ws: true, // enable WebSocket proxying
  changeOrigin: true,
});

// Create HTTP server
const server = http.createServer((req, res) => {
  proxy.web(req, res, (err) => {
    console.error("HTTP proxy error:", err);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad gateway");
  });
});

// Handle WebSocket upgrades
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, (err) => {
    console.error("WebSocket proxy error:", err);
    socket.destroy();
  });
});

// Start server
const PORT = process.env.PORT || 4000; // Render provides PORT
server.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
  console.log(`✅ Proxying to: ${TARGET}`);
});
