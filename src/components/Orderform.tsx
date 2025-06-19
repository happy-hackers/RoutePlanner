import { Table } from "antd";
import type { Order } from "../types/order";
import dayjs from "dayjs";

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
  },
  {
    title: "Delivery Time",
    dataIndex: "time",
    key: "deliveryTime",
    render: (time: string, record: Order) => {
      const date = dayjs(record.date).format("YYYY-MM-DD");
      const timeDisplay = time.charAt(0).toUpperCase() + time.slice(1);
      return `${date} ${timeDisplay}`;
    },
  },
  {
    title: "Postcode",
    dataIndex: "postcode",
    key: "postcode",
  },
];

export default function Orderform({ orders }: { orders: Order[] }) {
  return <Table columns={columns} dataSource={orders} rowKey="id" />;
}
