import {
  Modal,
  Button,
  DatePicker,
  Input,
  Select,
  Form as AntForm,
  App,
  Row,
  Col
} from "antd";
import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { addCustomer, createOrder, updateCustomer } from "../utils/dbUtils";
import type { Order } from "../types/order";
import type { Customer } from "../types/customer";
import areaData from "../hong_kong_areas.json"
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

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
  date?: dayjs.Dayjs;
  customers: Customer[];
  fetchOrders: () => void;
}) {
  type Area = keyof typeof areaData;
  
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [addressValue, setAddressValue] = useState<string>("");
  const [suggestions, setSuggestions] = useState<suggestionOption[]>([]);

  console.log("resultsSuggestions", JSON.parse(JSON.stringify(suggestions)))

  const areas = Object.keys(areaData);
  const districts = selectedArea ? Object.keys(areaData[selectedArea]) : [];

  const [open, setOpen] = useState(false);
  const [form] = AntForm.useForm<OrderFormValues>();

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteSuggestion | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | undefined>(undefined);
  const debounceTimer = useRef<NodeJS.Timeout>(null);

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  const { message } = App.useApp();

  useEffect(() => {
    setOptions({ key: GOOGLE_API_KEY });
    (async () => {
      await importLibrary("places");
      await importLibrary("geocoding");
      geocoderRef.current = new google.maps.Geocoder();
      autocompleteService.current = new google.maps.places.AutocompleteSuggestion();
      geocoderRef.current = new google.maps.Geocoder(); 
    })();
  }, []);

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
        sessionToken.current = new google.maps.places.AutocompleteSessionToken();
      }
      //https://developers.google.com/maps/documentation/javascript/reference/autocomplete-data#AutocompleteSuggestion
      const results = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: addressValue,
        region: "HK",
        locationBias: {
          center: { lat: 22.3193, lng: 114.1694 },
          radius: 50000,
        }
      });
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
        date: date,
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
      message.success("Order created successfully!");
    } else {
      console.error("Failed to create order:", result.error);
      message.error(`Failed to create order: ${result.error}`);
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
          message.success("Customer created successfully!");
          addOrder(values, addResult.data.id);
        } else {
          message.error(`Failed to update customer: ${updateResult.error}`);
        }
        //message.success("Customer added successfully!");
      } else {
        message.error(`Failed to add customer: ${addResult.error}`);
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
        Add a new order
      </Button>
      <Modal
        title="New order form"
        open={open}
        onCancel={handleCancel}
        footer={null}
      >
        <AntForm form={form} layout="vertical" onFinish={handleSubmit}>
          <AntForm.Item
            label="Date Picker"
            name="date"
            rules={[{ required: true, message: "Please select a date!" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </AntForm.Item>
          <AntForm.Item
            label="Customer"
            name="customerId"
            rules={[{ required: true, message: "Please select customer!" }]}
          >
            <Select
              placeholder="Select customer"
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
                ---Create New Customer
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
                rules={[
                  { required: true, message: "Please select a district!" },
                ]}
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
            rules={[
              {
                required: true,
                message: "Please input the address of the order!",
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Search address"
              filterOption={false}
              onSearch={(value) => setAddressValue(value)}
              options={suggestions}
              onSelect={handleSelect}
            />
          </AntForm.Item>
          <AntForm.Item
            label="Longitude"
            name="longitude"
            hidden
            rules={[
              {
                required: true,
                message: "Please input the longitude of the order!",
              },
            ]}
          >
            <Input placeholder="Longitude" />
          </AntForm.Item>
          <AntForm.Item
            label="Latitude"
            name="latitude"
            hidden
            rules={[
              {
                required: true,
                message: "Please input the latitude of the order!",
              },
            ]}
          >
            <Input placeholder="Latitude" />
          </AntForm.Item>
          <AntForm.Item
            label="Delivery Time"
            name="deliveryTime"
            rules={[
              { required: true, message: "Please select delivery time!" },
            ]}
          >
            <Select placeholder="Select delivery time">
              <Select.Option value="Morning">Morning</Select.Option>
              <Select.Option value="Afternoon">Afternoon</Select.Option>
              <Select.Option value="Evening">Evening</Select.Option>
            </Select>
          </AntForm.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Add
            </Button>
          </div>
        </AntForm>
      </Modal>
    </>
  );
}