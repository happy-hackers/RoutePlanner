import { Select, Button, Row, Col, Space } from "antd";
import { useState } from "react";
import Dispatcherform from "../components/Dispatcherform";

export default function AssignDispatchers() {
  const [selectedValue, setSelectedValue] = useState("");
  console.log(selectedValue);

  return (
    <Row style={{ height: "100%" }}>
      <Col>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="horizontal" size="middle">
            <Select
              defaultValue="Select a dispatcher"
              onChange={setSelectedValue}
              options={[
                { value: "dispatcher1", label: "Dispatcher 1" },
                { value: "dispatcher2", label: "Dispatcher 2" },
                { value: "dispatcher3", label: "Dispatcher 3" },
              ]}
            />
            <Button type="primary">Auto Assign</Button>
          </Space>
          <Dispatcherform />
        </Space>
      </Col>
    </Row>
  );
}

AssignDispatchers.needMap = true;
