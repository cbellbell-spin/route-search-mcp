# RWGPS API Route Search Research

## API Documentation Source
- OpenAPI spec: `https://ridewithgps.com/api/v1/openapi/openapi_routes.yaml`
- Retrieved via WebFetch

## Endpoint Analysis

### Available Routes Endpoints (from OpenAPI spec)
Only three route-related endpoints exist:
1. `GET /api/v1/routes.json` - List user's own routes (paginated)
2. `GET /api/v1/routes/{id}.json` - Get single route details
3. `GET /api/v1/routes/{id}/polyline.json` - Get route polyline

### Filtering Parameters on /routes.json
- `page`, `page_size` - pagination
- `filter_name` - search by route name
- `visibility` - public/private
- `distance_min`, `distance_max` - in meters
- `elevation_gain_min`, `elevation_gain_max` - in meters
- `archived` - boolean

### Geographic Search
**Finding: No geographic search endpoint exists.**
- No `lat`, `lng`, `radius` parameters
- No community route exploration endpoint
- Only bounding box coordinates (`sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`) are returned per route, not used as query filters

### Surface Type Filtering
- `surface` field exists on Route objects (returned)
- No `surface` parameter for filtering in the API spec

### Response Shape (RouteSummary)
```json
{
  "id": 54423870,
  "url": "https://ridewithgps.com/api/v1/routes/54423870.json",
  "html_url": "https://ridewithgps.com/routes/54423870",
  "visibility": "public",
  "name": "2026 Grizzly Peak Century 100 mi",
  "description": "...",
  "locality": "Moraga",
  "administrative_area": "CA",
  "country_code": "US",
  "distance": 165624,  // meters
  "elevation_gain": 2652,  // meters
  "elevation_loss": 2648,
  "first_lat": 37.84256,
  "first_lng": -122.11097,
  "last_lat": 37.84146,
  "last_lng": -122.10977,
  "sw_lat": 37.70891,
  "sw_lng": -122.29545,
  "ne_lat": 38.05567,
  "ne_lng": -122.07372,
  "track_type": "loop",
  "terrain": "climbing",
  "difficulty": "hard",
  "unpaved_pct": 0,
  "surface": "paved",
  "archived": false
}
```

### Rate Limits
- Not documented in the OpenAPI spec
- Standard RideWithGPS API rate limits apply (no public docs found)

## Conclusion
**The RideWithGPS API does NOT provide a public community route search/explore endpoint.**

The API only allows:
1. Fetching routes owned by the authenticated user
2. Fetching details for specific route IDs the user has access to

There is no endpoint to search routes by geographic location (lat/lng + radius), and no way to explore public community routes.

**Implication for route-search-mcp:** The `search_routes_near` tool cannot use a RWGPS API endpoint. Options:
1. Use RWGPS website scraping (not recommended, fragile)
2. Use an alternative API (e.g., Komoot, Strava, RideWithGPS website search)
3. Use user's own routes only (limited utility)

**Decision:** Implement the tool using a best-effort approach with RWGPS's own routes, and note in documentation that community search is not available via API. The `get_route_elevation_profile` tool will work for any route ID the user owns.

## Nominatim Geocoding
- Endpoint: `GET https://nominatim.openstreetmap.org/search`
- Parameters: `q`, `format=json`, `limit`
- Rate limit: 1 request/second (hard limit)
- Tested successfully with "Rocklin,CA" query
- Response includes lat, lon, display_name, boundingbox