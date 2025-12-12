import {
  Modal,
  Button,
  DatePicker,
  Input,
  Select,
  Form as AntForm,
  App,
  Row,
  Col,
} from "antd";
import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { addCustomer, createOrder, updateCustomer } from "../utils/dbUtils";
import type { Order } from "../types/order";
import type { Customer } from "../types/customer";
import areaData from "../hong_kong_areas.json";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useTranslation } from "react-i18next";

type OrderTime = "Morning" | "Afternoon" | "Evening";

interface OrderFormValues {
  date: dayjs.Dayjs;
  detailedAddress: string;
  area: string;
  district: string;
  deliveryTime: string;
  latitude: number;
  longitude: number;
  customerId: number;
}

interface suggestionOption {
  value: string; // placeId
  label: string; // detailedAddress
  subdistrict?: string;
  customerId?: number;
}

export default function NewOrderModal({
  date,
  customers,
  fetchOrders,
}: {
  date?: dayjs.Dayjs | null;
  customers: Customer[];
  fetchOrders: () => void;
}) {
  type Area = keyof typeof areaData;

  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [addressValue, setAddressValue] = useState<string>("");
  const [suggestions, setSuggestions] = useState<suggestionOption[]>([]);

  console.log("resultsSuggestions", JSON.parse(JSON.stringify(suggestions)));

  const areas = Object.keys(areaData);
  const districts = selectedArea ? Object.keys(areaData[selectedArea]) : [];

  const [open, setOpen] = useState(false);
  const [form] = AntForm.useForm<OrderFormValues>();

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteSuggestion | null>(null);
  const sessionToken = useRef<
    google.maps.places.AutocompleteSessionToken | undefined
  >(undefined);
  const debounceTimer = useRef<NodeJS.Timeout>(null);

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  const { message } = App.useApp();
  const { t } = useTranslation(["addOrder", "hongkong"]);

  useEffect(() => {
    setOptions({ key: GOOGLE_API_KEY });
    (async () => {
      await importLibrary("places");
      await importLibrary("geocoding");
      geocoderRef.current = new google.maps.Geocoder();
      autocompleteService.current =
        new google.maps.places.AutocompleteSuggestion();
      geocoderRef.current = new google.maps.Geocoder();
    })();
  }, [GOOGLE_API_KEY]);

  useEffect(() => {
    if (!autocompleteService.current) return;
    if (!addressValue) {
      setSuggestions([]);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      if (!sessionToken.current) {
        sessionToken.current =
          new google.maps.places.AutocompleteSessionToken();
      }
      //https://developers.google.com/maps/documentation/javascript/reference/autocomplete-data#AutocompleteSuggestion
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
    }, 300); // 300ms debounce
  }, [addressValue]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        date: date ? date : undefined,
      });
    }
  }, [open, date, form]);

  const addOrder = async (values: OrderFormValues, customerId: number) => {
    const time: OrderTime = values.deliveryTime as OrderTime;
    const newOrder: Omit<Order, "id"> = {
      date: values.date.format("YYYY-MM-DD"),
      time: time,
      status: "Pending",
      detailedAddress: values.detailedAddress,
      area: values.area,
      district: values.district,
      lat: values.latitude,
      lng: values.longitude,
      customerId: customerId,
    };

    const result = await createOrder(newOrder);

    if (result.success && result.data) {
      setSelectedArea(null);
      handleCancel();
      fetchOrders();
      message.success(t("message_success"));
    } else {
      console.error(t("message_error_create_order"), result.error);
      message.error(`${t("message_error_create_order")} ${result.error}`);
    }
  };

  const handleSubmit = async (values: OrderFormValues) => {
    // Create a new customer if -1
    if (values.customerId === -1) {
      const newCustomer: Omit<Customer, "id"> = {
        name: "dummyCustomerName",
        openTime: "00:00:00",
        closeTime: "23:59:59",
        detailedAddress: values.detailedAddress,
        area: values.area,
        district: values.district,
        lat: values.latitude,
        lng: values.longitude,
      };
      const addResult = await addCustomer(newCustomer);
      if (addResult.success && addResult.data) {
        // Update the customer name
        const updatedCustomer: Customer = {
          ...addResult.data,
          name: "Customer" + addResult.data.id,
        };

        const updateResult = await updateCustomer(updatedCustomer);
        if (updateResult.success) {
          message.success(t("message_customer_success"));
          addOrder(values, addResult.data.id);
        } else {
          message.error(
            `${t("message_error_update_customer")} ${updateResult.error}`
          );
        }
      } else {
        message.error(`${t("message_error_add_customer")} ${addResult.error}`);
      }
    } else {
      addOrder(values, values.customerId);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedArea(null);
    setOpen(false);
  };

  const findLocation = (subdistrict: string) => {
    for (const [area, districts] of Object.entries(areaData)) {
      for (const [district, subdistricts] of Object.entries(districts)) {
        if (subdistricts.includes(subdistrict)) {
          return { area, district };
        }
      }
    }
    return null;
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
          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
          });
        } else {
          reject(`Geocode failed for "${placeId}" with status: ${status}`);
        }
      });
    });
  }

  const handleSelect = async (value: string, option: suggestionOption) => {
    if (!value) return;

    try {
      if (option.subdistrict) {
        const { area, district } = findLocation(option.subdistrict) || {};
        const latLng = await geocodeAddress(value);
        form.setFieldsValue({
          customerId: -1,
          detailedAddress: option.label,
          latitude: latLng.lat,
          longitude: latLng.lng,
          area,
          district,
        });
        setSelectedArea(area as keyof typeof areaData);
      } else {
        // Create a new Place instance with the placeId
        const placeInstance = new google.maps.places.Place({
          id: option.value,
          requestedLanguage: "en",
        });

        const { place } = await placeInstance.fetchFields({
          fields: ["addressComponents", "location", "formattedAddress"],
        });

        const components = place.addressComponents || [];
        const findComponent = (type: string) =>
          components.find((c) => c.types.includes(type))?.longText;

        const district =
          findComponent("administrative_area_level_2") ||
          findComponent("locality") ||
          "";
        const area = findComponent("administrative_area_level_1") || "";

        const lat = place.location?.lat() ?? 0;
        const lng = place.location?.lng() ?? 0;

        form.setFieldsValue({
          customerId: -1,
          detailedAddress: value,
          latitude: lat,
          longitude: lng,
          area,
          district,
        });
        setSelectedArea(area as keyof typeof areaData);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        {t("button_add_new_order")}
      </Button>
      <Modal
        title={t("modal_title")}
        open={open}
        onCancel={handleCancel}
        footer={null}
      >
        <AntForm form={form} layout="vertical" onFinish={handleSubmit}>
          <AntForm.Item
            label={t("label_date_picker")}
            name="date"
            rules={[{ required: true, message: t("rule_select_date") }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </AntForm.Item>
          <AntForm.Item
            label={t("label_customer")}
            name="customerId"
            rules={[{ required: true, message: t("rule_select_customer") }]}
          >
            <Select
              placeholder={t("placeholder_select_customer")}
              onChange={(value) => {
                const selectedCustomer = customers.find(
                  (customer) => customer.id === value
                );
                if (selectedCustomer) {
                  form.setFieldsValue({
                    detailedAddress: selectedCustomer.detailedAddress,
                    area: selectedCustomer.area,
                    district: selectedCustomer.district,
                    longitude: selectedCustomer.lng,
                    latitude: selectedCustomer.lat,
                  });
                  setSelectedArea(selectedCustomer.area as Area);
                }
              }}
            >
              <Select.Option key={-1} value={-1}>
                {t("option_create_new_customer")}
              </Select.Option>
              {customers?.map((customer) => (
                <Select.Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Select.Option>
              ))}
            </Select>
          </AntForm.Item>
          <Row gutter={20}>
            <Col span={10}>
              <AntForm.Item
                label={t("label_area")}
                name="area"
                rules={[{ required: true, message: t("rule_select_area") }]}
              >
                <Select
                  placeholder={t("placeholder_select_area")}
                  onChange={(value) => {
                    setSelectedArea(value);
                    form.setFieldsValue({
                      district: undefined,
                    });
                  }}
                  options={areas.map((area) => {
                    const areaKey = area.replace(/ /g, "_");
                    return {
                      value: area,
                      // UPDATED: Changed 'area_' to 'region_' to match your Traditional Chinese keys
                      label: t(`hongkong:region_${areaKey}`, {
                        defaultValue: area,
                      }),
                    };
                  })}
                  optionFilterProp="label"
                  showSearch
                />
              </AntForm.Item>
            </Col>
            <Col span={10}>
              <AntForm.Item
                label={t("label_district")}
                name="district"
                rules={[{ required: true, message: t("rule_select_district") }]}
              >
                <Select
                  placeholder={t("placeholder_select_district")}
                  disabled={!selectedArea}
                  options={districts.map((district) => {
                    const districtKey = district.replace(/ /g, "_");
                    return {
                      value: district,
                      // UPDATED: Changed 'district_' to 'area_' to match your Traditional Chinese keys
                      label: t(`hongkong:area_${districtKey}`, {
                        defaultValue: district,
                      }),
                    };
                  })}
                  optionFilterProp="label"
                  showSearch
                />
              </AntForm.Item>
            </Col>
          </Row>
          <AntForm.Item
            label={t("label_detailed_address")}
            name="detailedAddress"
            rules={[
              {
                required: true,
                message: t("rule_input_address"),
              },
            ]}
          >
            <Select
              showSearch
              placeholder={t("placeholder_search_address")}
              filterOption={false}
              onSearch={(value) => setAddressValue(value)}
              options={suggestions}
              onSelect={handleSelect}
            />
          </AntForm.Item>
          <AntForm.Item
            label={t("label_longitude")}
            name="longitude"
            hidden
            rules={[
              {
                required: true,
                message: t("rule_input_longitude"),
              },
            ]}
          >
            <Input placeholder={t("placeholder_longitude")} />
          </AntForm.Item>
          <AntForm.Item
            label={t("label_latitude")}
            name="latitude"
            hidden
            rules={[
              {
                required: true,
                message: t("rule_input_latitude"),
              },
            ]}
          >
            <Input placeholder={t("placeholder_latitude")} />
          </AntForm.Item>
          <AntForm.Item
            label={t("label_delivery_time")}
            name="deliveryTime"
            rules={[
              { required: true, message: t("rule_select_delivery_time") },
            ]}
          >
            <Select placeholder={t("placeholder_select_delivery_time")}>
              <Select.Option value="Morning">{t("time_morning")}</Select.Option>
              <Select.Option value="Afternoon">
                {t("time_afternoon")}
              </Select.Option>
              <Select.Option value="Evening">{t("time_evening")}</Select.Option>
            </Select>
          </AntForm.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              {t("button_cancel")}
            </Button>
            <Button type="primary" htmlType="submit">
              {t("button_add")}
            </Button>
          </div>
        </AntForm>
      </Modal>
    </>
  );
}
