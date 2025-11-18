import { useState, useEffect, useRef } from "react";
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
    (async () => {
      if (typeof google === "undefined" || !google.maps.DirectionsService) {
        await importLibrary("routes");
      }
      directionsServiceRef.current = new google.maps.DirectionsService();
      geocoderRef.current = new google.maps.Geocoder();
    })();
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

  async function getOptimizedWaypointOrder(
    startAddress: string,
    endAddress: string,
    waypoints: Coords[]
  ): Promise<BaseOptimizedRouteResult> {
    return new Promise((resolve, reject) => {
      if (!directionsServiceRef.current) {
        return reject("DirectionsService not initialized");
      }
      directionsServiceRef.current.route(
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
              lat: legs[0].start_location.lat(),
              lng: legs[0].start_location.lng(),
            };
            const endCoord = {
              lat: legs[legs.length - 1].end_location.lat(),
              lng: legs[legs.length - 1].end_location.lng(),
            };
            const order = result.routes[0].waypoint_order;
            let totalDistance = 0;
            let totalTime = 0;
            const segmentTimes = legs.map((leg) =>
              Math.round((leg.duration?.value ?? 0) / 60)
            );
            for (const leg of legs) {
              totalDistance += leg.distance?.value ?? 0;
              totalTime += leg.duration?.value ?? 0;
            }
            totalTime = Math.round(totalTime / 60);
            resolve({
              order,
              startCoord,
              endCoord,
              segmentTimes: segmentTimes,
              totalTime: totalTime,
              totalDistance: totalDistance,
            });
          } else {
            reject(status);
          }
        }
      );
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
    const response = await fetch(`${SERVER_URL}/optimize-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result: TimeOptimizedRouteResult = await response.json();
    if (result.error) message.error(result.error, 4);
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
      total_time: totalTime,
      total_distance: totalDistance,
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

      await processRouteResult(optimizedRouteResult, dispatcherId, oMarkers);
    } catch (error) {
      console.error("Routing error:", error);
      message.error(t("errorRouteCalculationFailed"));
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
    if (searchOptions === "normal") {
      calculateRoute(idToCalculate);
    } else {
      if (!startTime) {
        message.error(t("errorStartTimeRequired"));
        return;
      }
      calculateRoutebyTime(idToCalculate);
    }
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
    calculateRoutebyTime,
    geocodeAddress,
    foundRoute,
  };
};
