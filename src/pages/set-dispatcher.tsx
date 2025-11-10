import { Card, Typography, Row, Col, Button, App } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { getAllDispatchers, deleteDispatcher } from "../utils/dbUtils";
import type { Dispatcher } from "../types/dispatchers";
import DispatcherModal from "../components/DispatcherModal";
import { sortDispatchers } from "../utils/sortingUtils";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

export default function SetDispatcher() {

  const { t } = useTranslation(['setDispatcherPage', 'HongkongArea']);
  const { modal, message } = App.useApp();
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedDispatcher, setSelectedDispatcher] = useState<
    Dispatcher | undefined
  >();

  useEffect(() => {
    fetchDispatchers();
  }, []);

  const fetchDispatchers = async () => {
    const dispatchers = await getAllDispatchers();
    if (dispatchers) {
      const sortedDispatchers = sortDispatchers(dispatchers);
      setDispatchers(sortedDispatchers);
    }
  };

  const handleAddDispatcher = () => {
    setModalMode("add");
    setSelectedDispatcher(undefined);
    setModalVisible(true);
  };

  const handleEditDispatcher = (dispatcher: Dispatcher) => {
    setModalMode("edit");
    setSelectedDispatcher(dispatcher);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setSelectedDispatcher(undefined);
  };

  const handleModalSuccess = () => {
    fetchDispatchers();
  };

  const handleDeleteDispatcher = (dispatcher: Dispatcher) => {
    modal.confirm({
      title: t("modal_delete_title"),
      icon: <DeleteOutlined style={{ color: "red" }} />,
      content: (
        <div>
          <p>
            {t("modal_delete_content_main", { name: dispatcher.name })}
          </p>
          <p style={{ color: "red", marginTop: 8 }}>
            <strong>{t("modal_delete_warning_label")}:</strong>{" "}
            {t("modal_delete_warning_text")}
          </p>
        </div>
      ),
      okText: t("button_delete"),
      okType: "danger",
      cancelText: t("button_cancel"),
      onOk: async () => {
        const result = await deleteDispatcher(dispatcher.id);
        if (result.success) {
          const messageKey =
            result.orderCount && result.orderCount > 0
              ? "message_success_deleted_with_orders"
              : "message_success_deleted_no_orders";

          message.success(
            t(messageKey, { count: result.orderCount || 0, name: dispatcher.name })
          );
          fetchDispatchers();
        } else {
          message.error(t("message_error_delete_failed", { error: result.error }));
        }
      },
    });
  };

  return (
    
    <Card title={t("card_title")} style={{ maxWidth: "70%", margin: "0 auto" }}>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={4}>
          <Text strong>{t("header_dispatcher_name")}</Text>
        </Col>
        <Col span={10}>
          <Text strong>{t("header_active_day")}</Text>
        </Col>
        <Col span={7}>
          <Text strong>{t("header_responsible_area")}</Text>
        </Col>
        <Col span={3}>
          <Text strong>{t("header_actions")}</Text>
        </Col>
      </Row>

      {dispatchers.map((dispatcher) => (
        <Row
          key={dispatcher.id}
          align="middle"
          gutter={12}
          style={{
            marginBottom: 12,
            padding: "8px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Col span={4}>
            <Text>{dispatcher.name}</Text>
          </Col>
          <Col span={10}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", fontSize: "12px" }}>
              {(() => {
                const activeDay = dispatcher.activeDay || {};

                if (Object.keys(activeDay).length === 0) {
                  return <Text type="secondary" style={{ fontSize: "12px" }}>{t("text_no_active_days")}</Text>;
                }

                const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

                const fullPeriodDays: [string, string[]][] = [];
                const partialPeriodDays: [string, string[]][] = [];

                Object.entries(activeDay).forEach(([day, periods]) => {
                  const periodList = periods as string[];
                  if (periodList.length === 3) {
                    fullPeriodDays.push([day, periodList]);
                  } else {
                    partialPeriodDays.push([day, periodList]);
                  }
                });

                fullPeriodDays.sort(([dayA], [dayB]) => dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB));
                partialPeriodDays.sort(([dayA], [dayB]) => dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB));

                const sortedDays = [...fullPeriodDays, ...partialPeriodDays];

                return sortedDays.map(([day, periods]) => {
                  const periodList = periods as string[];
                  const isAllPeriods = periodList.length === 3;

                  const translatedDay = t(`day_${day}`, { defaultValue: day });
                  const translatedPeriods = periodList.map(p => t(`period_${p}`, { defaultValue: p }));

                  const displayText = isAllPeriods
                    ? translatedDay
                    : `${translatedDay}: ${translatedPeriods.join(t("period_separator", { defaultValue: " / " }))}`;

                  return (
                    <div
                      key={day}
                      style={{
                        padding: "2px 6px",
                        backgroundColor: isAllPeriods ? "#52c41a" : "#1890ff",
                        color: "white",
                        borderRadius: "4px",
                      }}
                    >
                      {displayText}
                    </div>
                  );
                });
              })()}
            </div>
          </Col>
          <Col span={7}>
            <div style={{ maxHeight: "60px", overflow: "hidden" }}>
              {dispatcher.responsibleArea?.map((area) => {
                const areaKey = area[1].replace(/ /g, '_');
                return (
                  <div key={area[1]} style={{ fontSize: "12px", color: "#666" }}>
                    {t(`HongkongArea:area_${areaKey}`, { defaultValue: area[1] })}
                  </div>
                );
              })}
            </div>
          </Col>
          <Col span={3}>
            <Button
              type="link"
              size="small"
              onClick={() => handleEditDispatcher(dispatcher)}
            >
              {t("button_edit")}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteDispatcher(dispatcher)}
            >
              {t("button_delete")}
            </Button>
          </Col>
        </Row>
      ))}

      <Row style={{ marginTop: 16 }}>
        <Col>
          <Button type="primary" onClick={handleAddDispatcher}>
            {t("button_add_dispatcher")}
          </Button>
        </Col>
      </Row>

      <DispatcherModal
        visible={modalVisible}
        mode={modalMode}
        dispatcher={selectedDispatcher}
        onCancel={handleModalCancel}
        onSuccess={handleModalSuccess}
      />
    </Card>
  );
}

SetDispatcher.needMap = false;