# reMarkable Real-time Canvas

A proof-of-concept real-time collaborative canvas application that enables live drawing synchronization between a reMarkable tablet and web browsers using WebSockets.

## Features

- **Real-time Synchronization**: Draw on reMarkable or web browser and see updates instantly on all connected clients
- **Infinite Canvas**: Large canvas (3000x3000px) for extensive drawing space
- **Multi-client Support**: Multiple web browsers and reMarkable devices can connect simultaneously
- **Auto-reconnect**: Automatic reconnection when network connection is lost
- **Canvas History**: New clients receive existing canvas state on connection
- **Touch & Stylus Support**: Full support for reMarkable pen input and web touch events

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

# View server status
curl http://localhost:8080/health
```

### reMarkable Client Options

```bash
# Specify WebSocket server URL
./remarkable-canvas -s ws://192.168.1.100:8080

# Show help
./remarkable-canvas --help
```

### Network Configuration

For reMarkable to connect to your server:

1. **USB Connection**: When connected via USB, reMarkable is at `10.11.99.1`
   - Your computer is at `10.11.99.2` from reMarkable's perspective
   - Use: `./remarkable-canvas -s ws://10.11.99.2:8080`

2. **WiFi Connection**: When on the same WiFi network
   - Find your computer's IP: `ifconfig` or `ipconfig`
   - Use that IP on reMarkable: `./remarkable-canvas -s ws://192.168.1.100:8080`

## Protocol

The application uses a simple JSON protocol over WebSockets:

### Stroke Event
```json
{
  "type": "stroke",
  "points": [[x1, y1], [x2, y2], ...],
  "color": "#000000",
  "width": 2,
  "timestamp": 1234567890
}
```

### Clear Event
```json
{
  "type": "clear",
  "timestamp": 1234567890
}
```

### History Event (server → client on connect)
```json
{
  "type": "history",
  "data": [/* array of stroke/image/text events */]
}
```

## Development

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

#### Adding Image Support

1. Update protocol to include `image` type
2. Add image rendering in both clients
3. Handle base64 encoding/decoding

#### Adding Text Support

1. Update protocol to include `text` type with position and content
2. Add text rendering in CanvasWidget and web client
3. Add text input UI

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
- **reMarkable Paper Pro**: Requires recompilation for aarch64 architecture

## Future Improvements

- [ ] Implement proper e-ink refresh optimization (DU mode for drawing)
- [ ] Add persistent storage (database or file-based)
- [ ] Implement pressure sensitivity from Wacom digitizer
- [ ] Add eraser tool
- [ ] Implement pan/zoom for infinite canvas navigation
- [ ] Add authentication for multi-user scenarios
- [ ] Support for reMarkable Paper Pro (aarch64)
- [ ] Offline mode with sync queue

## References

- [reMarkable Guide](https://remarkable.guide/)
- [reMarkable Toolchain](https://remarkable.engineering/)
- [Qt WebSockets Documentation](https://doc.qt.io/qt-5/qtwebsockets-index.html)
- [Awesome reMarkable](https://github.com/reHackable/awesome-reMarkable)

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
