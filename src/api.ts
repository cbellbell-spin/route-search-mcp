/**
 * RideWithGPS API client utilities
 */

export interface RideWithGPSConfig {
  apiKey: string;
  authToken: string;
  baseUrl?: string;
}

export class RideWithGPSApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'RideWithGPSApiError';
  }
}

export class RideWithGPSApi {
  private config: RideWithGPSConfig;
  private baseUrl: string;

  constructor(config: RideWithGPSConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://ridewithgps.com';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-rwgps-api-key': this.config.apiKey,
      'x-rwgps-auth-token': this.config.authToken,
    };
  }

  async getRoutes(params: {
    page?: number;
    page_size?: number;
    filter_name?: string;
    visibility?: string;
    distance_min?: number;
    distance_max?: number;
    elevation_gain_min?: number;
    elevation_gain_max?: number;
    archived?: boolean;
  } = {}): Promise<RouteSearchResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params.filter_name) searchParams.append('name', params.filter_name);
    if (params.visibility) searchParams.append('visibility', params.visibility);
    if (params.distance_min) searchParams.append('distance_min', params.distance_min.toString());
    if (params.distance_max) searchParams.append('distance_max', params.distance_max.toString());
    if (params.elevation_gain_min) searchParams.append('elevation_gain_min', params.elevation_gain_min.toString());
    if (params.elevation_gain_max) searchParams.append('elevation_gain_max', params.elevation_gain_max.toString());
    if (params.archived !== undefined) searchParams.append('archived', String(params.archived));

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/routes.json${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest(endpoint) as Promise<RouteSearchResponse>;
  }

  async getRoute(id: number): Promise<RouteDetailsResponse> {
    return this.makeRequest(`/api/v1/routes/${id}.json`) as Promise<RouteDetailsResponse>;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new RideWithGPSApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return await response.json();
  }
}

// Response types
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