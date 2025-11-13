#include "canvaswidget.h"
#include <QPainter>
#include <QDebug>

CanvasWidget::CanvasWidget(const QString &serverUrl, QWidget *parent)
    : QWidget(parent)
    , m_drawing(false)
    , m_penColor(Qt::black)
    , m_penWidth(2)
    , m_connected(false)
{
    // Set up widget
    setAttribute(Qt::WA_StaticContents);
    setMouseTracking(false);

    // Initialize canvas
    initCanvas();

    // Create WebSocket client
    m_client = new WebSocketClient(serverUrl, this);

    connect(m_client, &WebSocketClient::connected, this, &CanvasWidget::onConnected);
    connect(m_client, &WebSocketClient::disconnected, this, &CanvasWidget::onDisconnected);
    connect(m_client, &WebSocketClient::strokeReceived, this, &CanvasWidget::onStrokeReceived);
    connect(m_client, &WebSocketClient::clearReceived, this, &CanvasWidget::onClearReceived);

    qDebug() << "Canvas widget initialized";
}

CanvasWidget::~CanvasWidget()
{
}

void CanvasWidget::initCanvas()
{
    // Create a white canvas
    // reMarkable 1/2: 1404x1872 (portrait)
    // We'll use a larger canvas for infinite canvas effect
    m_canvas = QImage(3000, 3000, QImage::Format_RGB32);
    m_canvas.fill(Qt::white);
}

void CanvasWidget::paintEvent(QPaintEvent *event)
{
    QPainter painter(this);
    QRect dirtyRect = event->rect();

    // Draw the canvas
    painter.drawImage(dirtyRect, m_canvas, dirtyRect);

    // Draw connection status indicator
    painter.setPen(m_connected ? Qt::green : Qt::red);
    painter.setBrush(m_connected ? Qt::green : Qt::red);
    painter.drawEllipse(width() - 30, 10, 20, 20);
}

void CanvasWidget::mousePressEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        m_drawing = true;
        m_currentStroke.clear();
        m_currentStroke.append(event->pos());
    }
}

void CanvasWidget::mouseMoveEvent(QMouseEvent *event)
{
    if (m_drawing && (event->buttons() & Qt::LeftButton)) {
        QPointF point = event->pos();
        m_currentStroke.append(point);

        // Draw locally immediately for responsiveness
        if (m_currentStroke.size() > 1) {
            QPainter painter(&m_canvas);
            painter.setPen(QPen(m_penColor, m_penWidth, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));

            QPointF lastPoint = m_currentStroke[m_currentStroke.size() - 2];
            painter.drawLine(lastPoint, point);
        }

        update();
    }
}

void CanvasWidget::mouseReleaseEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton && m_drawing) {
        m_drawing = false;

        // Send stroke to server
        if (m_currentStroke.size() > 1) {
            m_client->sendStroke(m_currentStroke, m_penColor, m_penWidth);
            qDebug() << "Sent stroke with" << m_currentStroke.size() << "points";
        }

        m_currentStroke.clear();
    }
}

void CanvasWidget::resizeEvent(QResizeEvent *event)
{
    QWidget::resizeEvent(event);
}

void CanvasWidget::onConnected()
{
    qDebug() << "Connected to server";
    m_connected = true;
    update();
}

void CanvasWidget::onDisconnected()
{
    qDebug() << "Disconnected from server";
    m_connected = false;
    update();
}

void CanvasWidget::onStrokeReceived(QVector<QPointF> points, QColor color, int width)
{
    qDebug() << "Received stroke with" << points.size() << "points";
    drawStroke(points, color, width);
    update();
}

void CanvasWidget::onClearReceived()
{
    qDebug() << "Received clear command";
    m_canvas.fill(Qt::white);
    update();
}

void CanvasWidget::drawStroke(const QVector<QPointF> &points, const QColor &color, int width)
{
    if (points.size() < 2) return;

    QPainter painter(&m_canvas);
    painter.setPen(QPen(color, width, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));

    for (int i = 1; i < points.size(); i++) {
        painter.drawLine(points[i-1], points[i]);
    }
}
