import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import type { MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { Input, Space, Button, message } from "antd";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

export default function NavigationMap() {
  const apiKey = "";
  const [markers, setMarkers] = useState<
    { lat: number; lng: number; address?: string }[]
  >([]);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");

  // Get orders data from Redux store
  const orders = useSelector((state: RootState) => state.orders);

  // Add markers automatically when orders data changes
  useEffect(() => {
    const addMarkersFromOrders = async () => {
      // Clear existing markers
      setMarkers([]);

      // Add marker for each order
      for (const order of orders) {
        if (order.address) {
          await addMarkerByAddress(order.address);
        }
      }
    };

    addMarkersFromOrders();
  }, [orders]); // Re-execute when orders data changes

  const addMarkerByAddress = async (address: string) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        const newMarker = {
          lat: location.lat(),
          lng: location.lng(),
          address: address,
        };
        setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
        message.success(`Successfully added marker: ${address}`);
      } else {
        message.error(`Could not find address: ${address}`);
      }
    } catch (error) {
      message.error(`Address parsing failed: ${address}`);
      console.error("Geocoding error:", error);
    }
  };

  const handleSearch = () => {
    if (startAddress) {
      addMarkerByAddress(startAddress);
    }
    if (endAddress) {
      addMarkerByAddress(endAddress);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: "1%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
        }}
      >
        <Space direction="horizontal" size="middle" style={{ width: "800px" }}>
          <Space direction="vertical" style={{ width: "800px" }}>
            <Input
              placeholder="Input Start"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
            />
            <Input
              placeholder="Input End"
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
            />
          </Space>
          <Space>
            <Button
              type="primary"
              style={{
                width: "70px",
                height: "70px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={handleSearch}
            >
              Search
            </Button>
          </Space>
        </Space>
      </div>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultZoom={13}
          defaultCenter={{ lat: -33.860664, lng: 151.208138 }}
          onCameraChanged={(ev: MapCameraChangedEvent) =>
            console.log(
              "camera changed:",
              ev.detail.center,
              "zoom:",
              ev.detail.zoom
            )
          }
        >
          {markers.map((marker, index) => (
            <Marker key={index} position={marker} />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
