import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Input, Space, Button, Select, App, TimePicker } from "antd";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import type { MarkerData } from "../types/markers";
import orderedMarkerImg from "../assets/icons/orderedMarker.png";
import startMarkerImg from "../assets/icons/startMarker.png";
import endMarkerImg from "../assets/icons/endMarker.png";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { Route } from "../types/route";
import type { Dispatcher } from "../types/dispatchers";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { generateDispatcherColorsMap } from "../utils/markersUtils";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

interface NavigationMapProp {
  orderMarkers: MarkerData[];
  setOrderMarkers: React.Dispatch<React.SetStateAction<MarkerData[]>>;
  setSelectedRowId?: React.Dispatch<React.SetStateAction<number[]>>;
  isRouteResultsPage?: boolean;
  newRoutes?: Omit<Route, "id">[];
  setNewRoutes?: React.Dispatch<React.SetStateAction<Omit<Route, "id">[]>>;
  isAllRoutes?: boolean;
  selectedDispatcher?: Dispatcher | null;
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

const OpenStreetMap = forwardRef(
  (
    {
      orderMarkers,
      setOrderMarkers,
      setSelectedRowId,
      isRouteResultsPage,
      newRoutes,
      setNewRoutes,
      isAllRoutes,
      selectedDispatcher,
    }: NavigationMapProp,
    ref
  ) => {
    const [startAddress, setStartAddress] = useState("");
    const [endAddress, setEndAddress] = useState("");
    const [searchOptions, setSearchOptions] = useState("normal");
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(
      null
    );
    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    const SERVER_URL = import.meta.env.VITE_SERVER_URL;
    const { message } = App.useApp();
    const settingInfo: any = localStorage.getItem("settings");
    const { t } = useTranslation("openStreetMap");

    const dispatchers = useSelector(
      (state: RootState) => state.dispatcher.dispatchers
    );

    const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);

    const foundRoute = newRoutes?.find(
      (route) => route.dispatcherId === selectedDispatcher?.id
    );

    const defaultIcon = new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

    async function geocodeAddress(
      address: string
    ): Promise<{ lat: number; lng: number }> {
      return new Promise((resolve, reject) => {
        geocoderRef.current?.geocode({ address }, (results, status) => {
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
            reject(`${t("geocodeError")}: "${address}" with status: ${status}`);
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
      segmentTimes: number[];
      totalTime: number;
      totalDistance: number;
    };

    async function getOptimizedWaypointOrder(
      startAddress: string,
      endAddress: string,
      waypoints: { lat: number; lng: number }[]
    ): Promise<OptimizedRouteResult> {
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
              const startCoord = {
                // start address coordination
                lat: legs[0].start_location.lat(),
                lng: legs[0].start_location.lng(),
              };
              const endCoord = {
                // end address coordination
                lat: legs[legs.length - 1].end_location.lat(),
                lng: legs[legs.length - 1].end_location.lng(),
              };
              const order = result.routes[0].waypoint_order; // optimized order of indexes
              // Sum up distance and duration between points
              let totalDistance = 0;
              let totalTime = 0;
              const segmentTimes = legs.map((leg) =>
                Math.round((leg.duration?.value ?? 0) / 60)
              );
              for (const leg of legs) {
                totalDistance += leg.distance?.value ?? 0; // in meters
                totalTime += leg.duration?.value ?? 0; // in seconds
              }
              totalTime = Math.round(totalTime / 60);
              resolve({
                order,
                startCoord,
                endCoord,
                segmentTimes,
                totalTime,
                totalDistance,
              });
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
      waypoints: {
        lat: number;
        lng: number;
        open: string | null;
        close: string | null;
      }[],
      startTime: string | null
    ): Promise<any> {
      const payload = {
        startPoint,
        waypoints,
        endPoint,
        startTime,
      };
      console.log("payload: ", payload);
      const response = await fetch(`${SERVER_URL}/optimize-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.error) message.error(result.error, 4);
      return result;
    }
    const calculateRoutebyTime = async (dispatcherId?: number) => {
      if (!startAddress || !endAddress) {
        message.error(t("errorStartEndRequired"));
        return;
      }

      try {
        let oMarkers: MarkerData[];
        if (dispatcherId)
          oMarkers = [
            ...orderMarkers.filter((m) => m.dispatcherId === dispatcherId),
          ];
        else oMarkers = [...orderMarkers];
        const startCoord = await geocodeAddress(startAddress);
        const endCoord = await geocodeAddress(endAddress);
        const waypointsWithTimes = oMarkers.map((m) => ({
          lat: m.position.lat,
          lng: m.position.lng,
          open: m.customer?.openTime ?? null,
          close: m.customer?.closeTime ?? null,
        }));
        const optimizedRouteResult = await getOptimizedWaypointOrderByTime(
          startCoord,
          endCoord,
          waypointsWithTimes,
          startTime ? startTime.format("HH:mm:ss") : null
        );
        if (!optimizedRouteResult.error) {
          const { order, segment_times, total_time, total_distance } =
            optimizedRouteResult;
          const sortedAddressWithMeters = order.map((i: number) => ({
            address: oMarkers[i].address,
            lat: oMarkers[i].position.lat,
            lng: oMarkers[i].position.lng,
            meters: oMarkers[i].meters
          }));

          const isOrderInMarkers = (id: number, markers: MarkerData[]) =>
            markers.some((marker) => marker.meters.some((m) => m.id === id));

          setSelectedRowId?.((prev) => prev.filter((id) => !isOrderInMarkers(id, oMarkers)));
          setOrderMarkers((prev) =>
            prev.filter((p) => p.dispatcherId !== oMarkers[0]?.dispatcherId)
          );

          const orderedWaypoints: { lat: number; lng: number }[] = order.map(
            (i: number) => oMarkers[i].position
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
            const newRoute: Omit<Route, "id"> = {
              dispatcherId: dispatcherId
                ? dispatcherId
                : oMarkers[0]?.dispatcherId!,
              routeDate: dayjs().format("YYYY-MM-DD"),
              optimizationMode: "normal",
              startAddress: startAddress,
              endAddress: endAddress,
              startLat: startCoord.lat,
              startLng: startCoord.lng,
              endLat: endCoord.lat,
              endLng: endCoord.lng,
              addressMeterSequence: sortedAddressWithMeters,
              segmentTimes: segment_times,
              total_time: total_time,
              total_distance: total_distance,
              polylineCoordinates: coordinates,
              createdBy: "Admin",

              version: 1,
              is_active: true
            };
            setNewRoutes?.((prev) => {
              const existingIndex = prev.findIndex(
                (r) => r.dispatcherId === newRoute.dispatcherId
              );
              if (existingIndex !== -1) {
                // Overwrite the existing route
                const updated = [...prev];
                updated[existingIndex] = newRoute;
                return updated;
              } else {
                return [...prev, newRoute];
              }
            });
          } else {
            message.error(t("errorNoRouteFound"));
          }
        }
      } catch (error) {
        console.error("Routing error:", error);
        message.error(t("errorRouteCalculationFailed"));
      }
    };
    const calculateRoute = async (dispatcherId?: number) => {
      if (!startAddress || !endAddress) {
        message.error(t("errorStartEndRequired"));
        return;
      }

      try {
        let oMarkers: MarkerData[];
        if (dispatcherId)
          oMarkers = [
            ...orderMarkers.filter((m) => m.dispatcherId === dispatcherId),
          ];
        else oMarkers = [...orderMarkers];
        const optimizedRouteResult = await getOptimizedWaypointOrder(
          startAddress,
          endAddress,
          oMarkers.map((m) => m.position)
        );
        const {
          order,
          startCoord,
          endCoord,
          segmentTimes,
          totalTime,
          totalDistance,
        } = optimizedRouteResult;

        const sortedAddressWithMeters = order.map((i: number) => ({
            address: oMarkers[i].address,
            lat: oMarkers[i].position.lat,
            lng: oMarkers[i].position.lng,
            meters: oMarkers[i].meters
        }));

        const isOrderInMarkers = (id: number, markers: MarkerData[]) =>
          markers.some((marker) => marker.meters.some((m) => m.id === id));

        setSelectedRowId?.((prev) => prev.filter((id) => !isOrderInMarkers(id, oMarkers)));
        setOrderMarkers((prev) =>
          prev.filter((p) => p.dispatcherId !== oMarkers[0]?.dispatcherId)
        );

        const orderedWaypoints = order.map((i) => oMarkers[i].position);
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
          const newRoute: Omit<Route, "id"> = {
            dispatcherId: dispatcherId
              ? dispatcherId
              : oMarkers[0]?.dispatcherId!,
            routeDate: dayjs().format("YYYY-MM-DD"),

            optimizationMode: "normal",
            startAddress: startAddress,
            endAddress: endAddress,
            startLat: startCoord.lat,
            startLng: startCoord.lng,
            endLat: endCoord.lat,
            endLng: endCoord.lng,
            addressMeterSequence: sortedAddressWithMeters,
            segmentTimes: segmentTimes,
            total_time: totalTime,
            total_distance: totalDistance,
            polylineCoordinates: coordinates,
            createdBy: "Admin",

            version: 1,
            is_active: true
          };
          setNewRoutes?.((prev) => {
            const existingIndex = prev.findIndex(
              (r) => r.dispatcherId === newRoute.dispatcherId
            );
            if (existingIndex !== -1) {
              // Overwrite the existing route
              const updated = [...prev];
              updated[existingIndex] = newRoute;
              return updated;
            } else {
              return [...prev, newRoute];
            }
          });
        } else {
          message.error(t("errorNoRouteFound"));
        }
      } catch (error) {
        console.error("Routing error:", error);
        message.error(t("errorRouteCalculationFailed"));
      }
    };

    useImperativeHandle(ref, () => ({
      triggerCalculate(dispatcherId: number) {
        if (searchOptions === "normal") {
          calculateRoute(dispatcherId);
        } else {
          calculateRoutebyTime(dispatcherId);
        }
      },
    }));

    const handleCalculate = () => {
      if (searchOptions === "normal") {
        calculateRoute();
      } else {
        if (!startTime) {
          message.error(
            t("errorStartTimeRequired")
          );
          return;
        }
        calculateRoutebyTime();
      }
    };

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {isRouteResultsPage ? (
          <div
            style={{
              position: "absolute",
              top: 20,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "rgba(255, 255, 255, 0.6)",
              marginRight: 0,
              padding: "16px 20px",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              maxWidth: "100%",
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
                  placeholder={t("inputStartPlaceholder")}
                  value={startAddress}
                  onChange={(e) => setStartAddress(e.target.value)}
                />
                <Input
                  placeholder={t("inputEndPlaceholder")}
                  value={endAddress}
                  onChange={(e) => setEndAddress(e.target.value)}
                />
              </Space>
              <Select
                placeholder={t("selectOptionPlaceholder")}
                value={searchOptions}
                onChange={(value) => setSearchOptions(value)}
                style={{ width: 140 }}
              >
                <Select.Option value="normal">{t("optionNormal")}</Select.Option>
                <Select.Option value="byTime">{t("optionByTime")}</Select.Option>
              </Select>
              {searchOptions === "byTime" && (
                <TimePicker
                  placeholder={t("selectStartTimePlaceholder")}
                  value={startTime}
                  onChange={(value) => setStartTime(value)}
                  format="HH:mm:ss"
                  style={{ width: 160 }}
                />
              )}
              <Button
                type="primary"
                shape="round"
                size="large"
                disabled={foundRoute || isAllRoutes ? true : false}
                style={{
                  width: 120,
                  backgroundColor:
                    foundRoute || isAllRoutes ? "#E6E6E6" : "#1677ff",
                  border: "none",
                }}
                onClick={handleCalculate}
              >
                {t("calculateButton")}
              </Button>
            </Space>
          </div>
        ) : null}

        <MapContainer
          center={[22.3165316829187, 114.182081980287]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: "100vh", width: "100%", marginTop: -10, marginBottom: -10}}
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
                <Popup>
                  <div>
                    <strong>{marker.address}</strong>
                    <br />
                    Meter IDs: {marker.meters.map((m) => m.id).join(", ")}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {isAllRoutes
            ? newRoutes?.map((route, routeIndex) => (
                <>
                  <Marker
                    position={[route.startLat, route.startLng]}
                    icon={startIcon}
                  >
                    <Popup>
                      {t("popupStart")} ({routeIndex + 1}): {route.startAddress}
                    </Popup>
                  </Marker>
                  {route.addressMeterSequence.map((waypoint, i) => (
                    <Marker
                      key={`${routeIndex}-waypoint-${i}`}
                      position={[waypoint.lat, waypoint.lng]}
                      icon={createNumberIcon(i + 1)}
                    >
                      <Popup>
                        {t("popupStop")} Stop {i + 1}: {waypoint.address}
                      </Popup>
                    </Marker>
                  ))}
                  <Marker
                    position={[route.endLat, route.endLng]}
                    icon={endIcon}
                  >
                    <Popup>
                      {t("popupEnd")} ({routeIndex + 1}): {route.endAddress}
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={route.polylineCoordinates}
                    pathOptions={{
                      color: DISPATCHER_COLORS_MAP[route.dispatcherId].color,
                      weight: 4,
                    }}
                  />
                </>
              ))
            : selectedDispatcher
            ? (() => {
                if (!foundRoute) return null;
                const color =
                  DISPATCHER_COLORS_MAP[foundRoute.dispatcherId].color;

                return (
                  <>
                    <Marker
                      position={[foundRoute.startLat, foundRoute.startLng]}
                      icon={startIcon}
                    >
                      <Popup>{t("popupStart")}: {foundRoute.startAddress}</Popup>
                    </Marker>
                    {foundRoute.addressMeterSequence.map((wp, i) => (
                      <Marker
                        key={`wp-${i}`}
                        position={[wp.lat, wp.lng]}
                        icon={createNumberIcon(i + 1)}
                      >
                        <Popup>
                          {t("popupStop")} Stop {i + 1}: {wp.address}
                        </Popup>
                      </Marker>
                    ))}
                    <Marker
                      position={[foundRoute.endLat, foundRoute.endLng]}
                      icon={endIcon}
                    >
                      <Popup>{t("popupEnd")}: {foundRoute.endAddress}</Popup>
                    </Marker>
                    <Polyline
                      positions={foundRoute.polylineCoordinates}
                      pathOptions={{
                        color,
                        weight: 4,
                      }}
                    />
                  </>
                );
              })()
            : null}
        </MapContainer>
        {foundRoute && (
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
            🕒 {t("footerTotalTime")}:{" "}
            {foundRoute.total_time >= 60
              ? `${Math.floor(foundRoute.total_time / 60)}h ${
                  foundRoute.total_time % 60
                }m`
              : `${foundRoute.total_time}m`}
          </div>
        )}
      </div>
    );
  }
);

export default OpenStreetMap;