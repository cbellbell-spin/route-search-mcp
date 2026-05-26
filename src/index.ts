/**
 * route-search-mcp: MCP server for cycling route search and analysis
 *
 * Environment variables:
 *   RWGPS_API_KEY    - RideWithGPS API key
 *   RWGPS_AUTH_TOKEN - RideWithGPS authentication token
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RideWithGPSApi, RideWithGPSConfig, RideWithGPSApiError } from "./api.js";

// Constants
const SERVER_NAME = "route-search-mcp";
const SERVER_VERSION = "1.0.0";

// Environment validation
const config: RideWithGPSConfig = {
  apiKey: process.env.RWGPS_API_KEY || "",
  authToken: process.env.RWGPS_AUTH_TOKEN || "",
};

if (!config.apiKey || !config.authToken) {
  console.error("Error: RWGPS_API_KEY and RWGPS_AUTH_TOKEN environment variables are required");
  process.exit(1);
}

const api = new RideWithGPSApi(config);

// Error formatter
function formatError(error: unknown): string {
  if (error instanceof RideWithGPSApiError) {
    return `RideWithGPS API Error (${error.status}): ${error.message}`;
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

// Distance formatting helpers
function metersToKm(meters: number): number {
  return meters / 1000;
}

function truncateDescription(text: string | undefined, maxLen: number = 200): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + "...";
}

// Create MCP server
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool: search_routes_near
// ─────────────────────────────────────────────────────────────────────────────
server.registerTool(
  "search_routes_near",
  {
    title: "Search Routes Near Location",
    description: "Find cycling routes near a geographic location matching training criteria. Searches the user's own routes and filters by distance, elevation, and surface type. Note: RWGPS API does not support community route search—only routes owned by the authenticated user are returned.",
    inputSchema: {
      latitude: z.number().min(-90).max(90).optional().describe("Center point latitude"),
      longitude: z.number().min(-180).max(180).optional().describe("Center point longitude"),
      radius_km: z.number().min(1).max(100).default(25).describe("Search radius in kilometers"),
      min_distance_km: z.number().min(0).optional().describe("Minimum route distance in km"),
      max_distance_km: z.number().min(0).optional().describe("Maximum route distance in km"),
      min_elevation_m: z.number().min(0).optional().describe("Minimum elevation gain in meters"),
      max_elevation_m: z.number().min(0).optional().describe("Maximum elevation gain in meters"),
      surface_type: z.union([z.literal("paved"), z.literal("unpaved"), z.literal("any")]).default("any").describe("Preferred surface type"),
      limit: z.number().min(1).max(20).default(10).describe("Maximum results to return"),
    },
  },
  async ({ latitude, longitude, radius_km, min_distance_km, max_distance_km, min_elevation_m, max_elevation_m, surface_type, limit }) => {
    try {
      // Build filter params
      const filterParams: Parameters<typeof api.getRoutes>[0] = {
        page_size: 50, // fetch more to allow filtering
        visibility: "public",
      };

      if (min_distance_km !== undefined) {
        filterParams.distance_min = min_distance_km * 1000;
      }
      if (max_distance_km !== undefined) {
        filterParams.distance_max = max_distance_km * 1000;
      }
      if (min_elevation_m !== undefined) {
        filterParams.elevation_gain_min = min_elevation_m;
      }
      if (max_elevation_m !== undefined) {
        filterParams.elevation_gain_max = max_elevation_m;
      }

      const response = await api.getRoutes(filterParams);
      let routes = response.routes || [];

      // Client-side filtering for surface and geographic proximity
      if (surface_type === "paved") {
        routes = routes.filter(r => r.surface === "paved" || r.unpaved_pct === 0);
      } else if (surface_type === "unpaved") {
        routes = routes.filter(r => r.surface === "unpaved" || (r.unpaved_pct && r.unpaved_pct > 0));
      }

      // Simple bounding box check for lat/lng proximity
      if (latitude !== undefined && longitude !== undefined && radius_km !== undefined) {
        const latDegPerKm = 1 / 111; // approx degrees per km
        const latRange = radius_km * latDegPerKm;
        const lngRange = radius_km * latDegPerKm / Math.cos(latitude * Math.PI / 180);

        routes = routes.filter(r => {
          if (r.first_lat === undefined || r.first_lng === undefined) return false;
          const dLat = Math.abs(r.first_lat - latitude);
          const dLng = Math.abs(r.first_lng - longitude);
          return dLat <= latRange && dLng <= lngRange;
        });
      }

      // Limit results
      routes = routes.slice(0, limit);

      if (routes.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No routes found matching your criteria. Note: RWGPS API only returns routes owned by the authenticated user.",
          }],
        };
      }

      const resultLines = routes.map((route, i) => {
        const distanceKm = metersToKm(route.distance).toFixed(2);
        const elevationGain = route.elevation_gain ?? 0;
        const surface = route.surface || "unknown";
        const startLat = route.first_lat?.toFixed(6) ?? "unknown";
        const startLng = route.first_lng?.toFixed(6) ?? "unknown";
        const desc = truncateDescription(route.description);

        return [
          `${i + 1}. ${route.name}`,
          `   ID: ${route.id} | Distance: ${distanceKm} km | Elevation: +${elevationGain} m`,
          `   Surface: ${surface} | Type: ${route.track_type || "unknown"} | Terrain: ${route.terrain || "unknown"}`,
          `   Start: ${startLat}, ${startLng}`,
          `   URL: https://ridewithgps.com/routes/${route.id}`,
          desc ? `   Description: ${desc}` : "",
        ].filter(Boolean).join("\n");
      }).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `Found ${routes.length} route(s):\n\n${resultLines}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_route_elevation_profile
// ─────────────────────────────────────────────────────────────────────────────
server.registerTool(
  "get_route_elevation_profile",
  {
    title: "Get Route Elevation Profile",
    description: "Get detailed elevation characteristics for a specific route including total gain/loss, min/max elevation, and a sampled elevation array (max 100 points).",
    inputSchema: {
      route_id: z.number().min(1).describe("The unique ID of the route to analyze"),
    },
  },
  async ({ route_id }) => {
    try {
      const response = await api.getRoute(route_id);
      const route = response.route;

      if (!route) {
        return {
          content: [{
            type: "text",
            text: `Route ${route_id} not found or not accessible.`,
          }],
          isError: true,
        };
      }

      const distanceKm = metersToKm(route.distance).toFixed(2);
      const totalGain = route.elevation_gain ?? 0;
      const totalLoss = route.elevation_loss ?? 0;

      // Extract elevation from track points
      let trackPointsWithElevation: { lat: number; lng: number; ele: number }[] = [];
      if (route.track_points && route.track_points.length > 0) {
        trackPointsWithElevation = route.track_points
          .filter((p: { lat?: number; lng?: number; ele?: number }) => p.lat !== undefined && p.lng !== undefined && p.ele !== undefined)
          .map((p: { lat?: number; lng?: number; ele?: number }) => ({ lat: p.lat!, lng: p.lng!, ele: p.ele! }));
      }

      // Compute min/max elevation
      let minElevation = 0;
      let maxElevation = 0;
      if (trackPointsWithElevation.length > 0) {
        const elevations = trackPointsWithElevation.map(p => p.ele);
        minElevation = Math.min(...elevations);
        maxElevation = Math.max(...elevations);
      }

      // Sample elevation array to max 100 points
      let elevationArray: number[] = [];
      if (trackPointsWithElevation.length > 0) {
        const step = Math.max(1, Math.floor(trackPointsWithElevation.length / 100));
        elevationArray = trackPointsWithElevation
          .filter((_, idx) => idx % step === 0)
          .slice(0, 100)
          .map(p => Math.round(p.ele));
      }

      const profileData = {
        route_id: route.id,
        route_name: route.name,
        distance_km: parseFloat(distanceKm),
        total_gain_m: totalGain,
        total_loss_m: totalLoss,
        max_elevation_m: maxElevation,
        min_elevation_m: minElevation,
        elevation_array: elevationArray,
        track_point_count: trackPointsWithElevation.length,
      };

      return {
        content: [{
          type: "text",
          text: `Elevation Profile for "${route.name}" (ID: ${route_id}):\n\n` +
            `Distance: ${distanceKm} km\n` +
            `Total Gain: +${totalGain} m | Total Loss: -${totalLoss} m\n` +
            `Min Elevation: ${minElevation} m | Max Elevation: ${maxElevation} m\n` +
            `Track Points: ${trackPointsWithElevation.length} (sampled to ${elevationArray.length} for context)` +
            (elevationArray.length > 0 ? `\nElevation Samples (m): [${elevationArray.slice(0, 20).join(", ")}${elevationArray.length > 20 ? "..." : ""}]` : ""),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tool: geocode_location
// ─────────────────────────────────────────────────────────────────────────────
server.registerTool(
  "geocode_location",
  {
    title: "Geocode Location",
    description: "Convert a human-readable place name to lat/lng coordinates using OpenStreetMap Nominatim. Rate limit: 1 request/second. No API key required.",
    inputSchema: {
      location: z.string().min(1).describe("Place name to geocode (e.g. 'Rocklin, CA' or 'Auburn, California')"),
    },
  },
  async ({ location }) => {
    try {
      const params = new URLSearchParams({
        q: location,
        format: "json",
        limit: "3",
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          // Nominatim requires a unique User-Agent; see https://nominatim.org/policy/
          "User-Agent": "route-search-mcp/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
      }

      const results = await response.json() as NominatimResult[];

      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No results found for location: "${location}"`,
          }],
        };
      }

      const output = results.map((r, i) =>
        `${i + 1}. ${r.display_name}\n   Lat: ${r.lat}, Lon: ${r.lon} (${r.type})`
      ).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `Found ${results.length} location(s):\n\n${output}`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});