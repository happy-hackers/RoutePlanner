import { Modal, Table, Input, Button, Typography } from "antd";
import { useState } from "react";
import type { Order } from "../types/order";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store";
import ActionConfirmModal from "./ActionConfirmModal";
import { setLoadedOrders } from "../store/orderSlice";

const { Text } = Typography;

interface ServerListModalProps {
  orders: Order[];
  isVisible: boolean;
  setVisibility: (value: boolean) => void;
  setSelectedRowIds: React.Dispatch<React.SetStateAction<number[]>>;
}

const LoadedOrderModal: React.FC<ServerListModalProps> = ({
  orders,
  isVisible,
  setVisibility,
  setSelectedRowIds,
}) => {
  const [isActionConfirm, setIsActionConfirm] = useState(false);
  const dispatch = useDispatch();
  const loadedOrders = useSelector(
    (state: RootState) => state.order.loadedOrders
  );

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Address",
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      render: (detailedAddress: string, record: Order) => (
        <Text>
          {detailedAddress}, {record.area}
        </Text>
      ),
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: any) => (
        <Text
          type="danger"
          style={{ cursor: "pointer" }}
          onClick={() => handleDelete(record.id)}
        >
          delete
        </Text>
      ),
    },
  ];

  const handleDelete = (id: number) => {
    dispatch(setLoadedOrders(loadedOrders.filter((order) => order.id !== id)));
    setSelectedRowIds((prev) => prev.filter((rowId) => rowId !== id))
  };

  const handleDeleteAll = () => {
    dispatch(setLoadedOrders([]));
    setSelectedRowIds([]);
  };

  return (
    <>
      <Modal
        title="Loaded Orders"
        open={isVisible}
        onCancel={() => setVisibility(false)}
        footer={[
          <Button
            key="delete-all"
            danger
            onClick={() => setIsActionConfirm(true)}
          >
            Delete all
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
        description={"Do you want to remove all loaded orders"}
        actionText={"Yes"}
        cancelText={"No"}
        onConfirm={() => {
          handleDeleteAll();
          setIsActionConfirm(false);
        }}
        onCancel={() => setIsActionConfirm(false)}
      />
    </>
  );
};

export default LoadedOrderModal;
