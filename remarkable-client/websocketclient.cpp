#include "websocketclient.h"
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QDebug>

WebSocketClient::WebSocketClient(const QString &url, QObject *parent)
    : QObject(parent)
    , m_url(url)
    , m_isConnected(false)
{
    connect(&m_webSocket, &QWebSocket::connected, this, &WebSocketClient::onConnected);
    connect(&m_webSocket, &QWebSocket::disconnected, this, &WebSocketClient::onDisconnected);
    connect(&m_webSocket, &QWebSocket::textMessageReceived, this, &WebSocketClient::onTextMessageReceived);
    connect(&m_webSocket, QOverload<QAbstractSocket::SocketError>::of(&QWebSocket::error),
            this, &WebSocketClient::onError);

    // Auto-reconnect timer
    m_reconnectTimer.setInterval(3000);
    connect(&m_reconnectTimer, &QTimer::timeout, this, &WebSocketClient::reconnect);

    // Initial connection
    qDebug() << "Connecting to" << m_url;
    m_webSocket.open(QUrl(m_url));
}

WebSocketClient::~WebSocketClient()
{
    m_webSocket.close();
}

void WebSocketClient::onConnected()
{
    qDebug() << "Connected to server";
    m_isConnected = true;
    m_reconnectTimer.stop();
    emit connected();
}

void WebSocketClient::onDisconnected()
{
    qDebug() << "Disconnected from server";
    m_isConnected = false;
    emit disconnected();

    // Start reconnect timer
    m_reconnectTimer.start();
}

void WebSocketClient::onTextMessageReceived(const QString &message)
{
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    if (doc.isObject()) {
        processMessage(doc.object());
    }
}

void WebSocketClient::onError(QAbstractSocket::SocketError error)
{
    qDebug() << "WebSocket error:" << error << m_webSocket.errorString();
}

void WebSocketClient::reconnect()
{
    qDebug() << "Attempting to reconnect...";
    m_webSocket.open(QUrl(m_url));
}

void WebSocketClient::processMessage(const QJsonObject &msg)
{
    QString type = msg["type"].toString();

    if (type == "stroke") {
        QJsonArray pointsArray = msg["points"].toArray();
        QVector<QPointF> points;

        for (const QJsonValue &val : pointsArray) {
            QJsonArray point = val.toArray();
            if (point.size() >= 2) {
                points.append(QPointF(point[0].toDouble(), point[1].toDouble()));
            }
        }

        QString colorStr = msg["color"].toString("#000000");
        QColor color(colorStr);
        int width = msg["width"].toInt(2);

        emit strokeReceived(points, color, width);
    }
    else if (type == "clear") {
        emit clearReceived();
    }
    else if (type == "history") {
        QJsonArray history = msg["data"].toArray();
        emit historyReceived(history);

        // Process history items
        for (const QJsonValue &val : history) {
            QJsonObject item = val.toObject();
            processMessage(item);
        }
    }
}

void WebSocketClient::sendStroke(const QVector<QPointF> &points, const QColor &color, int width)
{
    if (!m_isConnected) return;

    QJsonArray pointsArray;
    for (const QPointF &point : points) {
        QJsonArray p;
        p.append(point.x());
        p.append(point.y());
        pointsArray.append(p);
    }

    QJsonObject msg;
    msg["type"] = "stroke";
    msg["points"] = pointsArray;
    msg["color"] = color.name();
    msg["width"] = width;
    msg["timestamp"] = QDateTime::currentMSecsSinceEpoch();

    QJsonDocument doc(msg);
    m_webSocket.sendTextMessage(doc.toJson(QJsonDocument::Compact));
}

void WebSocketClient::sendClear()
{
    if (!m_isConnected) return;

    QJsonObject msg;
    msg["type"] = "clear";
    msg["timestamp"] = QDateTime::currentMSecsSinceEpoch();

    QJsonDocument doc(msg);
    m_webSocket.sendTextMessage(doc.toJson(QJsonDocument::Compact));
}

bool WebSocketClient::isConnected() const
{
    return m_isConnected;
}
