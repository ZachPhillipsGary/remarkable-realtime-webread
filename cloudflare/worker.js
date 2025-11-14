/**
 * Cloudflare Worker for reMarkable Real-time Canvas
 * Uses Durable Objects for WebSocket state management
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // WebSocket upgrade request
    if (request.headers.get('Upgrade') === 'websocket') {
      // Get or create the Durable Object
      const id = env.CANVAS_ROOM.idFromName('default-room');
      const stub = env.CANVAS_ROOM.get(id);
      return stub.fetch(request);
    }

    // Serve static files
    if (url.pathname === '/') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (url.pathname === '/client.js') {
      return new Response(CLIENT_JS, {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};

/**
 * Durable Object for managing canvas room state
 */
export class CanvasRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
    this.canvasHistory = [];
    this.MAX_HISTORY = 1000;
  }

  async fetch(request) {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleSession(webSocket) {
    webSocket.accept();

    // Add to active sessions
    this.sessions.add(webSocket);

    // Send canvas history to new client
    webSocket.send(JSON.stringify({
      type: 'history',
      data: this.canvasHistory
    }));

    // Handle incoming messages
    webSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);

        // Add to history if it's a drawable element
        if (['stroke', 'image', 'text'].includes(data.type)) {
          this.canvasHistory.push(data);
          if (this.canvasHistory.length > this.MAX_HISTORY) {
            this.canvasHistory.shift();
          }

          // Persist to Durable Object storage periodically
          if (this.canvasHistory.length % 10 === 0) {
            await this.state.storage.put('canvasHistory', this.canvasHistory);
          }
        }

        if (data.type === 'clear') {
          this.canvasHistory = [];
          await this.state.storage.delete('canvasHistory');
        }

        // Broadcast to all other sessions
        this.broadcast(event.data, webSocket);
      } catch (err) {
        console.error('Error processing message:', err);
      }
    });

    // Handle close
    webSocket.addEventListener('close', () => {
      this.sessions.delete(webSocket);
    });

    // Handle errors
    webSocket.addEventListener('error', (err) => {
      console.error('WebSocket error:', err);
      this.sessions.delete(webSocket);
    });
  }

  broadcast(message, sender) {
    // Send to all sessions except the sender
    for (const session of this.sessions) {
      if (session !== sender && session.readyState === 1) {
        try {
          session.send(message);
        } catch (err) {
          console.error('Error broadcasting:', err);
          this.sessions.delete(session);
        }
      }
    }
  }

  async alarm() {
    // Periodic cleanup/save - called by Durable Objects alarms
    await this.state.storage.put('canvasHistory', this.canvasHistory);
  }
}

// Inline HTML content for serving the web client
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>reMarkable Real-time Canvas</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; overflow: hidden; background: #f0f0f0; }
        #toolbar {
            position: fixed; top: 0; left: 0; right: 0; background: #333; color: white;
            padding: 10px; display: flex; gap: 15px; align-items: center; z-index: 1000;
        }
        #toolbar label { display: flex; align-items: center; gap: 5px; }
        #status { margin-left: auto; padding: 5px 10px; border-radius: 3px; font-size: 12px; }
        #status.connected { background: #4CAF50; }
        #status.disconnected { background: #f44336; }
        #canvas-container { position: absolute; top: 50px; left: 0; right: 0; bottom: 0; overflow: auto; }
        #canvas { background: white; cursor: crosshair; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        button { background: #4CAF50; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 3px; }
        button:hover { background: #45a049; }
        input[type="color"] { width: 40px; height: 30px; border: none; cursor: pointer; }
        input[type="range"] { width: 100px; }
    </style>
</head>
<body>
    <div id="toolbar">
        <h3>reMarkable Canvas (Cloudflare)</h3>
        <label>Color: <input type="color" id="color" value="#000000"></label>
        <label>Width: <input type="range" id="width" min="1" max="20" value="2"> <span id="width-value">2</span>px</label>
        <button id="clear">Clear Canvas</button>
        <label><input type="checkbox" id="show-remote" checked> Show Remote Strokes</label>
        <div id="status" class="disconnected">Disconnected</div>
    </div>
    <div id="canvas-container">
        <canvas id="canvas" width="3000" height="3000"></canvas>
    </div>
    <script src="/client.js"></script>
</body>
</html>`;

const CLIENT_JS = `
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color');
const widthSlider = document.getElementById('width');
const widthValue = document.getElementById('width-value');
const clearBtn = document.getElementById('clear');
const showRemote = document.getElementById('show-remote');
const statusDiv = document.getElementById('status');

let isDrawing = false;
let currentStroke = [];
let currentColor = '#000000';
let currentWidth = 2;
let ws;
let reconnectInterval;

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        statusDiv.textContent = 'Connected';
        statusDiv.className = 'connected';
        clearInterval(reconnectInterval);
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        statusDiv.textContent = 'Disconnected';
        statusDiv.className = 'disconnected';
        reconnectInterval = setInterval(() => {
            console.log('Attempting to reconnect...');
            connect();
        }, 3000);
    };

    ws.onerror = (error) => console.error('WebSocket error:', error);

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleRemoteMessage(data);
        } catch (err) {
            console.error('Error parsing message:', err);
        }
    };
}

function handleRemoteMessage(data) {
    if (!showRemote.checked && data.type !== 'history') return;

    switch (data.type) {
        case 'history':
            data.data.forEach(item => {
                if (item.type === 'stroke') drawStroke(item.points, item.color, item.width);
            });
            break;
        case 'stroke':
            drawStroke(data.points, data.color, data.width);
            break;
        case 'clear':
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            break;
    }
}

function drawStroke(points, color, width) {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
}

function sendStroke(points, color, width) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'stroke',
            points: points,
            color: color,
            width: width,
            timestamp: Date.now()
        }));
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    startDrawing({ offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    draw({ offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
});

function startDrawing(e) {
    isDrawing = true;
    currentStroke = [[e.offsetX, e.offsetY]];
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
    if (!isDrawing) return;
    const point = [e.offsetX, e.offsetY];
    currentStroke.push(point);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(point[0], point[1]);
    ctx.stroke();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke.length > 1) {
        sendStroke(currentStroke, currentColor, currentWidth);
    }
    currentStroke = [];
}

colorPicker.addEventListener('change', (e) => { currentColor = e.target.value; });
widthSlider.addEventListener('input', (e) => {
    currentWidth = parseInt(e.target.value);
    widthValue.textContent = currentWidth;
});

clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'clear', timestamp: Date.now() }));
    }
});

connect();
`;
