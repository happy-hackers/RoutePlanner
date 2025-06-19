import { GoogleMap, Marker } from "@react-google-maps/api";
import { Input, Space, Button } from "antd";
//import { useLocation, matchPath } from "react-router-dom";
import { useState, useRef } from "react";
//import { useSelector } from "react-redux";
import notification from "../utils/notification";
//import type { RootState } from "../store";
//import type { Order } from "../features/orders";
import type { MarkerData } from "../types/markers";

interface NavigationMapProp {
  markers: MarkerData[];
  //addMarker: (marker: MarkerData) => void
}

const NavigationMap: React.FC<NavigationMapProp> = ({ markers }) => {
  //console.log("markers in map", markers);
  /*const [markers, setMarkers] = useState<
    { lat: number; lng: number; address?: string }[]
  >([]);*/

  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");

  const mapRef = useRef<google.maps.Map>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(
    null
  );
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null
  );

  /*const location = useLocation();
  // Get orders data from Redux store
  const orders = useSelector((state: RootState) => state.orders);
  // Add markers automatically when orders data changes
  useEffect(() => {
    const addMarkersFromOrders = async () => {
      // Clear existing markers
      // Extract orders for a specific person
      const match = location.pathname.match(/^\/route-results\/(\d+)$/);
      const id = match ? match[1] : undefined;
      if (matchPath("/route-results/:id", location.pathname)) {
        const filteredOrders = orders.filter((order) => order.dispatcherId === Number(id))
        setSpecificOrders(filteredOrders);
      }
      // Add marker for each order
      if (specificOrders) {
        for (const order of specificOrders) {
          if (order.address) {
            await addMarkerByAddress(order.address);
          }
        }
      }
    };

    addMarkersFromOrders();
  }, [orders, location.pathname]);*/ // Re-execute when orders data changes

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      polylineOptions: { strokeColor: "blue" },
    });
  };
  const calculateRoute = () => {
    if (!startAddress || !endAddress) {
      notification("error", "Start location and destination should be entered");
      return;
    }
    if (directionsServiceRef.current) {
      directionsServiceRef.current.route(
        {
          origin: startAddress,
          destination: endAddress,
          waypoints: markers?.map((marker) => ({
            location: { lat: marker.position.lat, lng: marker.position.lng },
          })),
          optimizeWaypoints: true,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            directionsRendererRef.current?.setDirections(result);
            console.log("Route calculated and rendered.");
          } else {
            console.error("Route calculation failed: " + status);
          }
        }
      );
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
              onClick={calculateRoute}
            >
              Search
            </Button>
          </Space>
        </Space>
      </div>
      <GoogleMap
        zoom={13}
        mapContainerStyle={{ width: "100%", height: "100%" }}
        onLoad={onLoad}
        center={{ lat: -37.83674422439721, lng: 145.02939105956858 }}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            icon={marker.icon?.url}
          />
        ))}
      </GoogleMap>
    </div>
  );
};
export default NavigationMap;
