import { Modal, Table, Button, Typography } from "antd";
import { useState } from "react";
import type { Order } from "../types/order";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store";
import ActionConfirmModal from "./ActionConfirmModal";
import { setSelectedOrders } from "../store/orderSlice";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface ServerListModalProps {
  orders: Order[];
  isVisible: boolean;
  setVisibility: (value: boolean) => void;
}

const SelectedOrderModal: React.FC<ServerListModalProps> = ({
  orders,
  isVisible,
  setVisibility,
}) => {
  const [isActionConfirm, setIsActionConfirm] = useState(false);
  const dispatch = useDispatch();
  const selectedOrders = useSelector(
    (state: RootState) => state.order.selectedOrders
  );
  const { t } = useTranslation("selectOrder");

  const columns = [
    {
      title: t("tableColumnId"),
      dataIndex: "id",
      key: "id",
    },
    {
      title: t("tableColumnAddress"),
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      render: (detailedAddress: string, record: Order) => (
        <Text>
          {detailedAddress}, {record.area}
        </Text>
      ),
    },
    {
      title: t("tableColumnTime"),
      dataIndex: "time",
      key: "time",
      render: (time: string) => t(`time${time}`),
    },
    {
      title: t("tableColumnAction"),
      key: "action",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: any) => (
        <Text
          type="danger"
          style={{ cursor: "pointer" }}
          onClick={() => handleDelete(record.id)}
        >
          {t("actionDelete")}
        </Text>
      ),
    },
  ];

  const handleDelete = (id: number) => {
    dispatch(setSelectedOrders(selectedOrders.filter((order) => order.id !== id)));
  };

  const handleDeleteAll = () => {
    dispatch(setSelectedOrders([]));
  };

  return (
    <>
      <Modal
        title={t("modalTitle")}
        open={isVisible}
        onCancel={() => setVisibility(false)}
        footer={[
          <Button
            key="delete-all"
            danger
            onClick={() => setIsActionConfirm(true)}
          >
            {t("buttonDeleteAll")}
          </Button>,
        ]}
        styles={{
          body: {
            maxHeight: 580,
            overflowY: "auto",
          },
        }}
        centered
      >
        <Table
          dataSource={orders}
          columns={columns}
          pagination={false}
          bordered
          size="middle"
        />
      </Modal>
      <ActionConfirmModal
        isOpen={isActionConfirm}
        description={t("confirmDescription")}
        actionText={t("confirmAction")}
        cancelText={t("confirmCancel")}
        onConfirm={() => {
          handleDeleteAll();
          setIsActionConfirm(false);
        }}
        onCancel={() => setIsActionConfirm(false)}
      />
    </>
  );
};

export default SelectedOrderModal;