# reMarkable Real-time Canvas

A proof-of-concept real-time collaborative canvas application that enables live drawing synchronization between a reMarkable tablet and web browsers using WebSockets.

## Features

### Core Functionality
- **Real-time Synchronization**: Draw on reMarkable or web browser and see updates instantly on all connected clients
- **Large Canvas**: 3000x3000px canvas for extensive drawing space with scroll support
- **Multi-client Support**: Multiple web browsers and reMarkable devices can connect simultaneously
- **Auto-reconnect**: Automatic reconnection when network connection is lost (3-second intervals)
- **Canvas History**: New clients receive existing canvas state on connection (up to 1000 elements)
- **Touch & Stylus Support**: Full support for reMarkable pen input and web touch events

### Web Client Features
- **Color Picker**: Full spectrum color selection with visual color display
- **Adjustable Brush Width**: Slider control (1-20px) with live value indicator
- **Clear Canvas**: Button to clear entire canvas and broadcast to all clients
- **Remote Strokes Toggle**: Checkbox to show/hide strokes from other clients
- **Connection Status**: Visual indicator showing real-time connection state (green/red)
- **Touch-Optimized**: Prevents default touch behavior for smooth mobile drawing
- **Responsive UI**: Dark toolbar with hover effects and crosshair cursor

### reMarkable Client Features
- **Command-line Configuration**: `--server` / `-s` option to specify WebSocket server URL
- **Connection Indicator**: Visual status circle (green/red) in top-right corner
- **Optimized Rendering**: Dirty rectangle updates for efficient e-ink refresh
- **Full-screen Mode**: Maximizes drawing space on reMarkable display
- **Default Pen Settings**: Black color, 2px width with round line caps

### Server Features
- **Health Check Endpoint**: `/health` endpoint showing server status, connected clients, and history size
- **Canvas History Management**: FIFO queue storing last 1000 canvas elements
- **Smart Broadcasting**: Messages not echoed back to originating client
- **Message Types**: Full support for stroke, clear, image*, and text* events
- **Configurable Port**: Environment variable PORT configuration (default: 8080)
- **Network Accessible**: Listens on 0.0.0.0 for WiFi and USB connections

*Note: Image and text message types are supported by server infrastructure but not yet rendered by clients

## Architecture

```
┌─────────────────┐
│  reMarkable     │
│  Qt/C++ Client  │◄─────┐
└─────────────────┘      │
                         │
┌─────────────────┐      │    ┌──────────────────┐
│  Web Browser 1  │◄─────┼───►│  WebSocket       │
│  HTML5 Canvas   │      │    │  Server          │
└─────────────────┘      │    │  (Node.js)       │
                         │    └──────────────────┘
┌─────────────────┐      │
│  Web Browser 2  │◄─────┘
│  HTML5 Canvas   │
└─────────────────┘
```

## Components

1. **WebSocket Server** (`server/index.js`)
   - Node.js server with Express and `ws` library
   - Broadcasts drawing events to all connected clients
   - Maintains canvas history for new clients

2. **Web Client** (`public/`)
   - HTML5 Canvas-based drawing interface
   - Vanilla JavaScript WebSocket client
   - Touch and mouse input support

3. **reMarkable Client** (`remarkable-client/`)
   - Qt/C++ application using Qt WebSockets
   - Direct framebuffer rendering
   - Native stylus input handling

## Prerequisites

- **Docker** - for cross-compiling the reMarkable application
- **Node.js** - v14 or higher for the WebSocket server
- **SSH access to reMarkable** - to deploy the application
- **reMarkable tablet** - tested on reMarkable 1/2 (armv7)

## Quick Start

### 1. Clone and Build

```bash
# Clone the repository
git clone <repository-url>
cd remarkable-realtime-webread

# Build Docker image with reMarkable toolchain
make build-docker

# Build reMarkable application
make build-remarkable

# Install server dependencies
make build-server
```

### 2. Start the Server

```bash
# Start WebSocket server (default port 8080)
make run-server

# Server will be available at:
# - WebSocket: ws://localhost:8080
# - Web UI: http://localhost:8080
```

### 3. Deploy to reMarkable

First, enable SSH on your reMarkable:
1. Go to **Settings > Help > Copyrights and licenses**
2. Tap on the GPLv3 compliance section
3. Note the IP address and password shown

Then deploy:

