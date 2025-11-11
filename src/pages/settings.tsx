import { Card, Button, Form, Input, App, Checkbox } from "antd";
import { useEffect, useState } from "react";
import { getSettingInfo, updateSettingInfo } from "../utils/configuration";
import LanguageSwitcher from "../components/LanguageSwitcher.tsx";
import { useTranslation } from "react-i18next";

export default function Setting() {
  const { t } = useTranslation('settingPage');
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
  }, [form, startAddress, endAddress, useDefaultAddress]);

  const onFinish = async (values: any) => {
    console.log("values", values)
    updateSettingInfo(values);
    message.success(t("message_save_success"));
  };

  return (
    <Card title={t("card_title")} style={{ maxWidth: "70%", margin: "0 auto" }}>
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 20 }}
        layout="horizontal"
        style={{ maxWidth: 700 }}
        onFinish={onFinish}
        form={form}
      >
        <Form.Item
          wrapperCol={{ offset: 6 }}
          name="useDefaultAddress"
          valuePropName="checked"
        >
          <Checkbox onChange={(e) => setUseDefaultAddr(e.target.checked)}>
            {t("checkbox_use_default_address")}
          </Checkbox>
        </Form.Item>
        <Form.Item label={t("label_start_address")} name="startAddress">
          <Input disabled={!useDefaultAddr} />
        </Form.Item>
        <Form.Item label={t("label_end_address")} name="endAddress">
          <Input disabled={!useDefaultAddr} />
        </Form.Item>
        <Form.Item label={t("label_language")}>
          <LanguageSwitcher />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
          <Button type="primary" htmlType="submit">
            {t("button_submit")}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

Setting.needMap = false;
