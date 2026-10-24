"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import {
  Map as MapIcon,
  Layers,
  CircleDot,
  Navigation,
  BatteryCharging,
  Maximize2,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Zap,
  Home,
  X,
} from "lucide-react";

export const MAP_STYLES = [
  {
    id: "dark",
    label: "Dark Matter",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    id: "osm",
    label: "OpenStreetMap",
    url: {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        "osm-tiles": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "osm-tiles-layer",
          type: "raster",
          source: "osm-tiles",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  {
    id: "light",
    label: "OSM Positron",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
];

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function MapView({
  stations = [],
  candidateStations = [],
  routeCoordinates = null,
  routeData = null,
  originLocation = null,
  destLocation = null,
  h3GeoJson = null,
  showH3Overlay = false,
  setShowH3Overlay,
  selectedStation = null,
  onSelectStation,
  onRouteViaStation,
  focusCoordinate = null,
  onViewportChange = null,
  h3Resolution = null,
  showCenterReticle = true,
  communityChargers = [],
  showCommunityChargers = true,
  setShowCommunityChargers = null,
  stationFilterMode = "all", // 'all' | 'community_only' | 'public_only'
  clusteringEnabled = true,
  setClusteringEnabled = null,
  currentStyle = "dark",
  setCurrentStyle = null,
  onClearRoute = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const activePopupRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const stationStopMarkersRef = useRef([]);
  const onViewportChangeRef = useRef(onViewportChange);
  const communityChargersRef = useRef(communityChargers);

  useEffect(() => {
    communityChargersRef.current = communityChargers;
  }, [communityChargers]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  const [showGpsSteps, setShowGpsSteps] = useState(false);
  const [showStopsList, setShowStopsList] = useState(false);

  // Active route details for Google Maps-style navigation HUD
  const activeRouteDetails = useMemo(() => {
    if (!routeData) return null;
    const stops = routeData.charging_stops || (routeData.routed_via_station?.stops || []);
    const batteryWarning = routeData.battery_warning || routeData.battery_parameters?.battery_warning;
    const arrivalSoc = routeData.battery_parameters?.final_arrival_soc ?? routeData.battery_parameters?.direct_arrival_soc ?? 25;

    if (routeData.routed_via_station) {
      return {
        isMultiStop: true,
        summary: routeData.routed_via_station.summary || (stops.length > 0 ? `${stops.length} Charging Stops` : "Corridor via Charging Stop"),
        distanceKm: routeData.routed_via_station.total_distance_km,
        durationMin: routeData.routed_via_station.total_duration_min,
        drivingDurationMin: routeData.routed_via_station.driving_duration_min,
        chargingDurationMin: routeData.routed_via_station.charging_duration_min,
        stationName: routeData.routed_via_station.station_name,
        stationLat: routeData.routed_via_station.station_latitude,
        stationLng: routeData.routed_via_station.station_longitude,
        detourKm: routeData.routed_via_station.detour_km,
        detourMin: routeData.routed_via_station.detour_duration_min,
        steps: routeData.routed_via_station.steps || [],
        stops: stops,
        totalStops: stops.length,
        arrivalSoc: arrivalSoc,
        batteryWarning: batteryWarning,
      };
    }
    if (routeData.direct_route) {
      return {
        isMultiStop: false,
        summary: routeData.direct_route.summary || "Direct Highway Corridor",
        distanceKm: routeData.direct_route.distance_km,
        durationMin: routeData.direct_route.duration_min,
        steps: routeData.direct_route.steps || [],
        stops: [],
        totalStops: 0,
        arrivalSoc: arrivalSoc,
        batteryWarning: batteryWarning,
      };
    }
    return null;
  }, [routeData]);

  // Global window handlers for interactive popup buttons
  useEffect(() => {
    window.zoltraakSelectStation = (id, isCommunity = false) => {
      const matched =
        (isCommunity ? communityChargers.find((c) => c.id === id) : null) ||
        candidateStations.find((s) => s.id === id) ||
        stations.find((s) => s.id === id) ||
        communityChargers.find((c) => c.id === id);
      if (matched && onSelectStation) {
        onSelectStation(matched);
      }
    };

    window.zoltraakRouteViaStation = (id) => {
      const matched =
        candidateStations.find((s) => s.id === id) ||
        stations.find((s) => s.id === id) ||
        communityChargers.find((c) => c.id === id);
      if (matched && onRouteViaStation) {
        onRouteViaStation(matched);
      }
    };

    return () => {
      delete window.zoltraakSelectStation;
      delete window.zoltraakRouteViaStation;
    };
  }, [stations, candidateStations, communityChargers, onSelectStation, onRouteViaStation]);

  // Generate Station Popup HTML
  const getStationPopupHtml = (st) => {
    const isOperational = st.is_operational !== false;
    const statusColor = isOperational ? "#16a34a" : "#d97706";
    const statusBg = isOperational ? "rgba(22, 163, 74, 0.15)" : "rgba(217, 119, 6, 0.15)";
    const statusBorder = isOperational ? "rgba(22, 163, 74, 0.4)" : "rgba(217, 119, 6, 0.4)";
    const statusText = isOperational ? "Operational" : "Unavailable";
    const maxKw = st.max_power_kw ? `${st.max_power_kw} kW` : "Fast Charger";

    let tierBadge = "";
    if (st.tier) {
      const tierColor =
        st.tier === "optimal"
          ? "#16a34a"
          : st.tier === "acceptable"
          ? "#d97706"
          : "#dc2626";
      const tierLabel =
        st.tier_label ||
        (st.tier === "optimal"
          ? "Optimal Stop"
          : st.tier === "acceptable"
          ? "Acceptable Detour"
          : "Not Recommended");

      tierBadge = `
        <div style="margin-top: 6px; padding: 4px 8px; background: #27272a; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
          <span style="color: ${tierColor}; font-weight: 600; display: flex; align-items: center; gap: 5px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${tierColor};"></span>
            ${tierLabel}
          </span>
          <span style="color: #a1a1aa; font-family: monospace;">+${st.detour_km ?? 0} km</span>
        </div>
      `;
    }

    let connectorsHtml = "";
    if (st.connectors && st.connectors.length > 0) {
      const chips = st.connectors
        .map(
          (c) =>
            `<span style="display: inline-block; background: #27272a; border: 1px solid #3f3f46; color: #e4e4e7; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px; margin-bottom: 4px; font-weight: 500;">
              ⚡ ${escapeHtml(c.connector_type || "Plug")} ${c.power_kw ? `${c.power_kw}kW` : ""}
            </span>`
        )
        .join("");
      connectorsHtml = `<div style="margin-top: 6px; display: flex; flex-wrap: wrap;">${chips}</div>`;
    }

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #f4f4f5; min-width: 250px; max-width: 320px; padding: 2px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; border-bottom: 1px solid #27272a; padding-bottom: 6px; margin-bottom: 6px;">
          <div>
            <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff; line-height: 1.25;">${escapeHtml(st.name)}</h4>
            <span style="font-size: 11px; color: #a1a1aa;">${escapeHtml(st.operator_name || "Independent Operator")}</span>
          </div>
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; white-space: nowrap;">
            ${statusText}
          </span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #d4d4d8; margin-bottom: 4px;">
          <span style="color: #a1a1aa;">Max Power:</span>
          <strong style="color: #ffffff; font-size: 12px;">${maxKw}</strong>
        </div>

        ${tierBadge}
        ${connectorsHtml}

        <div style="margin-top: 6px; font-size: 10px; color: #71717a; font-family: monospace; display: flex; align-items: center; justify-content: space-between;">
          <span>H3 Cell:</span>
          <span>${st.h3_cell || "Resolution 8"}</span>
        </div>

        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #27272a; display: flex; gap: 6px;">
          <button 
            type="button"
            onclick="window.zoltraakSelectStation(${st.id})"
            style="flex: 1; padding: 6px 8px; background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer;"
          >
            Details
          </button>
          ${st.tier ? `
            <button 
              type="button"
              onclick="window.zoltraakRouteViaStation(${st.id})"
              style="flex: 1; padding: 6px 8px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer;"
            >
              Add Stop
            </button>
          ` : ""}
        </div>
      </div>
    `;
  };

  // Generate Community Home Charger Popup HTML (Distinct Blue Theme)
  const getCommunityChargerPopupHtml = (st) => {
    const isAvail = st.availability_status === "available";
    const statusColor = isAvail ? "#10b981" : "#d97706";
    const statusBg = isAvail ? "rgba(16, 185, 129, 0.15)" : "rgba(217, 119, 6, 0.15)";
    const statusText = isAvail ? "Available Now" : (st.availability_status || "In Use");
    const price = typeof st.price_per_kwh === "number" ? st.price_per_kwh.toFixed(2) : "11.50";

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #f4f4f5; min-width: 270px; max-width: 320px; padding: 2px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; border-bottom: 1px solid #27272a; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; background: rgba(37, 99, 235, 0.25); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.5);">
              🏠 HOMEOWNER HOST (BLUE)
            </span>
            <span style="font-size: 11px; color: #fbbf24; font-weight: 600;">★ ${st.trust_score || "5.0"}</span>
          </div>
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: ${statusBg}; color: ${statusColor};">
            ${statusText}
          </span>
        </div>

        <div>
          <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff; line-height: 1.25;">${escapeHtml(st.title || st.host_name)}</h4>
          <span style="font-size: 11px; color: #a1a1aa;">Host: ${escapeHtml(st.host_name)} • ${escapeHtml(st.city || "Kerala")}</span>
        </div>

        <div style="margin-top: 8px; padding: 6px 8px; background: rgba(37, 99, 235, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span style="color: #93c5fd; font-size: 11px; font-weight: 500;">Standard Community Rate:</span>
          <strong style="color: #ffffff; font-size: 12px; font-family: monospace;">₹${price} / kWh</strong>
        </div>

        <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #d4d4d8;">
          <span style="color: #a1a1aa;">Queue:</span>
          <span style="color: ${Number(st.queue_count) === 0 ? "#10b981" : "#f59e0b"}; font-weight: 600;">
            ${Number(st.queue_count) === 0 ? "0 waiting (Immediate Access)" : `${st.queue_count} vehicle in queue`}
          </span>
        </div>

        <div style="margin-top: 4px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #d4d4d8;">
          <span style="color: #a1a1aa;">Hardware:</span>
          <strong style="color: #ffffff; font-size: 11px;">⚡ ${st.power_kw} kW • ${escapeHtml(st.connector_type)}</strong>
        </div>

        ${st.access_hours ? `
          <div style="margin-top: 4px; font-size: 10px; color: #a1a1aa;">
            🕒 <strong>Hours:</strong> ${escapeHtml(st.access_hours)}
          </div>
        ` : ""}

        ${st.amenities ? `
          <div style="margin-top: 4px; font-size: 10px; color: #93c5fd;">
            ✨ <strong>Amenities:</strong> ${escapeHtml(st.amenities)}
          </div>
        ` : ""}

        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #27272a; display: flex; gap: 6px;">
          <a 
            href="tel:${st.phone}"
            style="flex: 1; padding: 6px 8px; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 6px; font-size: 11px; font-weight: 500; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px;"
          >
            <span>📞 Call Host</span>
          </a>
          <button 
            type="button"
            onclick="window.zoltraakSelectStation && window.zoltraakSelectStation(${st.id}, true)"
            style="flex: 1; padding: 6px 8px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer;"
          >
            Details & Report
          </button>
        </div>
      </div>
    `;
  };

  // Generate H3 Cell Popup HTML
  const getH3CellPopupHtml = (cellProps) => {
    const cellId = cellProps.h3_cell;
    const stationsInCell = stations.filter((s) => s.h3_cell === cellId);
    const stationCount = cellProps.station_count || stationsInCell.length;

    const listItems = stationsInCell.slice(0, 5).map((st) => `
      <li style="margin-bottom: 4px; padding: 4px 6px; background: #27272a; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 500; color: #e4e4e7; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(st.name)}
        </span>
        <button 
          type="button"
          onclick="window.zoltraakSelectStation(${st.id})"
          style="padding: 2px 6px; background: #3f3f46; border: none; color: #f4f4f5; border-radius: 3px; font-size: 10px; font-weight: 500; cursor: pointer;"
        >
          View
        </button>
      </li>
    `).join("");

    const remaining = stationCount - stationsInCell.slice(0, 5).length;

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #f4f4f5; min-width: 250px; padding: 2px;">
        <div style="border-bottom: 1px solid #27272a; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="color: #f4f4f5; font-size: 12px;">H3 Hexagon Cell</strong>
            <span style="font-size: 10px; color: #71717a; font-family: monospace;">Res 8</span>
          </div>
          <code style="font-size: 11px; background: #27272a; padding: 2px 6px; border-radius: 4px; color: #a1a1aa; display: inline-block; margin-top: 3px;">
            ${cellId}
          </code>
        </div>

        <div style="margin-bottom: 6px; font-size: 11px; color: #d4d4d8; display: flex; justify-content: space-between;">
          <span style="color: #a1a1aa;">Stations in Cell:</span>
          <strong style="color: #ffffff; font-size: 12px;">${stationCount}</strong>
        </div>

        ${stationsInCell.length > 0 ? `
          <div style="margin-top: 6px;">
            <span style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 600;">Stations:</span>
            <ul style="list-style: none; padding: 0; margin: 4px 0 0 0;">
              ${listItems}
            </ul>
            ${remaining > 0 ? `<p style="font-size: 10px; color: #71717a; margin: 4px 0 0 0;">+ ${remaining} more stations</p>` : ""}
          </div>
        ` : ""}
      </div>
    `;
  };

  // Add Google Maps GPS navigation road layers (Crisp, solid, clean)
  const addRouteLayers = (map) => {
    if (!map.getSource("route-source")) {
      map.addSource("route-source", {
        type: "geojson",
        data: convertRouteToGeoJson(routeCoordinates),
      });
    }

    // Layer 1: Solid Dark Royal Navy Road Casing (No blur)
    if (!map.getLayer("route-casing")) {
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#1e3a8a",
          "line-width": 8,
          "line-opacity": 0.95,
        },
      });
    }

    // Layer 2: Vibrant Solid Google Maps Electric Blue Navigation Core
    if (!map.getLayer("route-core")) {
      map.addLayer({
        id: "route-core",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#2563eb",
          "line-width": 5,
        },
      });
    }

    // Layer 3: Clean Inner Guidance Track
    if (!map.getLayer("route-inner-track")) {
      map.addLayer({
        id: "route-inner-track",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#93c5fd",
          "line-width": 1.5,
          "line-opacity": 0.6,
        },
      });
    }
  };

  // Re-add stations source and layers
  const addStationsSourceAndLayers = (map, isClustered) => {
    const layerIds = [
      "station-cluster-count",
      "station-clusters",
      "station-clusters-halo",
      "stations-halo",
      "stations-circles",
    ];
    layerIds.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource("stations-source")) {
      map.removeSource("stations-source");
    }

    map.addSource("stations-source", {
      type: "geojson",
      data: convertStationsToGeoJson(stations, candidateStations),
      cluster: isClustered,
      clusterMaxZoom: 11,
      clusterRadius: 50,
    });

    if (isClustered) {
      map.addLayer({
        id: "station-clusters-halo",
        type: "circle",
        source: "stations-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#10b981",
            10, "#0d9488",
            30, "#2563eb",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            22,
            10, 28,
            30, 36,
          ],
          "circle-opacity": 0.3,
          "circle-blur": 0.5,
        },
      });

      map.addLayer({
        id: "station-clusters",
        type: "circle",
        source: "stations-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#10b981",
            10, "#0d9488",
            30, "#2563eb",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            10, 22,
            30, 28,
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "station-cluster-count",
        type: "symbol",
        source: "stations-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });
    }

    const unclusteredFilter = isClustered ? ["!", ["has", "point_count"]] : null;

    map.addLayer({
      id: "stations-halo",
      type: "circle",
      source: "stations-source",
      ...(unclusteredFilter ? { filter: unclusteredFilter } : {}),
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 12, 14, 16, 18],
        "circle-color": [
          "match",
          ["get", "tier"],
          "optimal", "#10b981",
          "acceptable", "#f59e0b",
          "suboptimal", "#ef4444",
          "#10b981",
        ],
        "circle-opacity": 0.25,
        "circle-blur": 0.5,
      },
    });

    map.addLayer({
      id: "stations-circles",
      type: "circle",
      source: "stations-source",
      ...(unclusteredFilter ? { filter: unclusteredFilter } : {}),
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4.5, 11, 7.5, 15, 10],
        "circle-color": [
          "match",
          ["get", "tier"],
          "optimal", "#10b981",
          "acceptable", "#f59e0b",
          "suboptimal", "#ef4444",
          "#10b981",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  };

  // Add all layers
  const addAllLayers = (map) => {
    // 1. H3 Hexagons (Base analytical layer)
    if (!map.getSource("h3-grid-source")) {
      map.addSource("h3-grid-source", {
        type: "geojson",
        data: h3GeoJson || { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "h3-hexagons-fill",
        type: "fill",
        source: "h3-grid-source",
        layout: { visibility: showH3Overlay ? "visible" : "none" },
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["get", "station_count"],
            1, 0.12,
            5, 0.25,
            10, 0.38,
          ],
        },
      });

      map.addLayer({
        id: "h3-hexagons-line",
        type: "line",
        source: "h3-grid-source",
        layout: { visibility: showH3Overlay ? "visible" : "none" },
        paint: {
          "line-color": "#34d399",
          "line-width": 1.5,
          "line-opacity": 0.75,
        },
      });
    }

    // 2. OSRM Google Maps GPS Route Polylines
    addRouteLayers(map);

    // 3. Stations & Clusters
    addStationsSourceAndLayers(map, clusteringEnabled);

    // 4. Community Home EV Chargers (Distinct Violet Styling)
    addCommunityChargersSourceAndLayers(map);
  };

  // Add Community Home Chargers Source and Layers
  const addCommunityChargersSourceAndLayers = (map) => {
    if (!map.getSource("community-chargers-source")) {
      map.addSource("community-chargers-source", {
        type: "geojson",
        data: convertCommunityChargersToGeoJson(communityChargers),
      });
    }

    if (!map.getLayer("community-chargers-halo")) {
      map.addLayer({
        id: "community-chargers-halo",
        type: "circle",
        source: "community-chargers-source",
        layout: { visibility: showCommunityChargers ? "visible" : "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 8, 12, 16, 16, 22],
          "circle-color": "#38bdf8",
          "circle-opacity": 0.4,
          "circle-blur": 0.4,
        },
      });
    }

    if (!map.getLayer("community-chargers-circle")) {
      map.addLayer({
        id: "community-chargers-circle",
        type: "circle",
        source: "community-chargers-source",
        layout: { visibility: showCommunityChargers ? "visible" : "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 11, 9, 15, 13],
          "circle-color": "#2563eb",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  };

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyleObj = MAP_STYLES.find((s) => s.id === currentStyle) || MAP_STYLES[0];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyleObj.url,
      center: [76.5, 10.3],
      zoom: 7.5,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      addAllLayers(map);

      // Cluster click -> Zoom in
      map.on("click", "station-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["station-clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource("stations-source");
        if (source && source.getClusterExpansionZoom) {
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: Math.max(zoom, map.getZoom() + 1.5),
              duration: 500,
            });
          });
        }
      });

      // Individual Station Marker Click -> Popup & Drawer
      map.on("click", "stations-circles", (e) => {
        if (!e.features || !e.features.length) return;
        const feature = e.features[0];
        const stationId = feature.properties.id;
        const coordinates = feature.geometry.coordinates.slice();

        const matched =
          candidateStations.find((s) => s.id === stationId) ||
          stations.find((s) => s.id === stationId);

        if (matched) {
          onSelectStation(matched);

          if (activePopupRef.current) {
            activePopupRef.current.remove();
          }

          const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            offset: 14,
            maxWidth: "340px",
          })
            .setLngLat(coordinates)
            .setHTML(getStationPopupHtml(matched))
            .addTo(map);

          activePopupRef.current = popup;
        }
      });

      // H3 Hexagon Click (on empty space) -> H3 analysis popup
      map.on("click", "h3-hexagons-fill", (e) => {
        const clickedMarker = map.queryRenderedFeatures(e.point, {
          layers: ["stations-circles", "station-clusters"],
        });
        if (clickedMarker && clickedMarker.length > 0) return;
        if (!e.features || !e.features.length) return;

        const props = e.features[0].properties;
        if (activePopupRef.current) {
          activePopupRef.current.remove();
        }

        const popup = new maplibregl.Popup({
          closeButton: true,
          offset: 10,
          maxWidth: "320px",
        })
          .setLngLat(e.lngLat)
          .setHTML(getH3CellPopupHtml(props))
          .addTo(map);

        activePopupRef.current = popup;
      });

      // Community Charger Marker Click -> Blue Popup & Select Station
      map.on("click", "community-chargers-circle", (e) => {
        if (!e.features || !e.features.length) return;
        const props = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates.slice();

        const matched = communityChargers.find((c) => c.id === props.id) || {
          ...props,
          is_community_host: true,
        };

        if (onSelectStation) {
          onSelectStation(matched);
        }

        if (activePopupRef.current) {
          activePopupRef.current.remove();
        }

        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          offset: 14,
          maxWidth: "340px",
        })
          .setLngLat(coordinates)
          .setHTML(getCommunityChargerPopupHtml(props))
          .addTo(map);

        activePopupRef.current = popup;
      });

      // Pointer cursors
      map.on("mouseenter", "stations-circles", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "stations-circles", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "station-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "station-clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "h3-hexagons-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "h3-hexagons-fill", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "community-chargers-circle", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "community-chargers-circle", () => { map.getCanvas().style.cursor = ""; });
      // Viewport movement & zoom change listener
      const handleMoveEnd = () => {
        if (!map) return;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bounds = map.getBounds();
        if (onViewportChangeRef.current) {
          onViewportChangeRef.current({
            latitude: center.lat,
            longitude: center.lng,
            zoom: zoom,
            bounds: {
              min_lat: bounds.getSouth(),
              max_lat: bounds.getNorth(),
              min_lng: bounds.getWest(),
              max_lng: bounds.getEast(),
            },
          });
        }
      };

      map.on("moveend", handleMoveEnd);

      // Trigger initial viewport notification once loaded
      handleMoveEnd();

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle Style Switching
  const handleStyleChange = (newStyleId) => {
    if (!mapRef.current || newStyleId === currentStyle) return;
    const target = MAP_STYLES.find((s) => s.id === newStyleId);
    if (!target) return;

    if (setCurrentStyle) {
      setCurrentStyle(newStyleId);
    }
    mapRef.current.setStyle(target.url);
    mapRef.current.once("style.load", () => {
      addAllLayers(mapRef.current);
    });
  };

  // Handle Clustering Toggle
  const handleToggleClustering = () => {
    const nextState = !clusteringEnabled;
    if (setClusteringEnabled) {
      setClusteringEnabled(nextState);
    }
    if (mapRef.current) {
      addStationsSourceAndLayers(mapRef.current, nextState);
    }
  };

  // Sync style changes from external controls
  const prevStyleRef = useRef(currentStyle);
  useEffect(() => {
    if (!mapRef.current || prevStyleRef.current === currentStyle) return;
    prevStyleRef.current = currentStyle;
    const target = MAP_STYLES.find((s) => s.id === currentStyle);
    if (target) {
      mapRef.current.setStyle(target.url);
      mapRef.current.once("style.load", () => {
        addAllLayers(mapRef.current);
      });
    }
  }, [currentStyle]);

  // Sync clustering changes from external controls
  const prevClusterRef = useRef(clusteringEnabled);
  useEffect(() => {
    if (!mapRef.current || prevClusterRef.current === clusteringEnabled) return;
    prevClusterRef.current = clusteringEnabled;
    addStationsSourceAndLayers(mapRef.current, clusteringEnabled);
  }, [clusteringEnabled]);

  // Center camera on full active route bounds
  const handleFitRouteBounds = () => {
    if (!mapRef.current || !routeCoordinates || routeCoordinates.length < 2) return;
    const bounds = new maplibregl.LngLatBounds();
    routeCoordinates.forEach((coord) => bounds.extend(coord));
    mapRef.current.fitBounds(bounds, {
      padding: { top: 140, bottom: 90, left: 470, right: 90 },
      duration: 1200,
      maxZoom: 14,
    });
  };

  // Update Stations Source Data
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("stations-source");
    if (source) {
      source.setData(convertStationsToGeoJson(stations, candidateStations));
    }
  }, [stations, candidateStations]);

  // Update Route Polyline Source Data & auto-fit
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Check if route-source exists; if not, add it
    if (!map.getSource("route-source")) {
      addRouteLayers(map);
    } else {
      map.getSource("route-source").setData(convertRouteToGeoJson(routeCoordinates));
    }

    if (routeCoordinates && routeCoordinates.length > 1) {
      handleFitRouteBounds();
    }
  }, [routeCoordinates]);

  // Update Origin (A), Stop (S), and Destination (B) Pins
  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Origin Pin A
    if (originLocation) {
      if (!originMarkerRef.current) {
        const el = document.createElement("div");
        el.className =
          "w-5 h-5 rounded-full bg-emerald-600 border border-white shadow-md flex items-center justify-center font-bold text-[10px] text-white";
        el.innerText = "A";
        originMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([originLocation.longitude, originLocation.latitude])
          .addTo(mapRef.current);
      } else {
        originMarkerRef.current.setLngLat([originLocation.longitude, originLocation.latitude]);
      }
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    // 2. Charging Stop Pins (Supports multiple charging stops along the corridor)
    if (stationStopMarkersRef.current.length > 0) {
      stationStopMarkersRef.current.forEach((m) => m.remove());
      stationStopMarkersRef.current = [];
    }

    if (activeRouteDetails?.stops && activeRouteDetails.stops.length > 0) {
      activeRouteDetails.stops.forEach((stop, idx) => {
        const el = document.createElement("div");
        const isComm = stop.is_community_host;
        el.className = `px-2 py-0.5 rounded-full border border-white shadow-xl flex items-center gap-1 font-semibold text-[10px] text-white cursor-pointer transition-transform hover:scale-105 ${
          isComm ? "bg-blue-600" : "bg-amber-600"
        }`;
        el.innerHTML = `<span>${isComm ? "🏠" : "⚡"}</span><span>Stop ${stop.stop_number || idx + 1}: ${escapeHtml((stop.name || "").split(" ")[0])}</span>`;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.longitude, stop.latitude])
          .addTo(mapRef.current);
        stationStopMarkersRef.current.push(marker);
      });
    } else if (activeRouteDetails?.isMultiStop && activeRouteDetails.stationLat) {
      const el = document.createElement("div");
      el.className =
        "px-2 py-0.5 rounded-full bg-amber-500 border border-white shadow-md flex items-center gap-1 font-semibold text-[10px] text-zinc-950";
      el.innerHTML = `<span>⚡</span><span>${escapeHtml(activeRouteDetails.stationName.split(" ")[0])}</span>`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([activeRouteDetails.stationLng, activeRouteDetails.stationLat])
        .addTo(mapRef.current);
      stationStopMarkersRef.current.push(marker);
    }

    // 3. Destination Pin B
    if (destLocation) {
      if (!destMarkerRef.current) {
        const el = document.createElement("div");
        el.className =
          "w-5 h-5 rounded-full bg-rose-600 border border-white shadow-md flex items-center justify-center font-bold text-[10px] text-white";
        el.innerText = "B";
        destMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([destLocation.longitude, destLocation.latitude])
          .addTo(mapRef.current);
      } else {
        destMarkerRef.current.setLngLat([destLocation.longitude, destLocation.latitude]);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
  }, [originLocation, destLocation, activeRouteDetails]);

  // Update H3 GeoJSON Source Data
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("h3-grid-source");
    if (source && h3GeoJson) {
      source.setData(h3GeoJson);
    }
  }, [h3GeoJson]);

  // Toggle H3 Hexagon Overlay Visibility
  useEffect(() => {
    if (!mapRef.current) return;
    const visibility = showH3Overlay ? "visible" : "none";
    if (mapRef.current.getLayer("h3-hexagons-fill")) {
      mapRef.current.setLayoutProperty("h3-hexagons-fill", "visibility", visibility);
    }
    if (mapRef.current.getLayer("h3-hexagons-line")) {
      mapRef.current.setLayoutProperty("h3-hexagons-line", "visibility", visibility);
    }
  }, [showH3Overlay]);

  // Update Community Home Chargers Source Data
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateCommData = () => {
      const source = map.getSource("community-chargers-source");
      if (source) {
        source.setData(convertCommunityChargersToGeoJson(communityChargers));
      } else if (map.isStyleLoaded()) {
        addCommunityChargersSourceAndLayers(map);
      }
    };

    if (map.isStyleLoaded()) {
      updateCommData();
    } else {
      map.once("styledata", updateCommData);
    }
  }, [communityChargers]);

  // Toggle Community & Public Station Layers based on stationFilterMode
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const showCommunity =
      stationFilterMode === "community_only"
        ? true
        : stationFilterMode === "public_only"
        ? false
        : showCommunityChargers;

    const showPublic = stationFilterMode !== "community_only";

    const commVis = showCommunity ? "visible" : "none";
    if (map.getLayer("community-chargers-halo")) {
      map.setLayoutProperty("community-chargers-halo", "visibility", commVis);
    }
    if (map.getLayer("community-chargers-circle")) {
      map.setLayoutProperty("community-chargers-circle", "visibility", commVis);
    }

    const pubVis = showPublic ? "visible" : "none";
    const pubLayers = [
      "stations-circles",
      "stations-halo",
      "station-clusters",
      "station-clusters-halo",
      "station-cluster-count",
    ];
    pubLayers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", pubVis);
      }
    });
  }, [showCommunityChargers, stationFilterMode]);

  // Handle Focus Coordinate
  useEffect(() => {
    if (!mapRef.current || !focusCoordinate) return;
    const [lng, lat] = focusCoordinate;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 14,
      essential: true,
      duration: 1500,
    });
  }, [focusCoordinate]);

  return (
    <div className="relative w-full h-full">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Viewport Center Crosshair Reticle (In Non-Routing Exploration Mode) */}
      {showCenterReticle && !routeCoordinates && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative flex flex-col items-center justify-center -translate-y-2">
            {/* Center crosshair and pulse */}
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-blue-500/30 bg-blue-500/5 animate-ping opacity-75" />
              <div className="absolute w-6 h-6 rounded-full border border-blue-400/50" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shadow-md" />
              <div className="absolute -left-3 w-2 h-[1px] bg-blue-400/70" />
              <div className="absolute -right-3 w-2 h-[1px] bg-blue-400/70" />
              <div className="absolute -top-3 h-2 w-[1px] bg-blue-400/70" />
              <div className="absolute -bottom-3 h-2 w-[1px] bg-blue-400/70" />
            </div>

            {/* Viewport center pill */}
            <div className="mt-2 px-2 py-0.5 rounded-full bg-zinc-950/90 border border-zinc-800 text-[10px] text-zinc-300 font-mono shadow-md flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Viewport Center</span>
            </div>
          </div>
        </div>
      )}

      {/* Uber H3 Dynamic Resolution HUD Badge */}
      {showH3Overlay && (
        <div className="absolute top-20 right-4 z-20 pointer-events-none">
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg p-2.5 shadow-lg flex items-center gap-2.5 text-xs pointer-events-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="font-semibold text-zinc-100 flex items-center gap-2">
                <span>Uber H3 Spatial Grid</span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 text-[10px] font-mono">
                  Res {h3Resolution ?? 8}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Subdivides on zoom-in • Aggregates on zoom-out
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps GPS Navigation Floating Banner */}
      {activeRouteDetails && (
        <div className="absolute top-28 left-3 right-3 sm:left-auto sm:right-6 sm:w-[480px] z-20 flex flex-col pointer-events-none animate-in slide-in-from-top-2 duration-200">
          {/* Critical Battery Warning Banner */}
          {activeRouteDetails.batteryWarning && (
            <div className="bg-rose-950/95 backdrop-blur-md border border-rose-700/80 rounded-2xl shadow-2xl p-3 px-3.5 mb-2 pointer-events-auto w-full text-xs animate-in slide-in-from-top-1">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold">⚠️</span>
                </div>
                <div>
                  <p className="font-bold text-rose-100">{activeRouteDetails.batteryWarning.title}</p>
                  <p className="text-[11px] text-rose-300 mt-0.5 leading-relaxed">{activeRouteDetails.batteryWarning.message}</p>
                  {activeRouteDetails.batteryWarning.available_range_km && (
                    <div className="mt-1.5 flex gap-3 text-[10px] font-mono text-rose-400">
                      <span>Available Range: ~{activeRouteDetails.batteryWarning.available_range_km} km</span>
                      {activeRouteDetails.batteryWarning.nearest_station_km && (
                        <span>Nearest Charger: {activeRouteDetails.batteryWarning.nearest_station_km} km</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl p-3 px-3.5 flex flex-wrap items-center justify-between gap-3 pointer-events-auto w-full text-xs">
            {/* Left: Direction Icon & Highway Summary */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                <Navigation className="w-4 h-4 -rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-zinc-100">
                    {activeRouteDetails.summary}
                  </span>
                  {activeRouteDetails.totalStops > 0 ? (
                    <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 text-[10px] font-medium">
                      {activeRouteDetails.totalStops} {activeRouteDetails.totalStops === 1 ? "Stop" : "Stops"}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[10px] font-medium">
                      Direct Route
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                  <span className="text-zinc-200 font-medium font-mono">
                    {activeRouteDetails.distanceKm} km
                  </span>
                  <span>•</span>
                  <span className="text-zinc-300 font-mono">
                    {Math.floor(activeRouteDetails.durationMin / 60) > 0
                      ? `${Math.floor(activeRouteDetails.durationMin / 60)}h ${Math.round(activeRouteDetails.durationMin % 60)}m`
                      : `${Math.round(activeRouteDetails.durationMin)}m`}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-mono">
                    ~{activeRouteDetails.arrivalSoc}% Arrival SoC
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 ml-auto">
              {activeRouteDetails.stops?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowStopsList(!showStopsList)}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stops ({activeRouteDetails.stops.length})</span>
                  {showStopsList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              {activeRouteDetails.steps?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowGpsSteps(!showGpsSteps)}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
                >
                  <CornerDownRight className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Steps ({activeRouteDetails.steps.length})</span>
                  {showGpsSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              <button
                type="button"
                onClick={handleFitRouteBounds}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                title="Fit route in view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              {onClearRoute && (
                <button
                  type="button"
                  onClick={onClearRoute}
                  className="p-1.5 bg-zinc-900 hover:bg-rose-950/80 hover:text-rose-400 border border-zinc-800 text-zinc-400 rounded-lg transition-colors"
                  title="Clear Active Route"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Planned Charging Stops Dropdown Sheet */}
          {showStopsList && activeRouteDetails.stops?.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl p-3 mt-1.5 max-w-2xl w-full max-h-72 overflow-y-auto pointer-events-auto space-y-1.5 text-xs animate-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <span>Multi-Stop Charging Itinerary</span>
                <span className="text-amber-400 font-mono">+{activeRouteDetails.chargingDurationMin}m Total Charging</span>
              </div>
              {activeRouteDetails.stops.map((stop, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      stop.is_community_host ? "bg-blue-600 text-white" : "bg-amber-600 text-white"
                    }`}>
                      {stop.stop_number || idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-zinc-100 text-xs">{stop.name}</p>
                      <p className="text-[10px] text-zinc-400">
                        {stop.is_community_host ? "🏠 Community Home Host" : "⚡ Public Fast Charger"} • {stop.max_power_kw} kW
                        {stop.city ? ` • ${stop.city}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono shrink-0">
                    <span className="text-rose-400">{stop.arrival_soc}%</span>
                    <span className="text-zinc-500"> ➔ </span>
                    <span className="text-emerald-400">{stop.departure_soc}%</span>
                    <p className="text-zinc-400">+{stop.charge_time_min} mins</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Turn-by-Turn GPS Directions Dropdown Sheet */}
          {showGpsSteps && activeRouteDetails.steps?.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl p-3 mt-1.5 max-w-2xl w-full max-h-72 overflow-y-auto pointer-events-auto space-y-1 text-xs animate-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <span>Turn-by-Turn Directions</span>
                <span className="text-zinc-400 font-mono">{activeRouteDetails.steps.length} Maneuvers</span>
              </div>
              {activeRouteDetails.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg flex items-start gap-2.5 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-mono font-medium text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-200 text-xs">{step.instruction}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {step.distance_km > 0 ? `${step.distance_km} km` : ""}
                      {step.duration_min > 0 ? ` • ${step.duration_min} min` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Map Controls (Bottom-Left - desktop only) */}
      <div className="hidden md:flex absolute bottom-6 left-4 z-20 flex-wrap items-center gap-2">
        {/* Style Switcher */}
        <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg p-1 shadow-md flex items-center gap-1 text-xs">
          <div className="px-2 py-1 text-zinc-500 flex items-center gap-1 font-medium">
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map:</span>
          </div>
          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => handleStyleChange(style.id)}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                currentStyle === style.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>

        {/* Marker Clustering Toggle */}
        <button
          type="button"
          onClick={handleToggleClustering}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-md text-xs font-medium transition-colors ${
            clusteringEnabled
              ? "bg-zinc-900 border-zinc-700 text-zinc-200"
              : "bg-zinc-950/90 border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
          title="Toggle marker clustering"
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>Clustering:</span>
          <span className={`px-1 py-0.2 rounded font-mono text-[10px] ${
            clusteringEnabled ? "bg-zinc-800 text-zinc-200" : "bg-zinc-900 text-zinc-600"
          }`}>
            {clusteringEnabled ? "ON" : "OFF"}
          </span>
        </button>

        {/* H3 Hexagon Overlay Quick Toggle */}
        <button
          type="button"
          onClick={() => setShowH3Overlay && setShowH3Overlay(!showH3Overlay)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-md text-xs font-medium transition-colors ${
            showH3Overlay
              ? "bg-zinc-900 border-zinc-700 text-zinc-200"
              : "bg-zinc-950/90 border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
          title="Toggle Uber H3 hexagon spatial grid"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>H3 Grid:</span>
          <span className={`px-1 py-0.2 rounded font-mono text-[10px] ${
            showH3Overlay ? "bg-zinc-800 text-zinc-200" : "bg-zinc-900 text-zinc-600"
          }`}>
            {showH3Overlay ? "ON" : "OFF"}
          </span>
        </button>

        {/* Community Home Chargers Quick Toggle */}
        {setShowCommunityChargers && (
          <button
            type="button"
            onClick={() => setShowCommunityChargers(!showCommunityChargers)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-md text-xs font-medium transition-colors ${
              showCommunityChargers
                ? "bg-blue-950/80 border-blue-700 text-blue-200"
                : "bg-zinc-950/90 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
            title="Toggle Peer-to-Peer Community Home EV Chargers (Electric Blue)"
          >
            <Home className="w-3.5 h-3.5 text-blue-400" />
            <span>Community Hosts:</span>
            <span
              className={`px-1 py-0.2 rounded font-mono text-[10px] ${
                showCommunityChargers ? "bg-blue-900/60 text-blue-200" : "bg-zinc-900 text-zinc-600"
              }`}
            >
              {showCommunityChargers ? "ON" : "OFF"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function convertRouteToGeoJson(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
        properties: {},
      },
    ],
  };
}

function convertStationsToGeoJson(stations = [], candidates = []) {
  const candidateMap = new Map();
  candidates.forEach((c) => candidateMap.set(c.id, c.tier));

  const allList = candidates.length > 0 ? candidates : stations;

  return {
    type: "FeatureCollection",
    features: allList.map((st) => ({
      type: "Feature",
      id: st.id,
      geometry: {
        type: "Point",
        coordinates: [st.longitude, st.latitude],
      },
      properties: {
        id: st.id,
        name: st.name,
        operator: st.operator_name || "Unknown",
        h3_cell: st.h3_cell,
        tier: candidateMap.get(st.id) || "default",
        is_operational: st.is_operational !== false,
      },
    })),
  };
}

function convertCommunityChargersToGeoJson(chargers = []) {
  return {
    type: "FeatureCollection",
    features: chargers.map((c) => ({
      type: "Feature",
      id: `comm_${c.id}`,
      geometry: {
        type: "Point",
        coordinates: [c.longitude, c.latitude],
      },
      properties: {
        id: c.id,
        is_community_host: true,
        host_name: c.host_name,
        title: c.title,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        connector_type: c.connector_type,
        power_kw: c.power_kw,
        price_per_kwh: c.price_per_kwh,
        availability_status: c.availability_status,
        queue_count: c.queue_count,
        trust_score: c.trust_score,
        total_charges_served: c.total_charges_served,
        access_hours: c.access_hours,
        amenities: c.amenities,
        notes: c.notes || "",
      },
    })),
  };
}
