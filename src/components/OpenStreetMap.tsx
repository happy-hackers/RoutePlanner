import {
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useMemo,
  type SetStateAction,
  type Dispatch,
} from "react";
import { Input, Space, Button, Select, App, TimePicker } from "antd";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngTuple, LatLngLiteral } from "leaflet";
import type { MarkerData } from "../types/markers";
import orderedMarkerImg from "../assets/icons/orderedMarker.png";
import startMarkerImg from "../assets/icons/startMarker.png";
import endMarkerImg from "../assets/icons/endMarker.png";
import type { Route } from "../types/route";
import type { Dispatcher } from "../types/dispatchers";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { generateDispatcherColorsMap } from "../utils/markersUtils";
import { useTranslation } from "react-i18next";
import { useRoutingAndGeocoding } from "./useRoutingAndGeocoding";

const ORDERED_ICON_SIZE: [number, number] = [75, 56];
const ORDERED_ICON_ANCHOR: [number, number] = [38, 54];
const START_END_ICON_SIZE: [number, number] = [56, 56];
const START_END_ICON_ANCHOR: [number, number] = [28, 56];

const createInnerHtml = (
  imgUrl: string,
  size: [number, number],
  number?: number
) => {
  return `
    <div class="marker-visual-content" style="
      position: relative; 
      width: ${size[0]}px; 
      height: ${size[1]}px; 
      transform-origin: 50% 100%; 
      transition: none;
    ">
      <img src="${imgUrl}" style="width: 100%; height: 100%; display: block;" />
      ${
        number !== undefined
          ? `
        <div style="
          position: absolute;
          top: 10px;
          left: 70%;
          width: 30px;
          text-align: center;
          font-weight: bold;
          color: white;
          text-shadow: 0 0 2px black;
          transform: translateX(-50%);
        ">
          ${number}
        </div>
      `
          : ""
      }
    </div>
  `;
};

function createNumberIcon(number: number): L.DivIcon {
  return L.divIcon({
    className: "custom-div-icon",
    html: createInnerHtml(orderedMarkerImg, ORDERED_ICON_SIZE, number),
    iconAnchor: ORDERED_ICON_ANCHOR,
    iconSize: ORDERED_ICON_SIZE,
    popupAnchor: [0, -50],
  });
}

const createStartIcon = (): L.DivIcon => {
  return L.divIcon({
    className: "custom-div-icon",
    html: createInnerHtml(startMarkerImg, START_END_ICON_SIZE),
    iconAnchor: START_END_ICON_ANCHOR,
    iconSize: START_END_ICON_SIZE,
    popupAnchor: [0, -50],
  });
};

const createEndIcon = (): L.DivIcon => {
  return L.divIcon({
    className: "custom-div-icon",
    html: createInnerHtml(endMarkerImg, START_END_ICON_SIZE),
    iconAnchor: START_END_ICON_ANCHOR,
    iconSize: START_END_ICON_SIZE,
    popupAnchor: [0, -50],
  });
};

const createGenericDivIcon = (
  imgUrl: string,
  size: [number, number],
  anchor: [number, number]
): L.DivIcon => {
  return L.divIcon({
    className: "custom-div-icon",
    html: createInnerHtml(imgUrl, size),
    iconAnchor: anchor,
    iconSize: size,
    popupAnchor: [1, -34],
  });
};

const startDivIcon = createStartIcon();
const endDivIcon = createEndIcon();

const defaultImgUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const defaultDivIcon = createGenericDivIcon(defaultImgUrl, [25, 41], [12, 41]);

interface NavigationMapProp {
  orderMarkers: MarkerData[];
  setOrderMarkers: React.Dispatch<React.SetStateAction<MarkerData[]>>;
  setSelectedRowId?: React.Dispatch<React.SetStateAction<number[]>>;
  isRouteResultsPage?: boolean;
  newRoutes?: Omit<Route, "id">[];
  setNewRoutes?: React.Dispatch<SetStateAction<Omit<Route, "id">[]>>;
  isAllRoutes?: boolean;
  selectedDispatcher?: Dispatcher | null;
  isCalculating: boolean;
  setIsCalculating: Dispatch<SetStateAction<boolean>>;
  hoveredOrderId?: number | null;
}

interface MapCenteringProps {
  markers: MarkerData[];
  routes?: Omit<Route, "id">[];
}

