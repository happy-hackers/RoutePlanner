import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Input, Space, Button, Select, App, TimePicker } from "antd";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { MarkerData } from "../types/markers";
import type { Route } from "../types/route";
import type { Dispatcher } from "../types/dispatchers";
import { generateDispatcherColorsMap } from "../utils/markersUtils";
import { useTranslation } from "react-i18next";
import { useRoutingAndGeocoding } from "./useRoutingAndGeocoding";
import { getSettingInfo } from "../utils/configuration";

import orderedMarkerImg from "../assets/icons/orderedMarker.png";
import startMarkerImg from "../assets/icons/startMarker.png";
import endMarkerImg from "../assets/icons/endMarker.png";

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

export interface MapRef {
  triggerCalculate: (dispatcherId: number) => void;
}

interface SettingConfig {
  useDefaultAddress: boolean;
  startAddress: string;
  endAddress: string;
  mapProvider: string;
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const DISPLAY_WIDTH = 32;
const DISPLAY_HEIGHT = 48;
const ORDERED_MARKER_WIDTH = 75;
const ORDERED_MARKER_HEIGHT = 56;
const START_END_MARKER_SIZE = 56;

const InputBarStyle: React.CSSProperties = {
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
};

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof google !== "undefined" && typeof google.maps !== "undefined") {
      return resolve();
    }

    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).initGoogleMaps = resolve;
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;

    const libraries = ["maps", "routes", "marker"].join(",");

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).initGoogleMaps = () => {
      resolve();
    };

    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

const createMarkerContent = (
  url: string,
  number: number | null,
  width: number,
  height: number
): HTMLElement => {
  const element = document.createElement("div");
  element.style.position = "relative";
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;

  const isNumbered = number !== null;

  const img = document.createElement("img");
  img.src = url;
  img.style.width = "100%";
  img.style.height = "100%";
  element.appendChild(img);

  if (isNumbered) {
    const numberDiv = document.createElement("div");
    numberDiv.textContent = String(number);
    numberDiv.style.position = "absolute";
    numberDiv.style.top = "10px";
    numberDiv.style.left = "70%";
    numberDiv.style.width = "30px";
    numberDiv.style.transform = "translateX(-50%)";
    numberDiv.style.fontWeight = "bold";
    numberDiv.style.color = "white";
    numberDiv.style.fontSize = "12px";
    numberDiv.style.textAlign = "center";
    numberDiv.style.textShadow = "0 0 2px black";

    element.appendChild(numberDiv);
    element.className = "advanced-marker-icon numbered";
  } else {
    element.className = "advanced-marker-icon";
  }

  element.onmouseover = (e) => {
    const target = e.currentTarget as HTMLElement;
    const scaleFactor = 1.8;
    target.style.transformOrigin = "50% 100%";
    target.style.transform = `scale(${scaleFactor})`;
    target.style.transition = "transform 0.1s ease-in-out";
    target.style.zIndex = "9999";
  };
  element.onmouseout = (e) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = "scale(1)";
    target.style.zIndex = "auto";
  };

  return element;
};

