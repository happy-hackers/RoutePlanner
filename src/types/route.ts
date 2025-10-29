import type { LatLngExpression } from "leaflet";

export interface Route {
  dispatcherId: number;
  startPoint: Coordinate;
  endPoint: Coordinate;
  startAddress: string;
  endAddress: string;
  waypoints: Coordinate[];
  waypointsAddresses: string[];
  routeLine: LatLngExpression[]
  segmentTimes: number[];
  total_time: number;
}

interface Coordinate { lat: number; lng: number; }