const MapCentering = ({ markers, routes }: MapCenteringProps) => {
  const map = useMap();

  useEffect(() => {
    const allCoords: LatLngLiteral[] = [];
    markers.forEach((m) => allCoords.push(m.position));
    routes?.forEach((route) => {
      const waypoints = route.addressMeterSequence;
      allCoords.push({ lat: route.startLat, lng: route.startLng });
      allCoords.push({ lat: route.endLat, lng: route.endLng });
      waypoints.forEach((wp) => allCoords.push({ lat: wp.lat, lng: wp.lng }));
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(
        allCoords.map((c) => [c.lat, c.lng] as LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, markers, routes]);

  return null;
};

interface HoverMarkerProps {
  position: L.LatLngExpression;
  icon: L.DivIcon | L.Icon;
  popupContent: string;
  isHovered?: boolean;
}

const HoverMarker: React.FC<HoverMarkerProps> = ({
  position,
  icon,
  popupContent,
  isHovered = false,
}) => {
  const markerRef = useRef<L.Marker | null>(null);
  const SCALE_FACTOR = 1.8;

  const handleMouseOver = () => {
    const marker = markerRef.current;
    if (marker) {
      marker.openPopup();

      const element = marker.getElement();
      if (element) {
        element.style.zIndex = "1000";

        const innerContent = element.querySelector(
          ".marker-visual-content"
        ) as HTMLElement;
        if (innerContent) {
          innerContent.style.transform = `scale(${SCALE_FACTOR})`;
        }
      }
    }
  };

  const handleMouseOut = () => {
    const marker = markerRef.current;
    if (marker) {
      marker.closePopup();

      const element = marker.getElement();
      if (element) {
        element.style.zIndex = "";

        const innerContent = element.querySelector(
          ".marker-visual-content"
        ) as HTMLElement;
        if (innerContent) {
          innerContent.style.transform = "scale(1)";
        }
      }
    }
  };

  useEffect(() => {
    if (isHovered) {
      handleMouseOver();
    } else {
      handleMouseOut();
    }
  }, [isHovered]);

  return (
    <Marker
      position={position}
      icon={icon}
      ref={markerRef}
      eventHandlers={{
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
      }}
    >
      <Popup>{popupContent}</Popup>
    </Marker>
  );
};

interface RouteRendererProps {
  route: Omit<Route, "id">;
  color: string;
  t: (key: string) => string;
}

const RouteRenderer: React.FC<RouteRendererProps> = ({ route, color, t }) => {
  return (
    <>
      <HoverMarker
        position={[route.startLat, route.startLng]}
        icon={startDivIcon}
        popupContent={`${t("popupStart")}: ${route.startAddress}`}
      />

      {route.addressMeterSequence.map((waypoint, i) => {
        const numberIcon = createNumberIcon(i + 1);
        return (
          <HoverMarker
            key={`waypoint-${i}`}
            position={[waypoint.lat, waypoint.lng]}
            icon={numberIcon}
            popupContent={`${t("popupStop")} ${i + 1}: ${waypoint.address}`}
          />
        );
      })}

      <HoverMarker
        position={[route.endLat, route.endLng]}
        icon={endDivIcon}
        popupContent={`${t("popupEnd")}: ${route.endAddress}`}
      />

      <Polyline
        positions={route.polylineCoordinates}
        pathOptions={{ color, weight: 4 }}
      />
    </>
  );
};

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

const TotalTimeStyle: React.CSSProperties = {
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
};

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
      isCalculating,
      setIsCalculating,
      hoveredOrderId,
    }: NavigationMapProp,
    ref
  ) => {
    const { message } = App.useApp();
    const { t } = useTranslation("openStreetMap");

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
      calculateRoute,
      calculateRoutebyTime,
      foundRoute,
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
      isCalculating,
      setIsCalculating,
    });

    const dispatchers = useSelector(
      (state: RootState) => state.dispatcher.dispatchers
    );

    useEffect(() => {
      const settingInfo = localStorage.getItem("settings");
      if (settingInfo) {
        try {
          const settingJson = JSON.parse(settingInfo);
          if (settingJson.useDefaultAddress) {
            setStartAddress(settingJson.startAddress);
            setEndAddress(settingJson.endAddress);
          }
        } catch (error) {
          console.error("Error parsing settings:", error);
        }
      }
    }, [setStartAddress, setEndAddress]);

    const DISPATCHER_COLORS_MAP = useMemo(
      () => generateDispatcherColorsMap(dispatchers),
      [dispatchers]
    );

    useImperativeHandle(ref, () => ({
      triggerCalculate(dispatcherId: number) {
        if (searchOptions === "normal") {
          calculateRoute(dispatcherId);
        } else {
          calculateRoutebyTime(dispatcherId);
        }
      },
      setIsCalculating: setIsCalculating,
    }));

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
                loading={isCalculating}
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
          style={{
            height: "100vh",
            width: "100%",
            marginTop: -10,
            marginBottom: -10,
          }}
        >
          <MapCentering markers={orderMarkers} routes={newRoutes} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {orderMarkers.map((marker, index) => {
            const iconSize: [number, number] = marker.icon?.scaledSize
              ? [marker.icon.scaledSize, marker.icon.scaledSize]
              : [25, 41];

            const iconAnchor: [number, number] = marker.icon?.scaledSize
              ? [marker.icon.scaledSize / 2, marker.icon.scaledSize]
              : [12, 41];

            const divIcon = marker.icon?.url
              ? createGenericDivIcon(marker.icon.url, iconSize, iconAnchor)
              : defaultDivIcon;
            const orderIsHovered = marker.meters.some(
              (meter) => meter.id === hoveredOrderId
            );

            return (
              <HoverMarker
                key={index}
                position={[marker.position.lat, marker.position.lng]}
                icon={divIcon}
                popupContent={marker.address}
                isHovered={orderIsHovered}
              />
            );
          })}

          {isAllRoutes &&
            newRoutes?.map((route, routeIndex) => (
              <RouteRenderer
                key={`route-all-${routeIndex}`}
                route={route}
                color={DISPATCHER_COLORS_MAP[route.dispatcherId].color}
                t={t}
              />
            ))}

          {!isAllRoutes && foundRoute && selectedDispatcher && (
            <RouteRenderer
              route={foundRoute}
              color={DISPATCHER_COLORS_MAP[foundRoute.dispatcherId].color}
              t={t}
            />
          )}
        </MapContainer>
        {foundRoute && (
          <div style={TotalTimeStyle}>
            🕒 {t("footerTotalTime")}:{" "}
            {(foundRoute.totalTime ?? 0) > 0
              ? foundRoute.totalTime >= 60
                ? `${Math.floor(foundRoute.totalTime / 60)}h ${
                    foundRoute.totalTime % 60
                  }m`
                : `${foundRoute.totalTime}m`
              : t("timeNotAvailable")}
          </div>
        )}
      </div>
    );
  }
);

export default OpenStreetMap;