const GoogleMap = forwardRef<MapRef, NavigationMapProp>(
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
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<any[]>([]);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    const { t } = useTranslation("openStreetMap");
    const { message } = App.useApp();

    const dispatchers = useSelector(
      (state: RootState) => state.dispatcher.dispatchers
    );
    const DISPATCHER_COLORS_MAP = generateDispatcherColorsMap(dispatchers);

    const {
      startAddress,
      setStartAddress,
      endAddress,
      setEndAddress,
      searchOptions,
      setSearchOptions,
      startTime,
      setStartTime,
      handleCalculate,
      foundRoute,
      calculateRoute,
      calculateRoutebyTime,
    } = useRoutingAndGeocoding({
      orderMarkers,
      setOrderMarkers,
      setSelectedRowId,
      newRoutes,
      setNewRoutes,
      selectedDispatcher,
      isAllRoutes,
      message,
      t,
    });
    
    useEffect(() => {
      const settingInfo: SettingConfig = getSettingInfo();
      if (settingInfo && settingInfo.useDefaultAddress) {
        setStartAddress(settingInfo.startAddress);
        setEndAddress(settingInfo.endAddress);
      }
    }, [setStartAddress, setEndAddress]);

    useImperativeHandle(ref, () => ({
      triggerCalculate(dispatcherId: number) {
        if (foundRoute && foundRoute.optimizationMode === "byTime") {
          calculateRoutebyTime(dispatcherId);
        } else {
          calculateRoute(dispatcherId);
        }
      },
    }));

    const clearMap = useCallback(() => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach((polyline) => polyline.setMap(null));
      polylinesRef.current = [];
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    }, []);

    const addMarkerListener = useCallback(
      (
        marker: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          addListener: (event: string, handler: (e: any) => void) => void;
        },
        content: string
      ) => {
        marker.addListener("click", () => {
          if (infoWindowRef.current && mapInstance.current) {
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open(
              mapInstance.current,
              marker as google.maps.Marker
            );
          }
        });
      },
      []
    );

    useEffect(() => {
      const initializeMap = async () => {
        if (!mapRef.current) return;

        try {
          await loadGoogleMapsScript(GOOGLE_API_KEY);

          const defaultCenter = {
            lat: 22.3165316829187,
            lng: 114.182081980287,
          };

          const map = new google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 13,
            disableDefaultUI: true,
            mapId: "YOUR_MAP_ID_HERE",
          });
          mapInstance.current = map;
          infoWindowRef.current = new google.maps.InfoWindow();
        } catch (error) {
          console.error("Google Maps API failed to load:", error);
          message.error(
            "Google Maps API failed to load. Please check API key and your internet connection."
          );
        }
      };
      initializeMap();
    }, [message]);

    useEffect(() => {
      const map = mapInstance.current;

      if (
        !map ||
        typeof google.maps.marker.AdvancedMarkerElement === "undefined"
      )
        return;

      clearMap();

      const routesToRender = isAllRoutes
        ? newRoutes || []
        : foundRoute
        ? [foundRoute]
        : [];

      const allCoords: google.maps.LatLngLiteral[] = [];
      const assignedPositions = new Set<string>();

      routesToRender.forEach((route) => {
        const color =
          DISPATCHER_COLORS_MAP[route.dispatcherId]?.color || "#0000FF";
        const dispatcherName =
          DISPATCHER_COLORS_MAP[route.dispatcherId]?.name || "";

        const polyline = new google.maps.Polyline({
          path: (route.polylineCoordinates as [number, number][]).map((c) => ({
            lat: c[0],
            lng: c[1],
          })),
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: map,
        });
        polylinesRef.current.push(polyline);

        const startPosition = { lat: route.startLat, lng: route.startLng };
        const startContent = createMarkerContent(
          startMarkerImg,
          null,
          START_END_MARKER_SIZE,
          START_END_MARKER_SIZE
        );

        const startMarker = new google.maps.marker.AdvancedMarkerElement({
          map: map,
          position: startPosition,
          title: t("popupStart") + ": " + route.startAddress,
          content: startContent,
        });

        markersRef.current.push(startMarker);
        allCoords.push(startPosition);
        addMarkerListener(
          startMarker,
          `
          <div style="font-weight: bold;">${t("popupStart")}: ${
            route.startAddress
          }</div>
          <div>${t("dispatcher")}: ${dispatcherName}</div>
          `
        );

        route.addressMeterSequence.forEach((waypoint, i) => {
          const position = { lat: waypoint.lat, lng: waypoint.lng };
          assignedPositions.add(`${waypoint.lat},${waypoint.lng}`);

          const numberedContent = createMarkerContent(
            orderedMarkerImg,
            i + 1,
            ORDERED_MARKER_WIDTH,
            ORDERED_MARKER_HEIGHT
          );

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: map,
            position: position,
            title: t("popupStop") + ` ${i + 1}: ${waypoint.address}`,
            content: numberedContent,
          });
          markersRef.current.push(marker);
          allCoords.push(position);
          addMarkerListener(
            marker,
            `
            <div style="font-weight: bold;">${t("popupStop")} ${i + 1}: ${
              waypoint.address
            }</div>
            <div>${t("dispatcher")}: ${dispatcherName}</div>
            `
          );
        });

        const endPosition = { lat: route.endLat, lng: route.endLng };
        const endContent = createMarkerContent(
          endMarkerImg,
          null,
          START_END_MARKER_SIZE,
          START_END_MARKER_SIZE
        );

        const endMarker = new google.maps.marker.AdvancedMarkerElement({
          map: map,
          position: endPosition,
          title: t("popupEnd") + ": " + route.endAddress,
          content: endContent,
        });
        markersRef.current.push(endMarker);
        allCoords.push(endPosition);
        addMarkerListener(
          endMarker,
          `
          <div style="font-weight: bold;">${t("popupEnd")}: ${
            route.endAddress
          }</div>
          <div>${t("dispatcher")}: ${dispatcherName}</div>
          `
        );
      });

      orderMarkers.forEach((markerData) => {
        const positionKey = `${markerData.position.lat},${markerData.position.lng}`;
        if (routesToRender.length > 0 && assignedPositions.has(positionKey)) {
          return;
        }
        const iconURL = markerData.icon?.url || orderedMarkerImg;
        const dispatcherName = markerData.dispatcherId
          ? DISPATCHER_COLORS_MAP[markerData.dispatcherId]?.name
          : t("unassigned");

        const contentElement = createMarkerContent(
          iconURL,
          null,
          DISPLAY_WIDTH,
          DISPLAY_HEIGHT
        );

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: map,
          position: markerData.position,
          title: markerData.address,
          content: contentElement,
        });

        markersRef.current.push(marker);
        allCoords.push(markerData.position);
        addMarkerListener(
          marker,
          `
            <div style="font-weight: bold;">${markerData.address}</div>
            <div>${t("dispatcher")}: ${dispatcherName}</div>
            `
        );
      });

      if (allCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        allCoords.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }

      return () => {
        clearMap();
      };
    }, [
      orderMarkers,
      newRoutes,
      foundRoute,
      isAllRoutes,
      DISPATCHER_COLORS_MAP,
      t,
      clearMap,
      addMarkerListener,
    ]);

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {isRouteResultsPage ? (
          <div style={InputBarStyle}>
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
                <Select.Option value="normal">
                  {t("optionNormal")}
                </Select.Option>
                <Select.Option value="byTime">
                  {t("optionByTime")}
                </Select.Option>
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
                disabled={!!foundRoute || isAllRoutes}
                style={{
                  width: 120,
                  backgroundColor:
                    !!foundRoute || isAllRoutes ? "#E6E6E6" : "#1677ff",
                  border: "none",
                }}
                onClick={handleCalculate}
              >
                {t("calculateButton")}
              </Button>
            </Space>
          </div>
        ) : null}
        <div
          ref={mapRef}
          style={{
            height: "100vh",
            width: "100%",
            marginTop: -10,
            marginBottom: -10,
          }}
        />

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
            {foundRoute.totalTime >= 60
              ? `${Math.floor(foundRoute.totalTime / 60)}h ${
                  foundRoute.totalTime % 60
                }m`
              : `${foundRoute.totalTime}m`}
          </div>
        )}
      </div>
    );
  }
);

export default GoogleMap;