import {
  useState,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import dayjs, { Dayjs } from "dayjs";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { MarkerData } from "../types/markers";
import type { AddressMetersElement, Route } from "../types/route";
import type { Dispatcher } from "../types/dispatchers";
import type { LatLngExpression } from "leaflet";
import type { LatLngTuple } from "leaflet";
import type { MessageInstance } from "antd/es/message/interface";

type TFunction = (key: string) => string;

interface RoutingHookProps {
  orderMarkers: MarkerData[];
  setOrderMarkers: React.Dispatch<React.SetStateAction<MarkerData[]>>;
  setSelectedRowId?: React.Dispatch<React.SetStateAction<number[]>>;
  newRoutes?: Omit<Route, "id">[];
  setNewRoutes?: React.Dispatch<React.SetStateAction<Omit<Route, "id">[]>>;
  selectedDispatcher?: Dispatcher | null;
  isAllRoutes?: boolean;
  message: MessageInstance;
  t: TFunction;
  isCalculating: boolean;
  setIsCalculating: Dispatch<SetStateAction<boolean>>;
}

type Coords = {
  lat: number;
  lng: number;
};

interface BaseOptimizedRouteResult {
  order: number[];
  startCoord: Coords;
  endCoord: Coords;
  segmentTimes: number[];
  totalTime: number;
  totalDistance: number;
}

type TimeOptimizedRouteResult = BaseOptimizedRouteResult & {
  error?: string;
};

export const useRoutingAndGeocoding = ({
  orderMarkers,
  setOrderMarkers,
  setSelectedRowId,
  newRoutes,
  setNewRoutes,
  selectedDispatcher,
  isAllRoutes,
  message,
  t,
  setIsCalculating,
}: RoutingHookProps) => {
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [searchOptions, setSearchOptions] = useState("normal");
  const [startTime, setStartTime] = useState<Dayjs | null>(null);

  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(
    null
  );
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const SERVER_URL = import.meta.env.VITE_SERVER_URL;

  const foundRoute = newRoutes?.find(
    (route) => route.dispatcherId === selectedDispatcher?.id
  );

  useEffect(() => {
    setOptions({ key: GOOGLE_API_KEY });
    const initMapServices = async () => {
      if (typeof google === "undefined" || !google.maps.DirectionsService) {
        await importLibrary("routes");
      }
      directionsServiceRef.current = new google.maps.DirectionsService();
      geocoderRef.current = new google.maps.Geocoder();
    };

    initMapServices();
  }, [GOOGLE_API_KEY]);

  async function geocodeAddress(address: string): Promise<Coords> {
    return new Promise((resolve, reject) => {
      if (!geocoderRef.current) {
        return reject("Geocoder not initialized");
      }
      geocoderRef.current.geocode({ address }, (results, status) => {
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

  async function getOptimizedWaypointOrderByTime(
    startPoint: Coords,
    endPoint: Coords,
    waypoints: {
      lat: number;
      lng: number;
      open: string | null;
      close: string | null;
    }[],
    startTime: string | null
  ): Promise<TimeOptimizedRouteResult> {
    const payload = {
      startPoint,
      waypoints,
      endPoint,
      startTime,
    };
    const response = await fetch(
      `${SERVER_URL}/optimize-route?mode=${searchOptions}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const result: TimeOptimizedRouteResult = await response.json();

    if (result.error) {
      message.error(result.error, 4);

      return {
        order: [],
        startCoord: startPoint,
        endCoord: endPoint,
        segmentTimes: [],
        totalTime: 0,
        totalDistance: 0,
        error: result.error,
      } as TimeOptimizedRouteResult;
    }

    return result;
  }

  const fetchOsrmPolyline = async (
    startCoord: Coords,
    endCoord: Coords,
    orderedWaypoints: Coords[]
  ): Promise<LatLngExpression[]> => {
    const allCoords = [startCoord, ...orderedWaypoints, endCoord]
      .map((c) => `${c.lng},${c.lat}`)
      .join(";");

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${allCoords}?overview=full&geometries=geojson`;

    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as LatLngTuple
      );
    }
    return [];
  };

  const processRouteResult = async (
    optimizedRouteResult: BaseOptimizedRouteResult,
    dispatcherId: number | undefined,
    oMarkers: MarkerData[],
    preCalculatedStartCoord?: Coords,
    preCalculatedEndCoord?: Coords
  ) => {
    const routeOrder = optimizedRouteResult.order;
    const totalTime = optimizedRouteResult.totalTime;
    const totalDistance = optimizedRouteResult.totalDistance;
    const segmentTimes = optimizedRouteResult.segmentTimes;
    const startCoord =
      optimizedRouteResult.startCoord ||
      preCalculatedStartCoord ||
      (await geocodeAddress(startAddress));
    const endCoord =
      optimizedRouteResult.endCoord ||
      preCalculatedEndCoord ||
      (await geocodeAddress(endAddress));
    if (!startCoord || !endCoord) {
      throw new Error("Start or End coordinates are missing.");
    }
    const sortedAddressWithMeters: AddressMetersElement[] = routeOrder.map(
      (i: number) => ({
        address: oMarkers[i].address,
        lat: oMarkers[i].position.lat,
        lng: oMarkers[i].position.lng,
        area: oMarkers[i].area,
        district: oMarkers[i].district,
        meters: oMarkers[i].meters,
      })
    );

    const isOrderInMarkers = (id: number, markers: MarkerData[]) =>
      markers.some((marker) => marker.meters.some((m) => m.id === id));

    setSelectedRowId?.((prev) =>
      prev.filter((id) => !isOrderInMarkers(id, oMarkers))
    );
    setOrderMarkers((prev) =>
      prev.filter((p) => p.dispatcherId !== oMarkers[0]?.dispatcherId)
    );

    const orderedWaypoints: Coords[] = routeOrder.map(
      (i: number) => oMarkers[i].position
    );

    const coordinates = await fetchOsrmPolyline(
      startCoord,
      endCoord,
      orderedWaypoints
    );

    if (coordinates.length === 0) {
      message.error(t("errorNoRouteFound"));
      return;
    }

    const newRoute: Omit<Route, "id"> = {
      dispatcherId: dispatcherId
        ? dispatcherId
        : oMarkers[0]?.dispatcherId ?? selectedDispatcher?.id ?? 0,
      routeDate: dayjs().format("YYYY-MM-DD"),
      optimizationMode: searchOptions,
      startAddress: startAddress,
      endAddress: endAddress,
      startLat: startCoord.lat,
      startLng: startCoord.lng,
      endLat: endCoord.lat,
      endLng: endCoord.lng,
      addressMeterSequence: sortedAddressWithMeters,
      segmentTimes: segmentTimes,
      totalTime: totalTime,
      totalDistance: totalDistance,
      polylineCoordinates: coordinates,
      createdBy: "Admin",
      version: 1,
      is_active: true,
    };

    setNewRoutes?.((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.dispatcherId === newRoute.dispatcherId
      );
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newRoute;
        return updated;
      } else {
        return [...prev, newRoute];
      }
    });
  };

  const calculateRoute = async (dispatcherId?: number) => {
    if (!startAddress || !endAddress) {
      message.error(t("errorStartEndRequired"));
      return;
    }
    setIsCalculating(true);
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
        await processRouteResult(
          optimizedRouteResult,
          dispatcherId,
          oMarkers,
          startCoord,
          endCoord
        );
      }
    } catch (error) {
      console.error("Routing error:", error);
      message.error(t("errorRouteCalculationFailed"));
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCalculate = () => {
    if (!isAllRoutes && !selectedDispatcher) {
      message.error(t("errorRouteCalculationFailed"));
      return;
    }
    if (!startAddress || !endAddress) {
      message.error(t("errorStartEndRequired"));
      return;
    }
    const idToCalculate = selectedDispatcher?.id;
    calculateRoute(idToCalculate);
  };

  return {
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
    geocodeAddress,
    foundRoute,
    setIsCalculating,
  };
};
