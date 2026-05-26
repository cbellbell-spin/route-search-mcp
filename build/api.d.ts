/**
 * RideWithGPS API client utilities
 */
export interface RideWithGPSConfig {
    apiKey: string;
    authToken: string;
    baseUrl?: string;
}
export declare class RideWithGPSApiError extends Error {
    status: number;
    response?: unknown | undefined;
    constructor(message: string, status: number, response?: unknown | undefined);
}
export declare class RideWithGPSApi {
    private config;
    private baseUrl;
    constructor(config: RideWithGPSConfig);
    private getHeaders;
    getRoutes(params?: {
        page?: number;
        page_size?: number;
        filter_name?: string;
        visibility?: string;
        distance_min?: number;
        distance_max?: number;
        elevation_gain_min?: number;
        elevation_gain_max?: number;
        archived?: boolean;
    }): Promise<RouteSearchResponse>;
    getRoute(id: number): Promise<RouteDetailsResponse>;
    private makeRequest;
}
export interface RouteSearchResponse {
    routes: RouteSummary[];
    meta: {
        pagination: {
            record_count: number;
            page_count: number;
            page_size: number;
            next_page_url: string | null;
        };
    };
}
export interface RouteDetailsResponse {
    route: RouteDetails;
}
export interface RouteSummary {
    id: number;
    url: string;
    html_url: string;
    visibility: string;
    name: string;
    description?: string;
    locality?: string;
    administrative_area?: string;
    country_code?: string;
    distance: number;
    elevation_gain?: number;
    elevation_loss?: number;
    first_lat?: number;
    first_lng?: number;
    last_lat?: number;
    last_lng?: number;
    sw_lat?: number;
    sw_lng?: number;
    ne_lat?: number;
    ne_lng?: number;
    track_type?: string;
    terrain?: string;
    difficulty?: string;
    unpaved_pct?: number;
    surface?: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
}
export interface RouteDetails extends RouteSummary {
    track_points?: TrackPoint[];
}
export interface TrackPoint {
    lat: number;
    lng: number;
    ele?: number;
    t?: number;
}
//# sourceMappingURL=api.d.ts.map