import { useEffect, useRef, useState } from "react";
import { Input, Space, Button } from "antd";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import notification from "../utils/notification";
import type { MarkerData } from "../types/markers";
import orderedMarkerImg from "../assets/icons/orderedMarker.png";
import startMarkerImg from "../assets/icons/startMarker.png";
import endMarkerImg from "../assets/icons/endMarker.png";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface NavigationMapProp {
  orderMarkers: MarkerData[];
  setOrderMarkers: (markers: MarkerData[]) => void;
  setSelectedRowId?: (rowIds: number[]) => void;
}

function createNumberIcon(number: number) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="position: relative; width: 40px; height: 56px;">
        <img src="${orderedMarkerImg}" style="width: 40px; height: 56px;" />
        <div style="
          position: absolute;
          top: 8px;
          left: 8px;
          width: 30px;
          text-align: center;
          font-weight: bold;
          color: white;
          text-shadow: 0 0 2px black;
        ">
          ${number}
        </div>
      </div>`,
    iconAnchor: [12, 52],
  });
}

const startIcon = new L.Icon({
  iconUrl: startMarkerImg,
  iconSize: [40, 56],
  iconAnchor: [20, 56],
});

const endIcon = new L.Icon({
  iconUrl: endMarkerImg,
  iconSize: [40, 56],
  iconAnchor: [20, 56],
});

const OpenStreetMap: React.FC<NavigationMapProp> = ({ orderMarkers, setOrderMarkers, setSelectedRowId }) => {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const [startMarker, setStartMarker] = useState<Omit<MarkerData, "id">>();
  const [endMarker, setEndMarker] = useState<Omit<MarkerData, "id">>();
  const [orderedMarkers, setOrderedMarkers] = useState<(MarkerData & { order: number })[]>([]);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  //const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  
  const defaultIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  useEffect(() => {
    setOptions({ key: GOOGLE_API_KEY });
    (async () => {
      await importLibrary("routes");
      directionsServiceRef.current = new google.maps.DirectionsService();
    })();
  }, []);

  /*const geocodeAddress = async (address: string) => {
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
  };*/

  type OptimizedRouteResult = {
    order: number[];
    //beforeOrder: number[];
    startCoord: {
      lat: number;
      lng: number;
    };
      endCoord: {
        lat: number;
        lng: number;
    };
  };

  async function getOptimizedWaypointOrder(
    startAddress: string,
    endAddress: string,
    waypoints: { lat: number; lng: number }[]
  ) :  Promise<OptimizedRouteResult> {
    return new Promise((resolve, reject) => {
      directionsServiceRef.current?.route(
        {
          origin: startAddress,
          destination: endAddress,
          waypoints: waypoints.map((wp) => ({ location: wp })),
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = result.routes[0];
            const legs = route.legs;
            const startCoord = { // start address coordination
              lat: legs[0].start_location.lat(),
              lng: legs[0].start_location.lng(),
            };
            const endCoord = { // end address coordination
              lat: legs[legs.length - 1].end_location.lat(),
              lng: legs[legs.length - 1].end_location.lng(),
            };
            const order = result.routes[0].waypoint_order; // optimized order of indexes
            // Sum up distance and duration between points
            let totalDistance = 0;
            let totalDuration = 0;

            for (const leg of legs) {
              totalDistance += leg.distance?.value ?? 0; // in meters
              totalDuration += leg.duration?.value ?? 0; // in seconds
            }
            console.log("totalDistance", totalDistance)
            console.log("totalDuration", totalDuration)
            resolve({ order, startCoord, endCoord });
          } else {
            reject(status);
          }
        }
      );
    });
  }

  const calculateRoute = async () => {
    if (!startAddress || !endAddress) {
      notification("error", "Start location and destination should be entered");
      return;
    }

    try {
      //const start = await geocodeAddress(startAddress);
      //const end = await geocodeAddress(endAddress);
      const optimizedRouteResult = await getOptimizedWaypointOrder(startAddress, endAddress, orderMarkers.map((m) => m.position));
      const { order, startCoord, endCoord } = optimizedRouteResult
      const orderedMarkers = order.map((i, idx) => ({
        ...orderMarkers[i],
        order: idx + 1,
      }));
      setStartMarker({position: startCoord, address: startAddress});
      setEndMarker({position: endCoord, address: endAddress});
      setOrderedMarkers(orderedMarkers);
      setOrderMarkers([]);
      setSelectedRowId?.([]);
      const orderedWaypoints = order.map((i) => orderMarkers[i].position);
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoord.lng},${startCoord.lat};${orderedWaypoints
        .map((wp) => `${wp.lng},${wp.lat}`)
        .join(";")};${endCoord.lng},${endCoord.lat}?overview=full&geometries=geojson`;

      const response = await fetch(osrmUrl);
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

        {/* Order Markers */}
        {orderMarkers.map((marker, index) => (
          <Marker
            key={index}
            position={[marker.position.lat, marker.position.lng]}
            icon={defaultIcon}
          >
          <Popup>{marker.address}</Popup>
          </Marker>
        ))}

        {orderedMarkers.map((marker) => (
          <Marker
            key={marker.order}
            position={[marker.position.lat, marker.position.lng]}
            icon={createNumberIcon(marker.order)}
          >
            <Popup>
              Stop {marker.order}: {marker.address}
            </Popup>
          </Marker>
        ))}

        {startMarker ? (
          <Marker position={[startMarker.position.lat, startMarker.position.lng]} icon={startIcon}>
            <Popup>Start: {startAddress}</Popup>
          </Marker>
        ) : null}
        
        {endMarker ? (
          <Marker position={[endMarker.position.lat, endMarker.position.lng]} icon={endIcon}>
            <Popup>End: {endAddress}</Popup>
          </Marker>
        ) : null}

        {/* Route polyline */}
        {route.length > 0 && <Polyline positions={route} color="blue" />}
      </MapContainer>
    </div>
  );
};

export default OpenStreetMap;