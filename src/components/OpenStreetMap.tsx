import { useState } from "react";
import { Input, Space, Button } from "antd";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import notification from "../utils/notification";
import type { MarkerData } from "../types/markers";

interface NavigationMapProp {
  markers: MarkerData[];
}

const OpenStreetMap: React.FC<NavigationMapProp> = ({ markers }) => {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [route, setRoute] = useState<LatLngExpression[]>([]);

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoiYnJ1Y2UteWFuIiwiYSI6ImNseThnY3pneTBmY3kya285cnhxcTVjanIifQ.6_RSrQcF0PWDM__UyliMVw";

const geocodeAddress = async (address: string) => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

  const res = await fetch(url);
  const data = await res.json();

  if (data && data.features && data.features.length > 0) {
    return {
      lng: data.features[0].center[0], // [lng, lat]
      lat: data.features[0].center[1],
    };
  }

  throw new Error("Geocoding failed for " + address);
};

  const calculateRoute = async () => {
    if (!startAddress || !endAddress) {
      notification("error", "Start location and destination should be entered");
      return;
    }

    try {
      const start = await geocodeAddress(startAddress);
      const end = await geocodeAddress(endAddress);
      const waypoints = markers.map(
        (m) => `${m.position.lng},${m.position.lat}`
      );
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${waypoints.join(
        ";"
      )};${end.lng},${end.lat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] // flip lng,lat → lat,lng
        );
        setRoute(coordinates);
      } else {
        notification("error", "No route found");
      }
    } catch (error) {
      console.error("Routing error:", error);
      notification("error", "Route calculation failed");
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
              placeholder="Input Start (lng,lat)"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
            />
            <Input
              placeholder="Input End (lng,lat)"
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
              onClick={calculateRoute}
            >
              Search
            </Button>
          </Space>
        </Space>
      </div>

      <MapContainer
        center={[22.3165316829187, 114.182081980287]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100vh", width: "100%" }}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={[marker.position.lat, marker.position.lng]}
            icon={defaultIcon}
          >
          <Popup>{marker.address}</Popup>
          </Marker>
        ))}

        {/* Route polyline */}
        {route.length > 0 && <Polyline positions={route} color="blue" />}
      </MapContainer>
    </div>
  );
};

export default OpenStreetMap;
