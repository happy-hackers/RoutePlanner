import type { Order } from './order';

export interface DeliveryRoute {
  id: number;
  dispatcherId: number;
  routeDate: string; // "2025-02-01"
  version: number;
  isActive: boolean;
  optimizationMode: 'normal' | 'by_time';
  startAddress: string;
  endAddress: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  orderSequence: Order[]; // Full Order objects with customer data
  segmentTimes: number[]; // [15, 20, 10, 25]
  totalTime: number;
  totalDistance?: number;
  polylineCoordinates?: [number, number][];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface OrderWithSegmentTime extends Order {
  segmentTime?: number; // Travel time to this stop
}
