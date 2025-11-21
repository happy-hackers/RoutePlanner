import React, { forwardRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import OpenStreetMap from './OpenStreetMap';
import GoogleMap from './GoogleMap';
import type { Route } from '../types/route.ts';
import type { MarkerData } from '../types/markers.ts';
import type { Dispatcher } from '../types/dispatchers';

interface MapProps {
  orderMarkers: MarkerData[];
  setOrderMarkers: React.Dispatch<React.SetStateAction<MarkerData[]>>;
  setSelectedRowId: React.Dispatch<React.SetStateAction<number[]>>;
  isRouteResultsPage: boolean;
  newRoutes: Omit<Route, "id">[];
  setNewRoutes: React.Dispatch<React.SetStateAction<Omit<Route, "id">[]>>;
  isAllRoutes: boolean;
  selectedDispatcher: Dispatcher | null;
}

type MapRef = { triggerCalculate: (dispatcherId?: number) => void };

const DynamicMap = forwardRef<MapRef, MapProps>(
  (props, ref) => {
    const mapType = useSelector((state: RootState) => state.config.mapProvider);
    
    const MapComponent = useMemo(() => {
      if (mapType === 'GoogleMap') {
        return GoogleMap;
      }
      return OpenStreetMap;
    }, [mapType]);

    return (
      <MapComponent {...props} ref={ref} />
    );
  }
);

DynamicMap.displayName = 'DynamicMap';

export default DynamicMap;