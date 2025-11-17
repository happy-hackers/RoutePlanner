import {
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useMemo,
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
import type { LatLngTuple, LatLngLiteral, PointExpression } from "leaflet";
import type { MarkerData } from "../types/markers";
import orderedMarkerImg from "../assets/icons/orderedMarker.png";
import startMarkerImg from "../assets/icons/startMarker.png";
import endMarkerImg from "../assets/icons/endMarker.png";
import type { Route } from "../types/route";
import type { Order } from "../types/order";
import type { Dispatcher } from "../types/dispatchers";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { generateDispatcherColorsMap } from "../utils/markersUtils";
import { useTranslation } from "react-i18next";
import { useRoutingAndGeocoding } from "./useRoutingAndGeocoding";


function isDivIcon(icon: L.DivIcon | L.Icon): icon is L.DivIcon {
  return (icon as L.DivIcon).options.html !== undefined;
};

function isIcon(icon: L.DivIcon | L.Icon): icon is L.Icon {
  return (icon as L.Icon).options.iconUrl !== undefined;
};

function createNumberIcon(number: number): L.DivIcon {
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
    iconAnchor: [20, 56],
    iconSize: [40, 56],
  });
}

const startIcon = new L.Icon({
  iconUrl: startMarkerImg,
  iconSize: [40, 56] as PointExpression,
  iconAnchor: [20, 56] as PointExpression,
});

const endIcon = new L.Icon({
  iconUrl: endMarkerImg,
  iconSize: [40, 56] as PointExpression,
  iconAnchor: [20, 56] as PointExpression,
});

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41] as PointExpression,
  iconAnchor: [12, 41] as PointExpression,
  popupAnchor: [1, -34] as PointExpression,
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

interface MapCenteringProps {
  markers: MarkerData[];
  routes?: Omit<Route, "id">[];
}

const MapCentering = ({ markers, routes }: MapCenteringProps) => {
  const map = useMap();

  useEffect(() => {
    const allCoords: LatLngLiteral[] = [];
    markers.forEach(m => allCoords.push(m.position));
    routes?.forEach(route => {
      const orders = route.orderSequence as Order[];
      allCoords.push({ lat: route.startLat, lng: route.startLng });
      allCoords.push({ lat: route.endLat, lng: route.endLng });
      orders.forEach(order => allCoords.push({ lat: order.lat, lng: order.lng }));
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords.map(c => [c.lat, c.lng] as LatLngTuple));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, markers, routes]);

  return null;
};

interface HoverMarkerProps {
  position: L.LatLngExpression;
  icon: L.DivIcon | L.Icon;
  originalIconSize: PointExpression;
  popupContent: string;
}

const HoverMarker: React.FC<HoverMarkerProps> = ({
  position,
  icon,
  originalIconSize,
  popupContent,
}) => {
  const markerRef = useRef<L.Marker | null>(null);
  const originalSizeTuple = originalIconSize as L.PointTuple;

  const largeIconSize: PointExpression = useMemo(() => [
    originalSizeTuple[0] * 1.8,
    originalSizeTuple[1] * 1.8,
  ], [originalSizeTuple]);

  const handleMouseOver = () => {
    if (markerRef.current) {
      if (isIcon(icon)) {
        const newIcon = L.icon({
          iconUrl: icon.options.iconUrl,
          iconSize: largeIconSize,
          iconAnchor: [(largeIconSize as L.PointTuple)[0] / 2, (largeIconSize as L.PointTuple)[1]],
          shadowUrl: icon.options.shadowUrl,
        });
        markerRef.current.setIcon(newIcon);
      } else if (isDivIcon(icon)) {
        const divIconElement = markerRef.current.getElement();
        if (divIconElement) {
          divIconElement.style.transform = `${divIconElement.style.transform} scale(1.5)`;
        }
      }
    }
  };

  const handleMouseOut = () => {
    if (markerRef.current) {
      if (isIcon(icon)) {
        markerRef.current.setIcon(icon as L.Icon);
      } else if (isDivIcon(icon)) {
        const divIconElement = markerRef.current.getElement();
        if (divIconElement) {
          divIconElement.style.transform = divIconElement.style.transform.replace(' scale(1.5)', '');
        }
      }
    }
  };

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

const RouteRenderer: React.FC<RouteRendererProps> = ({ route, color, t }) => (
  <>
    <Marker position={[route.startLat, route.startLng]} icon={startIcon}>
      <Popup>
        {t("popupStart")}: {route.startAddress}
      </Popup>
    </Marker>
    {(route.orderSequence as Order[]).map((order, i) => {
      const numberIcon = createNumberIcon(i + 1);
      const originalSize: PointExpression = numberIcon.options.iconSize || [40, 56];

      return (
        <HoverMarker
          key={`waypoint-${i}`}
          position={[order.lat, order.lng]}
          icon={numberIcon}
          originalIconSize={originalSize}
          popupContent={`${t("popupStop")} ${i + 1}: ${order.detailedAddress}`}
        />
      )
    })}
    <Marker position={[route.endLat, route.endLng]} icon={endIcon}>
      <Popup>
        {t("popupEnd")}: {route.endAddress}
      </Popup>
    </Marker>
    <Polyline
      positions={route.polylineCoordinates}
      pathOptions={{
        color,
        weight: 4,
      }}
    />
  </>
);

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

    const DISPATCHER_COLORS_MAP = useMemo(() => generateDispatcherColorsMap(dispatchers), [dispatchers]);

    useImperativeHandle(ref, () => ({
      triggerCalculate(dispatcherId: number) {
        if (searchOptions === "normal") {
          calculateRoute(dispatcherId);
        } else {
          calculateRoutebyTime(dispatcherId);
        }
      },
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

        <MapContainer
          center={[22.3165316829187, 114.182081980287]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: "100vh", width: "100%", marginTop: -10, marginBottom: -10 }}
        >
          <MapCentering markers={orderMarkers} routes={newRoutes} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {orderMarkers.map((marker, index) => {
            const originalSize: PointExpression = marker.icon?.scaledSize
              ? [marker.icon.scaledSize, marker.icon.scaledSize]
              : [25, 41];

            const leafletIcon = marker.icon
              ? L.icon({
                iconUrl: marker.icon.url,
                iconSize: originalSize,
                iconAnchor: [originalSize[0] / 2, originalSize[1]],
                popupAnchor: [1, -34],
                shadowUrl:
                  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
              })
              : defaultIcon;

            return (
              <HoverMarker
                key={index}
                position={[marker.position.lat, marker.position.lng]}
                icon={leafletIcon}
                originalIconSize={originalSize}
                popupContent={marker.address}
              />
            );
          })}

          {isAllRoutes && newRoutes?.map((route, routeIndex) => (
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
            {foundRoute.total_time >= 60
              ? `${Math.floor(foundRoute.total_time / 60)}h ${foundRoute.total_time % 60
              }m`
              : `${foundRoute.total_time}m`}
          </div>
        )}
      </div>
    );
  }
);

export default OpenStreetMap;