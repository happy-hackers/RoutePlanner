import { Card, Button, Form, Input, App, Checkbox, Select } from "antd";
import { useEffect, useState } from "react";
import { getSettingInfo, updateSettingInfo } from "../utils/configuration";
import LanguageSwitcher from "../components/LanguageSwitcher.tsx";
import { useTranslation } from "react-i18next";
import { setMapProvider } from "../store/configSlice"; // 导入 action
import { useDispatch } from "react-redux";

export type MapOption = "OpenStreetMap" | "GoogleMap";
const defaultMapOption: MapOption = "OpenStreetMap";

interface SettingConfig {
  useDefaultAddress: boolean;
  startAddress: string;
  endAddress: string;
  mapProvider: MapOption;
}

export default function Setting() {
  const { t } = useTranslation('setting');
  const [useDefaultAddr, setUseDefaultAddr] = useState(false);
  const settingInfo: SettingConfig = getSettingInfo();
  const { useDefaultAddress, startAddress, endAddress, mapProvider } = settingInfo;
  const dispatch = useDispatch();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      useDefaultAddress,
      startAddress,
      endAddress,
      mapProvider: mapProvider || defaultMapOption
    });
    setUseDefaultAddr(useDefaultAddress);
  }, [useDefaultAddress, form, startAddress, endAddress, mapProvider]);

  const onFinish = async (values: SettingConfig) => {
    console.log("values", values)
    updateSettingInfo(values);
    if (values.mapProvider) {
      dispatch(setMapProvider(values.mapProvider));
    }
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
        <Form.Item label={t("label_language")} name="switchLanguage">
          <LanguageSwitcher />
        </Form.Item>
        <Form.Item label={t("label_map_option")} name="mapProvider">
          <Select>
            <Select.Option value="OpenStreetMap">OpenStreetMap (Leaflet)</Select.Option>
            <Select.Option value="GoogleMap">Google Map</Select.Option>
          </Select>
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
