import { Table } from "antd";
import type { TableProps } from "antd";
import type { Order } from "../types/order";
import type { Dispatcher } from "../types/dispatchers";

interface DispatcherformProps {
  selectedDispatcher: Dispatcher | null;
  orders: Order[];
}

interface TableDataType {
  key: React.Key;
  id: number;
  postcode: number;
  address: string;
}

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 30,
  },
  {
    title: "Postcode",
    dataIndex: "postcode",
    key: "postcode",
    width: 60,
  },
  {
    title: "Address",
    dataIndex: "address",
    key: "address",
    ellipsis: true,
    width: 200,
  },
];

const rowSelection: TableProps<TableDataType>["rowSelection"] = {
  onChange: (selectedRowKeys: React.Key[], selectedRows: TableDataType[]) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      "selectedRows: ",
      selectedRows
    );
  },
};

export default function Dispatcherform({
  selectedDispatcher,
  orders,
}: DispatcherformProps) {
  // Filter orders for the selected dispatcher
  const dispatcherOrders = selectedDispatcher
    ? orders.filter((order) => order.dispatcherId === selectedDispatcher.id)
    : [];

  // Transform orders data for table
  const tableData: TableDataType[] = dispatcherOrders.map((order) => ({
    key: order.id,
    id: order.id,
    postcode: order.postcode,
    address: order.address,
  }));

  return (
    <div style={{ maxWidth: "600px" }}>
      {selectedDispatcher ? (
        <div>
          <h3>Orders assigned to {selectedDispatcher.name}</h3>
          <p>
            Responsible areas: {selectedDispatcher.responsibleArea.join(", ")}
          </p>
          <p>Total orders: {dispatcherOrders.length}</p>
          <Table
            rowSelection={{ type: "checkbox", ...rowSelection }}
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} orders`,
            }}
            scroll={{ x: 480 }}
          />
        </div>
      ) : (
        <div>
          <h3>All Orders</h3>
          <p>Select a dispatcher to view their assigned orders</p>
          <Table
            columns={columns}
            dataSource={orders.map((order) => ({
              key: order.id,
              id: order.id,
              postcode: order.postcode,
              address: order.address,
            }))}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} orders`,
            }}
            scroll={{ x: 480 }}
          />
        </div>
      )}
    </div>
  );
}
