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
        console.log("customer", customer)
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
          message.success("Customer created successfully!");
          //message.success("Customer added successfully!");
          onSuccess();
          setSelectedArea(null);
          onCancel();
        } else {
          message.error(`Failed to add customer: ${result.error}`);
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
          message.success("Customer updated successfully!");
          onSuccess();
          onCancel();
        } else {
          message.error(`Failed to update customer: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      message.error("Network error occurred");
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
          reject(`Geocode failed: ${status}`);
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
    }
  };

  return (
    <Modal
      title={mode === "add" ? "Add New Customer" : "Edit Customer"}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <AntForm form={form} layout="vertical" onFinish={handleSubmit}>
        <AntForm.Item
          label="Name"
          name="name"
          rules={[
            {
              required: true,
              message: "Please input the name of the customer!",
            },
          ]}
        >
          <Input placeholder="Name" />
        </AntForm.Item>
        <AntForm.Item
          label="Open Time"
          name="openTime"
          rules={[{ required: true, message: "Please select a time!" }]}
        >
          <TimePicker style={{ width: "100%" }} />
        </AntForm.Item>
        <AntForm.Item
          label="Close Time"
          name="closeTime"
          rules={[{ required: true, message: "Please select a time!" }]}
        >
          <TimePicker style={{ width: "100%" }} />
        </AntForm.Item>
        <Row gutter={20}>
          <Col span={10}>
            <AntForm.Item
              label="Area"
              name="area"
              rules={[{ required: true, message: "Please select an area!" }]}
            >
              <Select
                placeholder="Select Area"
                onChange={(value) => {
                  setSelectedArea(value);
                  form.setFieldsValue({
                    district: undefined,
                  });
                }}
                options={areas.map((area) => ({
                    value: area,
                    label: area,
                  }))}
                optionFilterProp="label"
                showSearch
              />
            </AntForm.Item>
          </Col>
          <Col span={10}>
            <AntForm.Item
              label="District"
              name="district"
              rules={[{ required: true, message: "Please select a district!" }]}
            >
              <Select
                placeholder="Select District"
                disabled={!selectedArea}
                options={districts.map((district) => ({
                    value: district,
                    label: district,
                  }))}
                optionFilterProp="label"
                showSearch
              />
            </AntForm.Item>
          </Col>
        </Row>
        <AntForm.Item
          label="Detailed Address"
          name="detailedAddress"
          rules={[{ required: true, message: "Please input the detailed address of the customer!" }]}
        >
          <Select
            showSearch
            placeholder="Search address"
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
          label="Longitude"
          name="lng"
          hidden
          rules={[
            {
              required: true,
              message: "Please input the longitude of the customer!",
            },
          ]}
        >
          <Input placeholder="Longitude" />
        </AntForm.Item>
        <AntForm.Item
          label="Latitude"
          name="lat"
          hidden
          rules={[
            {
              required: true,
              message: "Please input the latitude of the customer!",
            },
          ]}
        >
          <Input placeholder="Latitude" />
        </AntForm.Item>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit">
            {mode === "add" ? "Add Customer" : "Update Customer"}
          </Button>
        </div>
      </AntForm>
    </Modal>
  );
}
