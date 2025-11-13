#include <QApplication>
#include <QCommandLineParser>
#include "canvaswidget.h"

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    app.setApplicationName("reMarkable Canvas");
    app.setApplicationVersion("1.0");

    QCommandLineParser parser;
    parser.setApplicationDescription("Real-time collaborative canvas for reMarkable");
    parser.addHelpOption();
    parser.addVersionOption();

    QCommandLineOption serverOption(QStringList() << "s" << "server",
                                    "WebSocket server URL (e.g., ws://192.168.1.100:8080)",
                                    "url",
                                    "ws://10.11.99.1:8080");  // Default: reMarkable USB network

    parser.addOption(serverOption);
    parser.process(app);

    QString serverUrl = parser.value(serverOption);

    CanvasWidget canvas(serverUrl);
    canvas.showFullScreen();

    return app.exec();
}
