import { Table } from "antd";
import type { TableProps } from "antd";
import type { Order } from "../types/order";
import type { Dispatcher } from "../types/dispatchers";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

interface DispatcherformProps {
  selectedDispatcher: Dispatcher | null;
  orders: Order[];
  dispatchers: Dispatcher[];
}

interface TableDataType {
  key: React.Key;
  id: number;
  postcode: number;
  address: string;
  dispatcher?: string;
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
  {
    title: "Dispatcher",
    dataIndex: "dispatcher",
    key: "dispatcher",
    width: 100,
    render: (dispatcher: string) => dispatcher || "Not Assigned",
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
  dispatchers,
}: DispatcherformProps) {
  // get global time information from redux
  const date = useSelector((state: RootState) => state.order.date);
  const timePeriod = useSelector((state: RootState) => state.order.timePeriod);

  // Filter orders for the selected dispatcher
  const dispatcherOrders = selectedDispatcher
    ? orders.filter((order) => order.dispatcherId === selectedDispatcher.id)
    : [];

  // create a map of dispatcher id to name
  const dispatcherMap = new Map(
    dispatchers.map((dispatcher) => [dispatcher.id, dispatcher.name])
  );

  // Transform orders data for table
  const tableData: TableDataType[] = dispatcherOrders.map((order) => ({
    key: order.id,
    id: order.id,
    postcode: order.postcode,
    address: order.address,
    dispatcher: order.dispatcherId
      ? dispatcherMap.get(order.dispatcherId)
      : undefined,
  }));

  // Transform all orders data for table (when no dispatcher is selected)
  const allOrdersData: TableDataType[] = orders
    .map((order) => ({
      key: order.id,
      id: order.id,
      postcode: order.postcode,
      address: order.address,
      dispatcher: order.dispatcherId
        ? dispatcherMap.get(order.dispatcherId)
        : undefined,
    }))
    .sort((a, b) => {
      // order by name
      const dispatcherA = a.dispatcher || "ZZZ"; // not assigned orders at the end
      const dispatcherB = b.dispatcher || "ZZZ";

      if (dispatcherA !== dispatcherB) {
        return dispatcherA.localeCompare(dispatcherB);
      }

      // if dispatcher is the same, order by id
      return a.id - b.id;
    });

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
            scroll={{ x: 580 }}
          />
        </div>
      ) : (
        <div>
          <h3>All Orders</h3>
          <p>Select a dispatcher to view their assigned orders</p>
          <p>
            <strong>Current Time Period:</strong> {date?.format("YYYY-MM-DD")}{" "}
            {timePeriod}
          </p>
          <Table
            columns={columns}
            dataSource={allOrdersData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} orders`,
            }}
            scroll={{ x: 580 }}
          />
        </div>
      )}
    </div>
  );
}
