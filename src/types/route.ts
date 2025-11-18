import type { LatLngExpression } from "leaflet";
import type { Order } from "./order";

export interface Route {
  id: number;
  dispatcherId: number;
  routeDate: string; // format: YYYY-MM-DD

  optimizationMode: string;
  startAddress: string;
  endAddress: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  
  orderSequence?: Order[];
  addressMeterSequence: AddressMetersElement[];
  segmentTimes: number[];
  total_time: number;
  total_distance: number;
  polylineCoordinates: LatLngExpression[];
  createdBy: string;

  version: number;
  is_active: boolean;
}

export interface AddressMetersElement { 
  address: string, 
  lat: number, 
  lng: number, 
  area: string,
  district: string,
  meters: Order[]
}