```bash
# Deploy application (replace with your reMarkable's IP)
make deploy REMARKABLE_IP=10.11.99.1

# SSH into reMarkable
ssh root@10.11.99.1

# Run the application (replace SERVER_IP with your server's IP)
./remarkable-canvas -s ws://192.168.1.100:8080
```

### 4. Test It Out

1. Open a web browser to `http://localhost:8080`
2. Draw on the web canvas
3. See the drawing appear on reMarkable in real-time!
4. Draw on reMarkable and see it appear in the browser

## Detailed Build Instructions

### Building with Docker

The Docker container includes the official reMarkable toolchain with Qt libraries:

```bash
# Build Docker image (one-time setup)
docker build -t remarkable-canvas-build .

# Build the application
docker run --rm \
  -v $(pwd)/remarkable-client:/workspace/remarkable-client \
  -v $(pwd)/build:/workspace/build \
  remarkable-canvas-build \
  /bin/bash -c "source /opt/remarkable-toolchain/environment-setup-cortexa9hf-neon-oe-linux-gnueabi && \
  mkdir -p /workspace/build && \
  cd /workspace/build && \
  qmake ../remarkable-client/remarkable-canvas.pro && \
  make"
```

Or simply use:
```bash
make build-remarkable
```

### Manual Build (without Docker)

If you have the reMarkable toolchain installed locally:

```bash
# Source the toolchain environment
source /opt/remarkable-toolchain/environment-setup-cortexa9hf-neon-oe-linux-gnueabi

# Build
mkdir -p build
cd build
qmake ../remarkable-client/remarkable-canvas.pro
make
```

## Usage

### Server Options

```bash
# Start server on custom port
PORT=3000 npm start

# View server status and connected clients
curl http://localhost:8080/health

# Example health check response:
# {
#   "status": "ok",
#   "clients": 3,
#   "historySize": 42
# }
```

### reMarkable Client Options

```bash
# Specify WebSocket server URL
./remarkable-canvas -s ws://192.168.1.100:8080
./remarkable-canvas --server ws://192.168.1.100:8080

# Show help
./remarkable-canvas --help

# Show version
./remarkable-canvas --version
```

### Build System (Makefile)

The project includes a comprehensive Makefile with multiple targets:

```bash
# Display all available commands
make help

# Build commands
make build-docker          # Build Docker image with reMarkable toolchain
make build-remarkable      # Cross-compile Qt application
make build-server          # Install Node.js dependencies

# Run commands
make run-server           # Start WebSocket server

# Deployment
make deploy REMARKABLE_IP=10.11.99.1  # Deploy to reMarkable via SCP

# Maintenance
make clean                # Remove build artifacts and node_modules
make quickstart           # Display quick start guide
```

**Configurable Variables:**
- `REMARKABLE_IP` - Target reMarkable IP address (default: 10.11.99.1)
- `SERVER_PORT` - WebSocket server port (default: 8080)
- `DOCKER_IMAGE` - Docker image name (default: remarkable-canvas-build)

### Network Configuration

For reMarkable to connect to your server:

1. **USB Connection**: When connected via USB, reMarkable is at `10.11.99.1`
   - Your computer is at `10.11.99.2` from reMarkable's perspective
   - Use: `./remarkable-canvas -s ws://10.11.99.2:8080`

2. **WiFi Connection**: When on the same WiFi network
   - Find your computer's IP: `ifconfig` or `ipconfig`
   - Use that IP on reMarkable: `./remarkable-canvas -s ws://192.168.1.100:8080`

## Protocol

The application uses a simple JSON protocol over WebSockets. All messages include timestamps in milliseconds since epoch.

### Stroke Event (client → server → broadcast)
```json
{
  "type": "stroke",
  "points": [[x1, y1], [x2, y2], ...],
  "color": "#000000",
  "width": 2,
  "timestamp": 1234567890
}
```
- Sent when a complete stroke is finished (mouseup/touchend)
- Server broadcasts to all clients except sender
- Automatically added to canvas history

### Clear Event (client → server → broadcast)
```json
{
  "type": "clear",
  "timestamp": 1234567890
}
```
- Clears entire canvas for all connected clients
- Removes all elements from server history

