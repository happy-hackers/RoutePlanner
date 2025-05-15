import { Select, Button, Row, Col, Space } from "antd";
import { useSelector } from "react-redux";
import { useState } from "react";
import Dispatcherform from "../components/Dispatcherform";
import type { RootState } from "../store";

export default function AssignDispatchers() {
  const [selectedId, setSelectedId] = useState("");
  const dispatchers = useSelector((state: RootState) => state.dispatchers);

  const dispatchersOption = dispatchers.map((dispatcher) => ({
    value: dispatcher.id,
    label: dispatcher.name,
  }));

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <Select
              defaultValue="Dispatcher"
              onChange={setSelectedId}
              options={dispatchersOption}
            />
            <Button type="primary">Auto Assign</Button>
          </Space>
          <Dispatcherform id={selectedId} />
        </Space>
      </Col>
    </Row>
  );
}

AssignDispatchers.needMap = true;
