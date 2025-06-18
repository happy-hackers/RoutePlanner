import { useParams } from "react-router-dom";
import { Table, Typography, Row, Col, Space, Button } from "antd";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import NavigationMap from "../components/NavigationMap";
import type { Order } from "../features/orders";
import { useEffect, useState } from "react";
import type { MarkerData } from "../components/type";

const { Title } = Typography;

const columns = [
  {
    title: "Order ID",
    dataIndex: "id",
    key: "orderId",
  },
  {
    title: "Address",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "Estimated Time",
    dataIndex: "estimatedTime",
    key: "estimatedTime",
  },
];

export default function RouteResults() {
  const redIcon = {
    url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
    color: "red"
  }
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

  const { id } = useParams();
  const orders = useSelector((state: RootState) => state.orders);
  const dispatchers = useSelector((state: RootState) => state.dispatchers);
  const dispatcher = dispatchers.find(
    (dispatcher) => dispatcher.id === Number(id)
  );
  const name = dispatcher?.name;

  useEffect(() => {
    return () => {
      setSelectedRowIds([]);
      setMarkers([]);
    };
  }, [id]);

  if (!id) {
    return (
      <div>
        <Title level={4}>Please select a dispatcher from the sidebar</Title>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div>
        <Title level={4}>No orders found</Title>
      </div>
    );
  }

  const data = orders.filter((order) => order.dispatcherId === Number(id));

  const addMarker = (marker: MarkerData) => {
    setMarkers(prev => [
      ...prev,
      marker
    ]);
  };
  const removeMarker = (id: number) => {
    const newMarkers = markers.filter(marker => marker.id !== id);
    setMarkers(newMarkers);
  };

  const handleRowSelect = (record: Order, selected: boolean, _selectedRows: Order[]) => {
    if (selected) {
      setSelectedRowIds(prev => [
        ...prev,
        record.id
      ])
      addMarker({
        id: record.id,
        position: {lat: record.lat, lng: record.lng},
        address: record.address,
        icon: redIcon,
        dispatcherId: record.dispatcherId
      })
    } else {
      setSelectedRowIds(selectedRowIds.filter(id => id !== record.id))
      removeMarker(record.id)
    }
  }

  const handleAllRowSelect = (selected: boolean, _selectedRows: Order[], changeRows: Order[]) => {
    if (selected) {
      changeRows.forEach((record) => {
        setSelectedRowIds(prev => [
          ...prev,
          record.id
        ])
        addMarker({
          id: record.id,
          position: {lat: record.lat, lng: record.lng},
          address: record.address,
          icon: redIcon,
          dispatcherId: record.dispatcherId
        })
      });
    } else {
      setSelectedRowIds([]);
      setMarkers([]);
    }
  }
  const rowSelection = {
    selectedRowKeys: selectedRowIds,
    onSelect: handleRowSelect,
    onSelectAll: handleAllRowSelect
  }

  return (
    <Row style={{ height: "100%" }}>
      <Col flex="295px">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button type="primary">Download the route of {name}</Button>
          <Table 
            rowKey="id"
            rowSelection={rowSelection} 
            columns={columns} 
            dataSource={data} 
            pagination={false} 
          />
        </Space>
      </Col>
      <Col flex="auto">
        <NavigationMap /*addMarker={addMarker}*/ markers={markers} />
      </Col>
    </Row>
  );
}

RouteResults.needMap = true;
