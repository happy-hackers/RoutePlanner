import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import { useEffect, useState } from 'react';
import type { DeliveryRoute } from '../../types/delivery-route';
import { CompassOutlined } from '@ant-design/icons';

// Fix Leaflet default icon issue
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button } from 'antd';
import type { AddressMetersElement } from '../../types/route';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DriverMapProps {
  deliveryRoute: DeliveryRoute;
  stops: AddressMetersElement[];
  currentStopIndex: number;
  onStopSelect: (index: number) => void;
}

// Auto-fit bounds component
function AutoFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, {
        paddingTopLeft: [5, 5],
        paddingBottomRight: [5, 260],
      });
    }
  }, [points, map]);

  return null;
}

function RecenterButton({ points }: { points: [number, number][] }) {
  const map = useMap();
  const [bottomOffset, setBottomOffset] = useState(220);

  // Dynamically measure the card height
  useEffect(() => {
    const card = document.getElementById('next-stop-card');
    if (!card) return;

    const observer = new ResizeObserver(() => {
      const rect = card.getBoundingClientRect();
      setBottomOffset(rect.height + 20);
    });

    observer.observe(card);

    const rect = card.getBoundingClientRect();
    setBottomOffset(rect.height + 20);

    return () => observer.disconnect();
  }, []);

  const handleRecenter = () => {
    if (points.length) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, {
        paddingTopLeft: [5, 5],
        paddingBottomRight: [5, 260],
      });
    }
  };

  return (
    <Button
      onClick={handleRecenter}
      icon={<CompassOutlined />}
      style={{
        position: "fixed",
        bottom: bottomOffset,
        right: 16,
        zIndex: 1001,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        width: 48,
        height: 48,
      }}
    />
  );
}

export default function DriverMap({ deliveryRoute, stops, currentStopIndex, onStopSelect }: DriverMapProps) {
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

  const points: [number, number][] = [
    [deliveryRoute.startLat, deliveryRoute.startLng],
    [deliveryRoute.endLat, deliveryRoute.endLng],
    ...deliveryRoute.addressMeterSequence.map((s) => [s.lat, s.lng] as [number, number]),
  ];

  // Polyline coordinates
  const polylineCoords: LatLngExpression[] = deliveryRoute.polylineCoordinates ||
    stops.map(s => [s.lat, s.lng]);

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
      <AutoFitBounds points={points} />
      <RecenterButton points={points} />
      

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
      {stops.map((stop, index) => (
        <Marker
          position={[stop.lat, stop.lng]}
          icon={createNumberedIcon(
            index + 1,
            stop.meters.every(order => order.status === 'Delivered'),
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
