export interface Customer {
    id: number;
    name: string;
    openTime: string;
    closeTime: string;
    address: string;
    lat: number;
    lng: number;
    postcode?: number;
}