QT += core gui widgets websockets

TARGET = remarkable-canvas
TEMPLATE = app

CONFIG += c++11

# Target device architecture
# For reMarkable 1/2: armv7-unknown-linux-gnueabihf
# For reMarkable Paper Pro: aarch64-unknown-linux-gnu

SOURCES += \
    main.cpp \
    canvaswidget.cpp \
    websocketclient.cpp

HEADERS += \
    canvaswidget.h \
    websocketclient.h

# Install path for reMarkable
target.path = /home/root
INSTALLS += target
