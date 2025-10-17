import { Button, Table } from "antd";
import type { Order } from "../types/order";
import dayjs from "dayjs";
import { useState } from "react";
import ActionConfirmModal from "./ActionConfirmModal";
import { updateOrder } from "../utils/dbUtils";

interface Props {
  orders: Order[]
  onOrderRefetch: () => void
}

export default function Orderform({ orders, onOrderRefetch }: Props) {
  const [isDeliverConfirmMoal, setIsDeliverConfirmMoal] = useState<boolean>(false)
  const [selectedOrder, setSelectedOrder] = useState<Order>()

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "15%",
    },
    {
      title: "Delivery Time",
      dataIndex: "time",
      key: "deliveryTime",
      width: "20%",
      render: (time: string, record: Order) => {
        const date = dayjs(record.date).format("YYYY-MM-DD");
        const timeDisplay = time.charAt(0).toUpperCase() + time.slice(1);
        return `${date} ${timeDisplay}`;
      },
    },
    {
      title: "Address",
      dataIndex: "detailedAddress",
      key: "detailedAddress",
      width: "25%",
      render: (detailedAddress: string, record: Order) => {
        return `${detailedAddress}, ${record.area}`;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "";
        if (status === "In Progress") color = "orange";
        else if (status === "Delivered") color = "#53CC3F";
  
        return <span style={{ color }}>{status}</span>;
      },
      width: "20%",
    },
    /*{
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (_: any, record: Order) => {
        if (record.status === "In Progress")
          return (
            <Button color="green" variant="solid" onClick={() => {
              setSelectedOrder(record);
              setIsDeliverConfirmMoal(true);
              }}>
              Delivered
            </Button>
          );
      },
    },*/
  ];
  async function orderDelivered() {
    if (selectedOrder) {
      const updatedOrder: Order = {...selectedOrder, status : "Delivered"};
      await updateOrder(updatedOrder);
      onOrderRefetch();
    }
    setIsDeliverConfirmMoal(false);
    
  }
  return (
  <>
  <Table columns={columns} dataSource={orders} rowKey="id" />
  <ActionConfirmModal isOpen={isDeliverConfirmMoal} description={"Have you delivered this order?"} onConfirm={orderDelivered} onCancel={() => setIsDeliverConfirmMoal(false)} actionText={"Delivered"} cancelText={"Cancel"} />
  </>
  
);
}
