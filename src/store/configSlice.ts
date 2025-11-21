import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getSettingInfo } from '../utils/configuration';

export type MapProvider = "OpenStreetMap" | "GoogleMap";

export interface ConfigState {
    mapProvider: MapProvider;
}

const initialSettings = getSettingInfo();
const initialState: ConfigState = {
    mapProvider: initialSettings?.mapProvider || "OpenStreetMap",
};

const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {
        setMapProvider: (state, action: PayloadAction<MapProvider>) => {
            state.mapProvider = action.payload;
        },
    },
});

export const { setMapProvider } = configSlice.actions; 
export default configSlice.reducer;