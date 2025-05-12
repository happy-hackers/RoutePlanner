import { APIProvider, Map } from "@vis.gl/react-google-maps";
import type { MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { Input, Space, Button } from "antd";

export default function NavigationMap() {
  const apiKey = "";

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
            <Input placeholder="Input Start" />
            <Input placeholder="Input End" />
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
        />
      </APIProvider>
    </div>
  );
}
