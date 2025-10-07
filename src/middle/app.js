const https = require("https");
const fs = require("fs");
const httpProxy = require("http-proxy");

// Load TLS cert
const options = {
  key: fs.readFileSync("./privkey.pem"),
  cert: fs.readFileSync("./fullchain.pem"),
};

// Proxy config
const proxy = httpProxy.createProxyServer({
  target: "http://zeus.hidencloud.com:24650", // your hidden cloud server
  ws: true,
});

// HTTPS server
const server = https.createServer(options, (req, res) => {
  proxy.web(req, res);
});

// WebSocket upgrade
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(443, () => {
  console.log("✅ Proxy running on https://yourdomain.com");
});
