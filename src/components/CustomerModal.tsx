import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Form as AntForm,
  Input,
  Button,
  TimePicker,
  App,
  Select,
  Row,
  Col
} from "antd";
import { addCustomer, updateCustomer } from "../utils/dbUtils";
import type { Customer } from "../types/customer.ts";
import dayjs from "dayjs";
import areaData from "../hong_kong_areas.json"
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useTranslation } from "react-i18next";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

interface CustomerModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  customer?: Customer;
  mode: "add" | "edit";
}

export default function CustomerModal({
  visible,
  onCancel,
  onSuccess,
  customer,
  mode,
}: CustomerModalProps) {
  const { t } = useTranslation(["addCustomerComponent", 'hongkongArea']);
  type Area = keyof typeof areaData;

  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  const areas = Object.keys(areaData);
  const districts = selectedArea ? Object.keys(areaData[selectedArea]) : [];

  const [form] = AntForm.useForm();
  const { message } = App.useApp();

  const [addressValue, setAddressValue] = useState<string>("");
  const [suggestions, setSuggestions] = useState<
    {
      value: string;
      label: string;
      subdistrict?: string;
    }[]
  >([]);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteSuggestion | null>(null);
  const sessionToken = useRef<
    google.maps.places.AutocompleteSessionToken | undefined
  >(undefined);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setOptions({ key: GOOGLE_API_KEY });
    (async () => {
      await importLibrary("places");
      await importLibrary("geocoding");
      geocoderRef.current = new google.maps.Geocoder();
      autocompleteService.current =
        new google.maps.places.AutocompleteSuggestion();
    })();
  }, []);

  useEffect(() => {
    if (!autocompleteService.current) return;
    if (!addressValue) {
      setSuggestions([]);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (!sessionToken.current) {
        sessionToken.current =
          new google.maps.places.AutocompleteSessionToken();
      }

      const results =
        await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          {
            input: addressValue,
            region: "HK",
            locationBias: {
              center: { lat: 22.3193, lng: 114.1694 },
              radius: 50000,
            },
          }
        );

      setSuggestions(
        results.suggestions.map((s) => ({
          value: s.placePrediction?.placeId ?? "",
          label: s.placePrediction?.text.text ?? "",
          subdistrict: s.placePrediction?.secondaryText?.text ?? "",
        }))
      );
    }, 300);
  }, [addressValue]);

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && customer) {
        // edit mode: fill existing data
        form.setFieldsValue({
          name: customer.name,
          detailedAddress: customer.detailedAddress,
          area: customer.area,
          district: customer.district,
          openTime: dayjs(customer.openTime, "HH:mm:ss"),
          closeTime: dayjs(customer.closeTime, "HH:mm:ss"),
          lat: customer.lat,
          lng: customer.lng,
          postcode: customer.postcode ?? "",
        });
        setSelectedArea(customer.area as Area);
      } else if (mode === "add") {
        form.resetFields(); // add mode: clear form
      }
    }
  }, [visible, mode, customer, form]);

  interface CustomerFormValues {
    name: string;
    openTime: dayjs.Dayjs;
    closeTime: dayjs.Dayjs;
    detailedAddress: string;
    area: string;
    district: string;
    lat: number;
    lng: number;
  }
  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      if (mode === "add") {
        const newCustomer: Omit<Customer, "id"> = {
          name: values.name,
          openTime: values.openTime.format("HH:mm:ss"),
          closeTime: values.closeTime.format("HH:mm:ss"),
          detailedAddress: values.detailedAddress,
          area: values.area,
          district: values.district,
          lat: values.lat,
          lng: values.lng,
        };
        const result = await addCustomer(newCustomer);

        if (result.success && result.data) {
          message.success(t(`msg_add_success`));
          onSuccess();
          setSelectedArea(null);
          onCancel();
        } else {
          message.error(t(`msg_add_fail`, { error: result.error }));
        }
      } else if (mode === "edit") {
        if (!customer) return;

        const updatedCustomer: Customer = {
          ...customer,
          name: values.name,
          openTime: values.openTime.format("HH:mm:ss"),
          closeTime: values.closeTime.format("HH:mm:ss"),
          detailedAddress: values.detailedAddress,
          area: values.area,
          district: values.district,
          lat: values.lat,
          lng: values.lng,
        };

        const result = await updateCustomer(updatedCustomer);
        if (result.success) {
          message.success(t(`msg_edit_success`));
          onSuccess();
          onCancel();
        } else {
          message.error(t(`msg_edit_fail`, { error: result.error }));
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      message.error(t(`msg_network_error`));
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedArea(null);
    onCancel();
  };

  async function geocodeAddress(
    placeId: string
  ): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      geocoderRef.current?.geocode({ placeId }, (results, status) => {
        if (
          status === google.maps.GeocoderStatus.OK &&
          results &&
          results.length > 0
        ) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          reject(t(`msg_geocode_fail`, { status }));
        }
      });
    });
  }

  const handleSelect = async (
    value: string,
    option: (typeof suggestions)[0]
  ) => {
    if (!value) return;

    try {
      const latLng = await geocodeAddress(value);
      let area = "";
      let district = "";

      // Find area/district from subdistrict
      if (option.subdistrict) {
        for (const [a, districtsObj] of Object.entries(areaData)) {
          for (const [d, subdistricts] of Object.entries(districtsObj)) {
            if ((subdistricts as string[]).includes(option.subdistrict!)) {
              area = a;
              district = d;
            }
          }
        }
      }

      form.setFieldsValue({
        detailedAddress: option.label,
        area,
        district,
        lat: latLng.lat,
        lng: latLng.lng,
      });

      setSelectedArea(area as keyof typeof areaData);
    } catch (err) {
      console.error("Error fetching place details:", err);
      message.error(t(`msg_geocode_select_fail`));
    }
  };

  return (
    <Modal
      title={
        mode === "add"
          ? t(`modal_title_add`)
          : t(`modal_title_edit`)
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <AntForm form={form} layout="vertical" onFinish={handleSubmit}>
        <AntForm.Item
          label={t(`label_name`)}
          name="name"
          rules={[
            {
              required: true,
              message: t(`validation_name_required`),
            },
          ]}
        >
          <Input placeholder={t(`placeholder_name`)} />
        </AntForm.Item>
        <AntForm.Item
          label={t(`label_open_time`)}
          name="openTime"
          rules={[{ required: true, message: t(`validation_time_required`) }]}
        >
          <TimePicker style={{ width: "100%" }} />
        </AntForm.Item>
        <AntForm.Item
          label={t(`label_close_time`)}
          name="closeTime"
          rules={[{ required: true, message: t(`validation_time_required`) }]}
        >
          <TimePicker style={{ width: "100%" }} />
        </AntForm.Item>
        <Row gutter={20}>
          <Col span={10}>
            <AntForm.Item
              label={t(`label_area`)}
              name="area"
              rules={[{ required: true, message: t(`validation_area_required`) }]}
            >
              <Select
                placeholder={t(`placeholder_select_area`)}
                onChange={(value) => {
                  setSelectedArea(value);
                  form.setFieldsValue({
                    district: undefined,
                  });
                }}
                options={areas.map((area) => ({
                  value: area,
                  // 修正：将 area 中的空格替换为下划线，然后使用 'hongkongArea:region_' 前缀
                  label: t('hongkongArea:region_' + area.replace(/ /g, '_'), { defaultValue: area }),
                }))}
                optionFilterProp="label"
                showSearch
              />
            </AntForm.Item>
          </Col>
          <Col span={10}>
            <AntForm.Item
              label={t(`label_district`)}
              name="district"
              rules={[{ required: true, message: t(`validation_district_required`) }]}
            >
              <Select
                placeholder={t(`placeholder_select_district`)}
                disabled={!selectedArea}
                options={districts.map((district) => ({
                  value: district,
                  // 修正：将 district 中的空格替换为下划线，然后使用 'hongkongArea:area_' 前缀
                  label: t('hongkongArea:area_' + district.replace(/ /g, '_'), { defaultValue: district }),
                }))}
                optionFilterProp="label"
                showSearch
              />
            </AntForm.Item>
          </Col>
        </Row>
        <AntForm.Item
          label={t(`label_detailed_address`)}
          name="detailedAddress"
          rules={[{ required: true, message: t(`validation_address_required`) }]}
        >
          <Select
            showSearch
            placeholder={t(`placeholder_search_address`)}
            filterOption={false}
            onSearch={(value) => {
              setAddressValue(value);
            }}
            options={suggestions}
            onSelect={handleSelect}
            onChange={(value) => {
              form.setFieldsValue({ detailedAddress: value });
              // Clear lat/lng if manually typing
              form.setFieldsValue({ lat: undefined, lng: undefined });
            }}
          />
        </AntForm.Item>
        <AntForm.Item
          label={t(`label_lng`)}
          name="lng"
          hidden
          rules={[
            {
              required: true,
              message: t(`validation_lng_required`),
            },
          ]}
        >
          <Input placeholder={t(`placeholder_lng`)} />
        </AntForm.Item>
        <AntForm.Item
          label={t(`label_lat`)}
          name="lat"
          hidden
          rules={[
            {
              required: true,
              message: t(`validation_lat_required`),
            },
          ]}
        >
          <Input placeholder={t(`placeholder_lat`)} />
        </AntForm.Item>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            {t(`button_cancel`)}
          </Button>
          <Button type="primary" htmlType="submit">
            {mode === "add"
              ? t(`button_add_customer`)
              : t(`button_update_customer`)}
          </Button>
        </div>
      </AntForm>
    </Modal>
  );
}