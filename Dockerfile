FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install basic build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    wget \
    curl \
    git \
    python3 \
    python3-pip \
    file \
    rsync \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for the server
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /build

# Download reMarkable toolchain
# For reMarkable 1/2 (armv7)
RUN wget https://remarkable.engineering/oecore-x86_64-cortexa7hf-neon-toolchain-zero-gravitas-1.8-23.9.2019.sh \
    -O /tmp/toolchain.sh && \
    chmod +x /tmp/toolchain.sh && \
    /tmp/toolchain.sh -y -d /opt/remarkable-toolchain && \
    rm /tmp/toolchain.sh

# Set up environment for cross-compilation
ENV PATH="/opt/remarkable-toolchain/sysroots/x86_64-oesdk-linux/usr/bin:/opt/remarkable-toolchain/sysroots/x86_64-oesdk-linux/usr/bin/arm-oe-linux-gnueabi:${PATH}"
ENV CROSS_COMPILE="arm-oe-linux-gnueabi-"

# Source the toolchain environment
SHELL ["/bin/bash", "-c"]
RUN echo "source /opt/remarkable-toolchain/environment-setup-cortexa9hf-neon-oe-linux-gnueabi" >> /root/.bashrc

WORKDIR /workspace

CMD ["/bin/bash"]
