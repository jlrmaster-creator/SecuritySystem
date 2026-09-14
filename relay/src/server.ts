import * as http from 'http';
import { WebSocketServer } from 'ws';
import { setupRelay } from './relay';
import { startTTLSweeper } from './ttl';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

// Setup relay logic
setupRelay(wss);

// Start background task to clean up expired data
startTTLSweeper();

// Start server
server.listen(PORT, () => {
  console.log(`[Server] Relay listening on port ${PORT}`);
});
