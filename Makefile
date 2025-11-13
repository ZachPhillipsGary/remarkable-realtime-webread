# Makefile for reMarkable Real-time Canvas

# Configuration
DOCKER_IMAGE = remarkable-canvas-build
SERVER_PORT = 8080
REMARKABLE_IP ?= 10.11.99.1
REMARKABLE_USER = root

.PHONY: help build-docker build-remarkable build-server run-server deploy clean

help:
	@echo "reMarkable Real-time Canvas - Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  build-docker      - Build Docker image for cross-compilation"
	@echo "  build-remarkable  - Build reMarkable Qt application"
	@echo "  build-server      - Install Node.js dependencies for server"
	@echo "  run-server        - Run WebSocket server locally"
	@echo "  deploy            - Deploy reMarkable app to device"
	@echo "  clean             - Clean build artifacts"
	@echo ""
	@echo "Variables:"
	@echo "  REMARKABLE_IP     - IP of reMarkable device (default: 10.11.99.1)"
	@echo "  SERVER_PORT       - WebSocket server port (default: 8080)"

# Build Docker image with toolchain
build-docker:
	@echo "Building Docker image with reMarkable toolchain..."
	docker build -t $(DOCKER_IMAGE) .

# Build reMarkable Qt application
build-remarkable: build-docker
	@echo "Building reMarkable application..."
	docker run --rm \
		-v $(PWD)/remarkable-client:/workspace/remarkable-client \
		-v $(PWD)/build:/workspace/build \
		$(DOCKER_IMAGE) \
		/bin/bash -c "source /opt/remarkable-toolchain/environment-setup-cortexa9hf-neon-oe-linux-gnueabi && \
		mkdir -p /workspace/build && \
		cd /workspace/build && \
		qmake ../remarkable-client/remarkable-canvas.pro && \
		make"
	@echo "Build complete! Binary at: build/remarkable-canvas"

# Install server dependencies
build-server:
	@echo "Installing Node.js dependencies..."
	npm install

# Run WebSocket server
run-server: build-server
	@echo "Starting WebSocket server on port $(SERVER_PORT)..."
	@echo "Web interface: http://localhost:$(SERVER_PORT)"
	npm start

# Deploy to reMarkable device
deploy: build-remarkable
	@echo "Deploying to reMarkable at $(REMARKABLE_IP)..."
	@echo "Make sure your reMarkable is connected and SSH is enabled!"
	scp build/remarkable-canvas $(REMARKABLE_USER)@$(REMARKABLE_IP):/home/root/
	@echo ""
	@echo "Deployment complete!"
	@echo "To run on reMarkable, SSH in and execute:"
	@echo "  ssh $(REMARKABLE_USER)@$(REMARKABLE_IP)"
	@echo "  ./remarkable-canvas -s ws://YOUR_SERVER_IP:$(SERVER_PORT)"

# Clean build artifacts
clean:
	rm -rf build/
	rm -rf node_modules/
	@echo "Clean complete!"

# Quick start guide
quickstart:
	@echo "Quick Start Guide"
	@echo "================="
	@echo ""
	@echo "1. Build everything:"
	@echo "   make build-docker"
	@echo "   make build-remarkable"
	@echo "   make build-server"
	@echo ""
	@echo "2. Start the server:"
	@echo "   make run-server"
	@echo ""
	@echo "3. Deploy to reMarkable:"
	@echo "   make deploy REMARKABLE_IP=<your-remarkable-ip>"
	@echo ""
	@echo "4. On reMarkable, run:"
	@echo "   ./remarkable-canvas -s ws://<server-ip>:8080"
