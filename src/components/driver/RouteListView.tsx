import { List, Space, Typography, Tag, Progress } from "antd";
import { CheckCircleFilled, ClockCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { AddressMetersElement } from "../../types/route";

const { Text } = Typography;

interface RouteListViewProps {
  stops: AddressMetersElement[];
  segmentTimes: number[];
  currentStopIndex: number;
  onStopSelect: (index: number) => void;
}

export default function RouteListView({
  stops,
  segmentTimes,
  currentStopIndex,
  onStopSelect,
}: RouteListViewProps) {
  const { t } = useTranslation("viewDriverRoute");
  const keyPath = "routeListView";
  const completedCount = stops.filter((stop) =>
    stop.meters.every((order) => order.status === "Delivered")
  ).length;
  const progressPercent = (completedCount / stops.length) * 100;
  const nextIncompleteIndex = stops.findIndex((stop) =>
    stop.meters.some((order) => order.status !== "Delivered")
  );

  return (
    <div style={{ padding: 16, paddingBottom: 80, backgroundColor: "white" }}>
      {/* Progress Header */}
      <Space
        direction="vertical"
        size="middle"
        style={{ width: "100%", marginBottom: 16 }}
      >
        <Text strong style={{ fontSize: 18 }}>
          {t(`${keyPath}.progress_header_text`)}: {completedCount}{" "}
          {t(`${keyPath}.progress_header_of`)} {stops.length}{" "}
          {t(`${keyPath}.progress_header_completed`)}
        </Text>
        <Progress percent={Math.round(progressPercent)} status="active" />
      </Space>

      {/* Stop List */}
      <List
        dataSource={stops}
        renderItem={(stop, index) => {
          const isCompleted = stop.meters.every(
            (order) => order.status === "Delivered"
          );
          const isNext = index === nextIncompleteIndex;
          const isCurrent = index === currentStopIndex;

          return (
            <List.Item
              onClick={() => onStopSelect(index)}
              className={isCurrent ? "route-item-selected" : ""}
              style={{
                cursor: "pointer",
                padding: "16px",
                backgroundColor: isCurrent
                  ? "#e6f7ff"
                  : isCompleted
                  ? "#f0f2f5"
                  : "transparent",
                border: isCurrent ? "none" : "1px solid #f0f0f0",
                borderRadius: 8,
                marginBottom: 8,
                opacity: isCompleted ? 0.6 : 1,
                minHeight: 80,
              }}
            >
              <Space
                style={{ width: "100%", justifyContent: "space-between" }}
                size="middle"
              >
                <Space size="middle" style={{ flex: 1 }}>
                  {/* Status Icon */}
                  <div
                    style={{
                      fontSize: 24,
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircleFilled style={{ color: "#52c41a" }} />
                    ) : isNext ? (
                      <ClockCircleOutlined style={{ color: "#1890ff" }} />
                    ) : (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          border: "2px solid",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                        }}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Stop Details */}
                  <Space direction="vertical" size="small" style={{ flex: 1 }}>
                    <Text strong delete={isCompleted}>
                      {stop.address}
                    </Text>
                    <Space>
                      <Text strong style={{ color: "#52c41a" }}>
                        {t(`${keyPath}.text_time_mins`, {
                          segmentTime: segmentTimes[index] || 0,
                        })}
                      </Text>
                      {isNext && (
                        <Tag color="blue">{t(`${keyPath}.tag_next`)}</Tag>
                      )}
                      {isCompleted && (
                        <Tag color="success">{t(`${keyPath}.tag_done`)}</Tag>
                      )}
                      {stop.meters[0].customer?.openTime && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {stop.meters[0].customer.openTime}-
                          {stop.meters[0].customer.closeTime}
                        </Text>
                      )}
                    </Space>
                  </Space>
                </Space>
              </Space>
            </List.Item>
          );
        }}
      />
    </div>
  );
}
