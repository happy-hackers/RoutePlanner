import { Card, Button, Space, Typography, Tag, Modal, Input } from "antd";
import {
  UnorderedListOutlined,
  UndoOutlined,
  EditOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { AddressMetersElement } from "../../types/route";
import { useState } from "react";
import { UpOutlined, DownOutlined } from "@ant-design/icons";
import type { Order } from "../../types/order";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface NextStopCardProps {
  stop: AddressMetersElement;
  stopNumber: number;
  totalStops: number;
  segmentTime: number;
  onViewAll: () => void;
  onMeterDone: (orderId: number) => void;
  onMeterUndo: (orderId: number) => void;
  onNoteSave: (orderId: number, note: string) => void;
}

export default function NextStopCard({
  stop,
  stopNumber,
  totalStops,
  segmentTime,
  onViewAll,
  onMeterDone,
  onMeterUndo,
  onNoteSave,
}: NextStopCardProps) {
  const { t } = useTranslation("viewDriverRoute");
  const keyPath = "nextStopCard";
  const isCompleted = stop.meters.every(
    (order) => order.status === "Delivered"
  );
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeNoteOrder, setActiveNoteOrder] = useState<Order | null>(null);
  const [note, setNote] = useState("");

  return (
    <Card
      id="next-stop-card"
      style={{
        position: "fixed",
        top: isFullScreen ? 0 : undefined,
        bottom: isFullScreen ? 0 : 0,
        left: 0,
        right: 0,
        height: "100vh",
        overflowY: isFullScreen ? "auto" : "hidden",
        transform: isFullScreen
          ? "translateY(0)"
          : "translateY(calc(100% - 300px))",
        transition: "transform 0.5s ease-in-out",
        borderRadius: isFullScreen ? 0 : "16px 16px 0 0",
        boxShadow: isFullScreen ? "none" : "0 -4px 12px rgba(0,0,0,0.15)",
        zIndex: 1002,
        background: "#fff",
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1001,
          }}
        >
          <Button
            type="primary"
            size="small"
            onClick={() => setIsFullScreen((prev) => !prev)}
          >
            {isFullScreen ? <DownOutlined /> : <UpOutlined />}
          </Button>
        </div>
        {/* Header */}
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Text strong style={{ fontSize: 16 }}>
            {isCompleted
              ? t(`${keyPath}.header_completed`)
              : t(`${keyPath}.header_next`)}
            : {t(`${keyPath}.text_stop`, { stopNumber })}{" "}
            {t(`${keyPath}.text_of`)} {totalStops}
          </Text>
          <Tag color={isCompleted ? "success" : "processing"}>
            {isCompleted
              ? t(`${keyPath}.tag_done`)
              : t(`${keyPath}.tag_in_progress`)}
          </Tag>
        </Space>

        {/* Customer & Address */}
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {stop.meters[0].customer?.name ||
              t(`${keyPath}.placeholder_customer`)}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {stop.address}, {stop.area}
          </Text>
        </div>

        {/* Time & Customer Hours */}
        <Space>
          <Text strong style={{ color: "#52c41a" }}>
            {t(`${keyPath}.text_time_mins`, { segmentTime })}
          </Text>
          {stop.meters[0].customer?.openTime && (
            <Text type="secondary">
              {t(`${keyPath}.text_open`)}: {stop.meters[0].customer.openTime} -{" "}
              {stop.meters[0].customer.closeTime}
            </Text>
          )}
        </Space>

        {isFullScreen ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            {stop.meters.map((order) => (
              <Card
                key={order.id}
                size="small"
                style={{ background: "#fafafa" }}
              >
                <Space
                  style={{ justifyContent: "space-between", width: "100%" }}
                >
                  <Space direction="vertical">
                    <Text strong>
                      {order.customer?.name ||
                        t(`${keyPath}.placeholder_customer`)}
                    </Text>
                    <Text type="secondary">
                      {t(`${keyPath}.text_meter_id`)} {order.id}
                    </Text>
                  </Space>
                  <Space>
                    <Tag
                      color={
                        order.status === "Delivered" ? "success" : "processing"
                      }
                    >
                      {order.status === "Delivered"
                        ? t(`${keyPath}.tag_done`)
                        : t(`${keyPath}.tag_in_progress`)}
                    </Tag>
                    <Button
                      size="middle"
                      type="default"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setActiveNoteOrder(order);
                        setNote(order.note || "");
                      }}
                    />
                    {activeNoteOrder && (
                      <Modal
                        title={`Add Note for Meter #${order.id}`}
                        open={!!activeNoteOrder}
                        onCancel={() => setActiveNoteOrder(null)}
                        onOk={() => {
                          onNoteSave(activeNoteOrder.id, note);
                          setActiveNoteOrder(null);
                        }}
                        zIndex={1003}
                        okText={
                          activeNoteOrder.note?.trim() ? "Update" : "Save"
                        }
                      >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Input.TextArea
                            rows={4}
                            value={note}
                            placeholder="Enter your note here..."
                            onChange={(e) => setNote(e.target.value)}
                          />

                          {activeNoteOrder.lastNoteTime && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Last edited:{" "}
                              {dayjs(activeNoteOrder.lastNoteTime).format(
                                "YYYY-MM-DD, HH:mm:ss"
                              )}
                            </Text>
                          )}
                        </Space>
                      </Modal>
                    )}

                    {order.status !== "Delivered" ? (
                      <Button
                        size="middle"
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => onMeterDone(order.id)}
                      />
                    ) : (
                      <Button
                        size="middle"
                        icon={<UndoOutlined />}
                        onClick={() => onMeterUndo(order.id)}
                      >
                        {t(`${keyPath}.button_undo`)}
                      </Button>
                    )}
                  </Space>
                </Space>
              </Card>
            ))}
          </Space>
        ) : null}

        {/* Action Buttons */}
        <Space style={{ width: "100%" }}>
          <Button
            size="large"
            icon={<UnorderedListOutlined />}
            onClick={onViewAll}
            style={{ flex: 1 }}
          >
            {t(`${keyPath}.button_view_all`)}
          </Button>
        </Space>
      </Space>
    </Card>
  );
}