### History Event (server → client on connect)
```json
{
  "type": "history",
  "data": [
    {"type": "stroke", "points": [...], "color": "#000000", "width": 2, "timestamp": 1234567890},
    {"type": "stroke", "points": [...], "color": "#ff0000", "width": 5, "timestamp": 1234567891}
  ]
}
```
- Sent automatically when a new client connects
- Contains up to 1000 most recent canvas elements (FIFO queue)
- Allows new clients to see existing canvas content

### Image Event* (infrastructure only)
```json
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "position": {"x": 100, "y": 100},
  "timestamp": 1234567890
}
```
*Server accepts and stores in history, but clients don't render yet

### Text Event* (infrastructure only)
```json
{
  "type": "text",
  "content": "Hello, world!",
  "position": {"x": 100, "y": 100},
  "font": "Arial",
  "size": 14,
  "timestamp": 1234567890
}
```
*Server accepts and stores in history, but clients don't render yet

## Development

### Technical Implementation Details

**Canvas Configuration:**
- **Size**: 3000x3000 pixels (both web and reMarkable clients)
- **Format**: RGB32 for reMarkable (Qt), 2d context for web
- **Rendering**: Immediate local draw + remote broadcast on stroke completion

**Drawing Implementation:**
- **Stroke Collection**: Points collected during mouse/touch movement
- **Stroke Transmission**: Full stroke sent on mouseup/touchend (not per-point)
- **Line Style**: Round caps and round joins for smooth appearance
- **Default Settings**: Black color (#000000), 2px width

**Network Protocol:**
- **WebSocket Library**: `ws` v8.14.2 (Node.js server), Qt WebSockets (reMarkable)
- **Message Format**: JSON with type, data, and timestamp fields
- **Broadcasting**: Server sends to all clients except message originator
- **Reconnection**: 3-second timer on both web and reMarkable clients
- **History Transfer**: Complete on every successful connection

**Performance Optimizations:**
- **Dirty Rectangle Updates**: reMarkable only repaints changed areas
- **Static Contents Flag**: Qt optimization for reduced redraws
- **History Limit**: FIFO queue capped at 1000 elements to prevent memory growth
- **Touch Prevention**: Web client prevents default touch behavior for better performance

**Build System:**
- **Toolchain**: Zero Gravitas 1.8-23.9.2019 (armv7 for reMarkable 1/2)
- **Cross-compilation**: Docker container with Qt 5.x and armv7 toolchain
- **Target Architecture**: cortexa9hf-neon-oe-linux-gnueabi
- **Deployment**: SCP over SSH to /home/root on reMarkable

### Web Client UI Guide

The web interface (`http://localhost:8080`) provides a full-featured drawing experience:

**Toolbar Controls (top of page):**
- **Color Picker**: Click the color input to select any color from the spectrum
- **Brush Width Slider**: Adjust from 1-20px (current value displayed next to slider)
- **Clear Canvas Button**: Removes all strokes for all connected clients
- **Show Remote Strokes**: Toggle checkbox to hide/show drawings from other users
- **Connection Status**: Real-time indicator (🟢 Connected / 🔴 Disconnected)

**Canvas Interaction:**
- **Drawing**: Click/tap and drag to draw
- **Multi-touch**: Prevent default touch behavior for smooth mobile drawing
- **Scroll**: Large 3000x3000px canvas with automatic scroll support
- **Cursor**: Crosshair cursor for precise drawing

**Connection Behavior:**
- Auto-connect on page load to `ws://[current-host]:8080`
- Auto-reconnect every 3 seconds if connection drops
- Canvas history automatically loaded on successful connection

### Project Structure

```
.
├── server/
│   └── index.js              # WebSocket server
├── public/
│   ├── index.html            # Web client UI
│   └── client.js             # Web client logic
├── remarkable-client/
│   ├── remarkable-canvas.pro # Qt project file
│   ├── main.cpp              # Entry point
│   ├── canvaswidget.h/cpp    # Canvas widget
│   └── websocketclient.h/cpp # WebSocket client
├── Dockerfile                # Cross-compilation environment
├── Makefile                  # Build automation
└── package.json              # Node.js dependencies
```

### Extending the Application

#### Adding Image Support (Client Rendering)

The server already accepts and stores image events in history. To complete the feature:

1. **Web Client** (`public/client.js`):
   - Add handler for `message.type === 'image'`
   - Decode base64 image data
   - Draw image to canvas at specified position using `ctx.drawImage()`

2. **reMarkable Client** (`canvaswidget.cpp`):
   - Add handler in `handleCanvasMessage()` for image type
   - Decode base64 data using `QByteArray::fromBase64()`
   - Create QPixmap from data
   - Draw to canvas using QPainter

3. **UI for Image Upload**:
   - Add file input in web client
   - Convert uploaded image to base64
   - Send image event with position data

#### Adding Text Support (Client Rendering)

The server already accepts and stores text events in history. To complete the feature:

1. **Web Client** (`public/client.js`):
   - Add handler for `message.type === 'text'`
   - Use `ctx.fillText()` or `ctx.strokeText()` to render
   - Apply font, size, and color from message

2. **reMarkable Client** (`canvaswidget.cpp`):
   - Add handler in `handleCanvasMessage()` for text type
   - Use QPainter::drawText() with QFont from message
   - Position text at specified coordinates

3. **UI for Text Input**:
   - Add text input field and "Add Text" button
   - Send text event with content, position, and styling

#### Implementing CRDT

For better conflict resolution in collaborative editing:
1. Assign unique IDs to each stroke
2. Implement operation transforms
3. Use libraries like Yjs or Automerge

## Troubleshooting

### reMarkable Can't Connect

- Verify network connectivity: `ping <server-ip>` from reMarkable
- Check firewall settings on server
- Ensure server is listening on `0.0.0.0`, not `127.0.0.1`

### Build Fails

- Ensure Docker is running: `docker ps`
- Clean and rebuild: `make clean && make build-remarkable`
- Check toolchain download in Dockerfile

### Application Crashes on reMarkable

- Check logs via SSH: `journalctl -f`
- Run with debugging: `QT_DEBUG_PLUGINS=1 ./remarkable-canvas`
- Verify Qt libraries are available: `ldd ./remarkable-canvas`

## Known Limitations

- **E-ink Refresh**: The application uses standard Qt drawing which may not optimize for e-ink refresh rates
- **Performance**: Large canvases with many strokes may slow down
- **No Persistence**: Canvas state is lost when server restarts
- **History Limit**: Server stores only last 1000 canvas elements; older content is lost
- **Image/Text Support**: Server infrastructure exists but clients don't render images or text yet
- **reMarkable Paper Pro**: Requires recompilation for aarch64 architecture
- **No Authentication**: Anyone who can reach the server can draw on the shared canvas
- **No Undo/Redo**: Once a stroke is drawn, it can only be removed by clearing the entire canvas

## Future Improvements

### High Priority
- [ ] **Complete Image Support**: Add client-side rendering for images (server infrastructure ready)
- [ ] **Complete Text Support**: Add client-side rendering for text (server infrastructure ready)
- [ ] **Undo/Redo**: Implement stroke history with undo/redo capability
- [ ] **Eraser Tool**: Add ability to remove individual strokes

### Performance & Optimization
- [ ] **E-ink Refresh Optimization**: Implement DU mode for faster reMarkable drawing
- [ ] **Persistent Storage**: Save canvas to database or file system for server restarts
- [ ] **Configurable History Limit**: Allow adjustment of 1000 element limit
- [ ] **Stroke Compression**: Reduce bandwidth with point simplification algorithms

### Advanced Features
- [ ] **Pressure Sensitivity**: Implement Wacom digitizer pressure data for variable width strokes
- [ ] **Pan/Zoom**: Add infinite canvas navigation with touch gestures
- [ ] **Layers**: Support multiple drawing layers with visibility toggle
- [ ] **Export**: Save canvas as PNG, SVG, or PDF
- [ ] **Collaborative Cursors**: Show other users' cursor positions in real-time

### Platform & Architecture
- [ ] **reMarkable Paper Pro Support**: Add aarch64 compilation support
- [ ] **Offline Mode**: Queue operations when disconnected and sync on reconnect
- [ ] **Authentication**: Add user authentication and per-user canvases
- [ ] **Multiple Rooms**: Support separate collaborative sessions/rooms
- [ ] **HTTPS/WSS**: Add TLS support for secure connections

## References

- [reMarkable Guide](https://remarkable.guide/)
- [reMarkable Toolchain](https://remarkable.engineering/)
- [Qt WebSockets Documentation](https://doc.qt.io/qt-5/qtwebsockets-index.html)
- [Awesome reMarkable](https://github.com/reHackable/awesome-reMarkable)

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
