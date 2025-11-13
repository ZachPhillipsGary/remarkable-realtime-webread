// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color');
const widthSlider = document.getElementById('width');
const widthValue = document.getElementById('width-value');
const clearBtn = document.getElementById('clear');
const showRemote = document.getElementById('show-remote');
const statusDiv = document.getElementById('status');

// Drawing state
let isDrawing = false;
let currentStroke = [];
let currentColor = '#000000';
let currentWidth = 2;

// WebSocket connection
let ws;
let reconnectInterval;

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

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

        // Reconnect after 3 seconds
        reconnectInterval = setInterval(() => {
            console.log('Attempting to reconnect...');
            connect();
        }, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

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
    if (!showRemote.checked && data.type !== 'history') {
        return;
    }

    switch (data.type) {
        case 'history':
            // Redraw canvas with history
            data.data.forEach(item => {
                if (item.type === 'stroke') {
                    drawStroke(item.points, item.color, item.width);
                }
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

// Canvas event handlers
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

// Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    startDrawing({ offsetX: x, offsetY: y });
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    draw({ offsetX: x, offsetY: y });
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

// Toolbar handlers
colorPicker.addEventListener('change', (e) => {
    currentColor = e.target.value;
});

widthSlider.addEventListener('input', (e) => {
    currentWidth = parseInt(e.target.value);
    widthValue.textContent = currentWidth;
});

clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'clear',
            timestamp: Date.now()
        }));
    }
});

// Initialize
connect();
console.log('Client initialized');
