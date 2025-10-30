import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import { useEffect } from 'react';
import type { Order } from '../../types/order';
import type { DeliveryRoute } from '../../types/delivery-route';

// Fix Leaflet default icon issue
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DriverMapProps {
  deliveryRoute: DeliveryRoute;
  orders: Order[];
  currentStopIndex: number;
  onStopSelect: (index: number) => void;
}

// Auto-fit bounds component
function AutoFitBounds({ orders }: { orders: Order[] }) {
  const map = useMap();

  useEffect(() => {
    if (orders.length > 0) {
      const bounds = orders.map(o => [o.lat, o.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [orders, map]);

  return null;
}

export default function DriverMap({ deliveryRoute, orders, currentStopIndex, onStopSelect }: DriverMapProps) {
  // Create numbered icons for markers
  const createNumberedIcon = (number: number, isCompleted: boolean, isCurrent: boolean) => {
    const color = isCompleted ? '#52c41a' : isCurrent ? '#1890ff' : '#000000';
    const bgColor = isCompleted ? '#f6ffed' : isCurrent ? '#e6f7ff' : '#ffffff';

    return L.divIcon({
      html: `<div style="
        background-color: ${bgColor};
        border: 3px solid ${color};
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        color: ${color};
      ">${number}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // Polyline coordinates
  const polylineCoords: LatLngExpression[] = deliveryRoute.polylineCoordinates ||
    orders.map(o => [o.lat, o.lng]);

  return (
    <MapContainer
      center={[22.3165316829187, 114.182081980287]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />

      {/* Auto-fit bounds */}
      <AutoFitBounds orders={orders} />

      {/* Route polyline */}
      {polylineCoords.length > 0 && (
        <Polyline
          positions={polylineCoords}
          color="#1890ff"
          weight={4}
          opacity={0.7}
        />
      )}

      {/* Order markers */}
      {orders.map((order, index) => (
        <Marker
          key={order.id}
          position={[order.lat, order.lng]}
          icon={createNumberedIcon(
            index + 1,
            order.status === 'Delivered',
            index === currentStopIndex
          )}
          eventHandlers={{
            click: () => onStopSelect(index)
          }}
        />
      ))}
    </MapContainer>
  );
}
