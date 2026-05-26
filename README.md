# route-search-mcp

MCP server for searching and analyzing cycling routes with RideWithGPS, plus geocoding via OpenStreetMap Nominatim.

## Overview

Provides three tools:

- **`search_routes_near`** — Find routes near a lat/lng with optional distance, elevation, and surface filters. Note: RWGPS API only returns routes owned by the authenticated user; there is no public community route search endpoint.
- **`get_route_elevation_profile`** — Get elevation characteristics (gain/loss, min/max, sampled profile) for a specific route.
- **`geocode_location`** — Convert a place name to lat/lng via Nominatim.

## Installation

```bash
npm install
npm run build
```

## Environment Variables

| Variable | Description |
|---|---|
| `RWGPS_API_KEY` | RideWithGPS API key (from account settings) |
| `RWGPS_AUTH_TOKEN` | RideWithGPS auth token (from `/api/v1/auth_tokens.json`) |

Both are required. The server exits with a clear error if either is missing.

## Tools

### `search_routes_near`

```
Search cycling routes near a location matching training criteria.
Filters: distance, elevation, surface type, geographic proximity.
Only returns routes owned by the authenticated user.
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `latitude` | number | — | Center point latitude |
| `longitude` | number | — | Center point longitude |
| `radius_km` | number | 25 | Search radius (max 100) |
| `min_distance_km` | number | — | Min route distance (km) |
| `max_distance_km` | number | — | Max route distance (km) |
| `min_elevation_m` | number | — | Min elevation gain (m) |
| `max_elevation_m` | number | — | Max elevation gain (m) |
| `surface_type` | enum | any | `paved` \| `unpaved` \| `any` |
| `limit` | number | 10 | Max results (max 20) |

### `get_route_elevation_profile`

```
Get detailed elevation characteristics for a specific route.
Returns: total gain/loss, min/max elevation, and a sampled
elevation array (max 100 points regardless of track length).
```

| Parameter | Type | Description |
|---|---|---|
| `route_id` | number | Route ID to analyze |

### `geocode_location`

```
Convert a place name to lat/lng using OpenStreetMap Nominatim.
Returns up to 3 matches so the caller can pick the right one.
Rate limit: 1 request/second (hard limit from Nominatim).
No API key required.
```

| Parameter | Type | Description |
|---|---|---|
| `location` | string | Place name (e.g. "Rocklin, CA") |

## API Notes

- **RideWithGPS API** — uses `x-rwgps-api-key` and `x-rwgps-auth-token` headers. Endpoints: `/api/v1/routes.json` (list) and `/api/v1/routes/{id}.json` (details). No public community route search exists.
- **Nominatim** — requires a valid `User-Agent` header. Rate limited to 1 req/sec. See https://nominatim.org/policy/

## Build

```bash
npm run build   # TypeScript → build/
npm start       # Run the server
```