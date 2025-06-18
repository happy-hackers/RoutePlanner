export type MarkerData = {
  id: number;
  position: { lat: number; lng: number };
  address: string;
  icon: { url: string; scaledSize?: any; color: string };
  dispatcherId?: number;
};
