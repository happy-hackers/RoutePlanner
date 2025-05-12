import { Table } from "antd";

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
  },
  {
    title: "Delivery date",
    dataIndex: "deliveryDate",
    key: "deliveryDate",
  },
  {
    title: "Postcode",
    dataIndex: "postcode",
    key: "postcode",
  },
];

export default function Orderform() {
  return <Table columns={columns} dataSource={[]} rowKey="id" />;
}
