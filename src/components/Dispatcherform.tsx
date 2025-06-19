import { Table } from "antd";
import type { TableProps } from "antd";

interface DataType {
  key: React.Key;
  title: string;
  dataIndex: number;
}

const columns = [
  {
    title: "Dispatcher",
    dataIndex: "dispatcherId",
    key: "dispatcherId",
  },
  {
    title: "Order",
    dataIndex: "orderId",
    key: "orderId",
  },
  {
    title: "Postcode",
    dataIndex: "postcode",
    key: "postcode",
  },
];

const rowSelection: TableProps<DataType>["rowSelection"] = {
  onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      "selectedRows: ",
      selectedRows
    );
  },
  getCheckboxProps: (record: DataType) => ({
    disabled: record.title === "Disabled User", // Column configuration not to be checked
    title: record.title,
  }),
};

export default function Dispatcherform() {
  return (
    <Table
      rowSelection={{ type: "checkbox", ...rowSelection }}
      columns={columns}
      dataSource={[]}
      rowKey="id"
    />
  );
}
