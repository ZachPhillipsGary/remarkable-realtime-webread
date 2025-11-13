#ifndef CANVASWIDGET_H
#define CANVASWIDGET_H

#include <QWidget>
#include <QPainter>
#include <QMouseEvent>
#include <QImage>
#include "websocketclient.h"

class CanvasWidget : public QWidget
{
    Q_OBJECT

public:
    explicit CanvasWidget(const QString &serverUrl, QWidget *parent = nullptr);
    ~CanvasWidget();

protected:
    void paintEvent(QPaintEvent *event) override;
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;
    void resizeEvent(QResizeEvent *event) override;

private slots:
    void onConnected();
    void onDisconnected();
    void onStrokeReceived(QVector<QPointF> points, QColor color, int width);
    void onClearReceived();

private:
    WebSocketClient *m_client;
    QImage m_canvas;
    bool m_drawing;
    QVector<QPointF> m_currentStroke;
    QColor m_penColor;
    int m_penWidth;
    bool m_connected;

    void drawStroke(const QVector<QPointF> &points, const QColor &color, int width);
    void initCanvas();
};

#endif // CANVASWIDGET_H
