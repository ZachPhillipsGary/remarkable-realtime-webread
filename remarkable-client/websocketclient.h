#ifndef WEBSOCKETCLIENT_H
#define WEBSOCKETCLIENT_H

#include <QObject>
#include <QWebSocket>
#include <QJsonObject>
#include <QJsonArray>
#include <QTimer>

class WebSocketClient : public QObject
{
    Q_OBJECT

public:
    explicit WebSocketClient(const QString &url, QObject *parent = nullptr);
    ~WebSocketClient();

    void sendStroke(const QVector<QPointF> &points, const QColor &color, int width);
    void sendClear();
    bool isConnected() const;

signals:
    void connected();
    void disconnected();
    void strokeReceived(QVector<QPointF> points, QColor color, int width);
    void clearReceived();
    void historyReceived(QJsonArray history);

private slots:
    void onConnected();
    void onDisconnected();
    void onTextMessageReceived(const QString &message);
    void onError(QAbstractSocket::SocketError error);
    void reconnect();

private:
    QWebSocket m_webSocket;
    QString m_url;
    QTimer m_reconnectTimer;
    bool m_isConnected;

    void processMessage(const QJsonObject &msg);
};

#endif // WEBSOCKETCLIENT_H
