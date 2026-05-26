/**
 * RideWithGPS API client utilities
 */
export class RideWithGPSApiError extends Error {
    status;
    response;
    constructor(message, status, response) {
        super(message);
        this.status = status;
        this.response = response;
        this.name = 'RideWithGPSApiError';
    }
}
export class RideWithGPSApi {
    config;
    baseUrl;
    constructor(config) {
        this.config = config;
        this.baseUrl = config.baseUrl || 'https://ridewithgps.com';
    }
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-rwgps-api-key': this.config.apiKey,
            'x-rwgps-auth-token': this.config.authToken,
        };
    }
    async getRoutes(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.page)
            searchParams.append('page', params.page.toString());
        if (params.page_size)
            searchParams.append('page_size', params.page_size.toString());
        if (params.filter_name)
            searchParams.append('name', params.filter_name);
        if (params.visibility)
            searchParams.append('visibility', params.visibility);
        if (params.distance_min)
            searchParams.append('distance_min', params.distance_min.toString());
        if (params.distance_max)
            searchParams.append('distance_max', params.distance_max.toString());
        if (params.elevation_gain_min)
            searchParams.append('elevation_gain_min', params.elevation_gain_min.toString());
        if (params.elevation_gain_max)
            searchParams.append('elevation_gain_max', params.elevation_gain_max.toString());
        if (params.archived !== undefined)
            searchParams.append('archived', String(params.archived));
        const queryString = searchParams.toString();
        const endpoint = `/api/v1/routes.json${queryString ? `?${queryString}` : ''}`;
        return this.makeRequest(endpoint);
    }
    async getRoute(id) {
        return this.makeRequest(`/api/v1/routes/${id}.json`);
    }
    async makeRequest(endpoint, options = {}) {
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
            throw new RideWithGPSApiError(`API request failed: ${response.status} ${response.statusText}`, response.status, errorText);
        }
        return await response.json();
    }
}
//# sourceMappingURL=api.js.map