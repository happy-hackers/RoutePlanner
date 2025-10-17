import { Table } from "antd";
import type { Order } from "../types/order";
import dayjs from "dayjs";

interface Props {
  orders: Order[]
}

export default function Orderform({ orders }: Props) {

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
  ];
  return (
    <Table columns={columns} dataSource={orders} rowKey="id" />
  );
}
