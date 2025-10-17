import { useEffect, useRef, useState } from "react";
import { Input, Space, Button, Select, App } from "antd";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import type { MarkerData } from "../types/markers";
import orderedMarkerImg from "../assets/icons/orderedMarker.png";
import startMarkerImg from "../assets/icons/startMarker.png";
import endMarkerImg from "../assets/icons/endMarker.png";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface NavigationMapProp {
  orderMarkers: MarkerData[];
  setOrderMarkers: (markers: MarkerData[]) => void;
  setSelectedRowId?: (rowIds: number[]) => void;
  sortedMarkers?: (MarkerData & { travelTime: number })[];
  setSortedMarkers?: (markers: (MarkerData & { travelTime: number })[]) => void;
  setIsRouteMode?: (routeMode: boolean) => void;
  isRouteMode?: boolean;
  isRouteResults?: boolean;
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

const OpenStreetMap: React.FC<NavigationMapProp> = ({ orderMarkers, setOrderMarkers, setSelectedRowId, sortedMarkers, setSortedMarkers, setIsRouteMode, isRouteMode, isRouteResults }) => {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [searchOptions, setSearchOptions] = useState("normal");
  const [totalTime, setTotalTime] = useState<number | undefined>();
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const [startMarker, setStartMarker] = useState<Omit<MarkerData, "id">>();
  const [endMarker, setEndMarker] = useState<Omit<MarkerData, "id">>();
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const SERVER_URL = import.meta.env.VITE_SERVER_URL;
  const { message } = App.useApp();
  const settingInfo: any = localStorage.getItem("setting");
  
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
      geocoderRef.current = new google.maps.Geocoder(); 
    })();
  }, []);

  useEffect(() => {
    if (settingInfo) {
      const settingJson = JSON.parse(settingInfo);
      if (settingJson.useDefaultAddress) {
        setStartAddress(settingJson.startAddress);
        setEndAddress(settingJson.endAddress);
      }
    }
  }, [settingInfo]);

  useEffect(() => {
    if (!isRouteMode) {
      setRoute([]);
      setSortedMarkers?.([]);
      setTotalTime(undefined);
      setStartMarker(undefined);
      setEndMarker(undefined);
    }
  }, [isRouteMode]);
  

  async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      geocoderRef.current?.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const loc = results[0].geometry.location;
          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
          });
        } else {
          reject(`Geocode failed for "${address}" with status: ${status}`);
        }
      });
    });
  }

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
    segmentTimes: number[]
    totalTime: number
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
            let totalTime = 0;
            const segmentTimes = legs.map(
              (leg) => Math.round((leg.duration?.value ?? 0) / 60)
            );
            for (const leg of legs) {
              totalDistance += leg.distance?.value ?? 0; // in meters
              totalTime += leg.duration?.value ?? 0; // in seconds
            }
            totalTime = Math.round(totalTime / 60)
            console.log("totalDistance", totalDistance)
            console.log("totalTime", totalTime)
            resolve({ order, startCoord, endCoord, segmentTimes, totalTime });
          } else {
            reject(status);
          }
        }
      );
    });
  }

  async function getOptimizedWaypointOrderByTime(
    startPoint: { lat: number; lng: number },
    endPoint: { lat: number; lng: number },
    waypoints: { lat: number; lng: number, open: string | null, close: string | null }[]
  ) :  Promise<any> {
    const payload = {
      startPoint,
      waypoints,
      endPoint
    };
    console.log("payload: ", payload)
    const response = await fetch(`${SERVER_URL}/optimize-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.error) 
      message.error(result.error, 4);
    return result;
  }
  const calculateRoutebyTime = async () => {
    if (!startAddress || !endAddress) {
      message.error("Start location and destination should be entered");
      return;
    }

    try {
      const startCoord = await geocodeAddress(startAddress);
      const endCoord = await geocodeAddress(endAddress);
      const waypointsWithTimes = orderMarkers.map(m => ({
        lat: m.position.lat,
        lng: m.position.lng,
        open: m.customer?.openTime ?? null,
        close: m.customer?.closeTime ?? null
      }));
      const optimizedRouteResult = await getOptimizedWaypointOrderByTime(startCoord, endCoord, waypointsWithTimes);
      if (!optimizedRouteResult.error) {
        const { order, segment_times, total_time } = optimizedRouteResult;
        const sortedMarkers = order.map((i: number, idx: number) => ({
          ...orderMarkers[i],
          travelTime: segment_times[idx],
        }));

        setStartMarker({ position: startCoord, address: startAddress });
        setEndMarker({ position: endCoord, address: endAddress });
        setSortedMarkers?.(sortedMarkers);
        setTotalTime(total_time);
        setIsRouteMode?.(true);
        setOrderMarkers([]);
        setSelectedRowId?.([]);

        const orderedWaypoints: { lat: number; lng: number }[] = order.map(
          (i: number) => orderMarkers[i].position
        );
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${
          startCoord.lng
        },${startCoord.lat};${orderedWaypoints
          .map((wp) => `${wp.lng},${wp.lat}`)
          .join(";")};${endCoord.lng},${
          endCoord.lat
        }?overview=full&geometries=geojson`;

        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] // flip lng,lat → lat,lng
          );
          setRoute(coordinates);
        } else {
          message.error("No route found");
        }
      }
      
      
    } catch (error) {
      console.error("Routing error:", error);
      message.error("Route calculation failed");
    }
  };
  const calculateRoute = async () => {
    if (!startAddress || !endAddress) {
      message.error("Start location and destination should be entered");
      return;
    }

    try {
      const optimizedRouteResult = await getOptimizedWaypointOrder(startAddress, endAddress, orderMarkers.map((m) => m.position));
      const { order, startCoord, endCoord, segmentTimes, totalTime } = optimizedRouteResult
      const sortedMarkers = order.map((i: number, idx: number) => ({
        ...orderMarkers[i],
        travelTime: segmentTimes[idx],
      }));

      setStartMarker({position: startCoord, address: startAddress});
      setEndMarker({position: endCoord, address: endAddress});
      setSortedMarkers?.(sortedMarkers);
      setTotalTime(totalTime);
      setIsRouteMode?.(true)
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
        message.error("No route found");
      }
    } catch (error) {
      console.error("Routing error:", error);
      message.error("Route calculation failed");
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isRouteResults ? (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(255, 255, 255, 0.6)",
            padding: "16px 20px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            maxWidth: "95%",
          }}
        >
          <Space
            direction="horizontal"
            size="middle"
            wrap
            style={{ justifyContent: "center" }}
          >
            <Space direction="vertical" style={{ width: 300 }}>
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
            <Select
              placeholder="Select Option"
              value={searchOptions}
              onChange={(value) => setSearchOptions(value)}
              style={{ width: 120 }}
            >
              <Select.Option value="normal">Normal</Select.Option>
              <Select.Option value="byTime">Opening Time</Select.Option>
            </Select>
            <Button
              type="primary"
              shape="round"
              size="large"
              disabled={isRouteMode}
              style={{
                width: 120,
                backgroundColor: isRouteMode ? "#E6E6E6" : "#1677ff",
                border: "none",
              }}
              onClick={
                searchOptions === "normal"
                  ? calculateRoute
                  : calculateRoutebyTime
              }
            >
              Search
            </Button>
          </Space>
        </div>
      ) : null}

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
        {orderMarkers.map((marker, index) => {
          const leafletIcon = marker.icon
            ? L.icon({
                iconUrl: marker.icon.url,
                iconSize: marker.icon.scaledSize
                  ? [marker.icon.scaledSize, marker.icon.scaledSize]
                  : [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl:
                  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
              })
            : defaultIcon;

          return (
            <Marker
              key={index}
              position={[marker.position.lat, marker.position.lng]}
              icon={leafletIcon}
            >
              <Popup>{marker.address}</Popup>
            </Marker>
          );
        })}

        {sortedMarkers?.map((marker, i) => (
          <Marker
            key={i}
            position={[marker.position.lat, marker.position.lng]}
            icon={createNumberIcon(i + 1)}
          >
            <Popup>
              Stop {i + 1}: {marker.address}
            </Popup>
          </Marker>
        ))}

        {startMarker ? (
          <Marker
            position={[startMarker.position.lat, startMarker.position.lng]}
            icon={startIcon}
          >
            <Popup>Start: {startAddress}</Popup>
          </Marker>
        ) : null}

        {endMarker ? (
          <Marker
            position={[endMarker.position.lat, endMarker.position.lng]}
            icon={endIcon}
          >
            <Popup>End: {endAddress}</Popup>
          </Marker>
        ) : null}

        {/* Route polyline */}
        {route.length > 0 && <Polyline positions={route} color="blue" />}
      </MapContainer>
      {totalTime && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            zIndex: 1000,
            background: "rgba(255, 255, 255, 0.8)",
            padding: "10px 16px",
            borderRadius: "8px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          🕒 Total Time:{" "}
          {totalTime >= 60
            ? `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`
            : `${totalTime}m`}
        </div>
      )}
    </div>
  );
};

export default OpenStreetMap;