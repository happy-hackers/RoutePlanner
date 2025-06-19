export type MarkerData = {
  id: number;
  position: { lat: number; lng: number };
  address: string;
  icon: { url: string; scaledSize?: number; color: string };
  dispatcherId?: number;
};
