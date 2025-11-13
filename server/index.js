const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Store connected clients
const clients = new Set();

// Canvas state - store recent strokes for new clients
const canvasHistory = [];
const MAX_HISTORY = 1000;

wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send canvas history to new client
  ws.send(JSON.stringify({
    type: 'history',
    data: canvasHistory
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);

      // Add to history if it's a drawable element
      if (['stroke', 'image', 'text'].includes(data.type)) {
        canvasHistory.push(data);
        if (canvasHistory.length > MAX_HISTORY) {
          canvasHistory.shift();
        }
      }

      // Broadcast to all clients except sender
      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    clients: clients.size,
    historySize: canvasHistory.length
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
