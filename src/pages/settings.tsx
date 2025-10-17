import { Card, Button, Form, Input, App, Checkbox } from "antd";
import { useEffect, useState } from "react";
import { getSettingInfo, updateSettingInfo } from "../utils/configuration";

export default function Setting() {
    const [useDefaultAddr, setUseDefaultAddr] = useState(false);
  const settingInfo: any = getSettingInfo();
  const { startAddress, endAddress, useDefaultAddress } = settingInfo;
  const { message } = App.useApp();
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      startAddress,
      endAddress,
      useDefaultAddress
    });
    setUseDefaultAddr(useDefaultAddress);
  }, []);

  const onFinish = async (values: any) => {
    console.log("values", values)
    updateSettingInfo(values);
    message.success("Saved successfully");
  };

  return (
    <Card title="Setting" style={{ maxWidth: "70%", margin: "0 auto" }}>
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 20 }}
        layout="horizontal"
        style={{ maxWidth: 700 }}
        onFinish={onFinish}
        form={form}
      >
        <Form.Item
          wrapperCol={{ offset: 1 }}
          name="useDefaultAddress"
          valuePropName="checked"
        >
          <Checkbox onChange={(e) => setUseDefaultAddr(e.target.checked)}>Use Default Address</Checkbox>
        </Form.Item>
        <Form.Item label="Default Start Address" name="startAddress">
          <Input disabled={!useDefaultAddr} />
        </Form.Item>
        <Form.Item label="Default End Address" name="endAddress">
          <Input disabled={!useDefaultAddr} />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

Setting.needMap = false;
