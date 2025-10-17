export interface Customer {
    id: number;
    name: string;
    openTime: string;
    closeTime: string;
    area: string;
    district: string;
    detailedAddress: string;
    lat: number;
    lng: number;
    postcode?: number;
}