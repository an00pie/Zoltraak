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
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const activePopupRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const stationStopMarkerRef = useRef(null);

  const [currentStyle, setCurrentStyle] = useState("dark");
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [showGpsSteps, setShowGpsSteps] = useState(false);

  // Active route details for Google Maps-style navigation HUD
  const activeRouteDetails = useMemo(() => {
    if (!routeData) return null;
    if (routeData.routed_via_station) {
      return {
        isMultiStop: true,
        summary: routeData.routed_via_station.summary || "Corridor via Charging Stop",
        distanceKm: routeData.routed_via_station.total_distance_km,
        durationMin: routeData.routed_via_station.total_duration_min,
        stationName: routeData.routed_via_station.station_name,
        stationLat: routeData.routed_via_station.station_latitude,
        stationLng: routeData.routed_via_station.station_longitude,
        detourKm: routeData.routed_via_station.detour_km,
        detourMin: routeData.routed_via_station.detour_duration_min,
        steps: routeData.routed_via_station.steps || [],
      };
    }
    if (routeData.direct_route) {
      return {
        isMultiStop: false,
        summary: routeData.direct_route.summary || "Direct Highway Corridor",
        distanceKm: routeData.direct_route.distance_km,
        durationMin: routeData.direct_route.duration_min,
        steps: routeData.direct_route.steps || [],
      };
    }
    return null;
  }, [routeData]);

  // Global window handlers for interactive popup buttons
  useEffect(() => {
    window.zoltraakSelectStation = (id) => {
      const matched =
        candidateStations.find((s) => s.id === id) ||
        stations.find((s) => s.id === id);
      if (matched && onSelectStation) {
        onSelectStation(matched);
      }
    };

    window.zoltraakRouteViaStation = (id) => {
      const matched =
        candidateStations.find((s) => s.id === id) ||
        stations.find((s) => s.id === id);
      if (matched && onRouteViaStation) {
        onRouteViaStation(matched);
      }
    };

    return () => {
      delete window.zoltraakSelectStation;
      delete window.zoltraakRouteViaStation;
    };
  }, [stations, candidateStations, onSelectStation, onRouteViaStation]);

  // Generate Station Popup HTML
  const getStationPopupHtml = (st) => {
    const isOperational = st.is_operational !== false;
    const statusColor = isOperational ? "#10b981" : "#f59e0b";
    const statusText = isOperational ? "Operational" : "Unavailable";
    const maxKw = st.max_power_kw ? `${st.max_power_kw} kW` : "Fast Charger";

    let tierBadge = "";
    if (st.tier) {
      const tierColor =
        st.tier === "optimal"
          ? "#10b981"
          : st.tier === "acceptable"
          ? "#f59e0b"
          : "#ef4444";
      const tierLabel =
        st.tier_label ||
        (st.tier === "optimal"
          ? "Optimal Stop (Minimal Detour)"
          : st.tier === "acceptable"
          ? "Acceptable Detour"
          : "Not Worth It / Far Detour");

      tierBadge = `
        <div style="margin-top: 6px; padding: 4px 8px; background: rgba(17, 24, 39, 0.85); border: 1px solid ${tierColor}50; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
          <span style="color: ${tierColor}; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${tierColor};"></span>
            ${tierLabel}
          </span>
          <span style="color: #9ca3af; font-family: monospace;">+${st.detour_km ?? 0} km</span>
        </div>
      `;
    }

    let connectorsHtml = "";
    if (st.connectors && st.connectors.length > 0) {
      const chips = st.connectors
        .map(
          (c) =>
            `<span style="display: inline-block; background: #1f2937; border: 1px solid #374151; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px; margin-bottom: 4px; font-weight: 500;">
              ⚡ ${escapeHtml(c.connector_type || "Plug")} ${c.power_kw ? `${c.power_kw}kW` : ""}
            </span>`
        )
        .join("");
      connectorsHtml = `<div style="margin-top: 6px; display: flex; flex-wrap: wrap;">${chips}</div>`;
    }

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #f3f4f6; min-width: 250px; max-width: 320px; padding: 2px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; border-bottom: 1px solid #374151; padding-bottom: 6px; margin-bottom: 6px;">
          <div>
            <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #ffffff; line-height: 1.25;">${escapeHtml(st.name)}</h4>
            <span style="font-size: 11px; color: #9ca3af;">${escapeHtml(st.operator_name || "Independent Operator")}</span>
          </div>
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}50; white-space: nowrap;">
            ${statusText}
          </span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #d1d5db; margin-bottom: 4px;">
          <span>Max Rated Power:</span>
          <strong style="color: #34d399; font-size: 12px;">${maxKw}</strong>
        </div>

        ${tierBadge}
        ${connectorsHtml}

        <div style="margin-top: 6px; font-size: 10px; color: #6b7280; font-family: monospace; display: flex; align-items: center; justify-content: space-between;">
          <span>H3 Cell:</span>
          <span>${st.h3_cell || "Resolution 8"}</span>
        </div>

        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #374151; display: flex; gap: 6px;">
          <button 
            type="button"
            onclick="window.zoltraakSelectStation(${st.id})"
            style="flex: 1; padding: 6px 8px; background: #059669; color: #ffffff; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
          >
            Full Specs
          </button>
          ${st.tier ? `
            <button 
              type="button"
              onclick="window.zoltraakRouteViaStation(${st.id})"
              style="flex: 1; padding: 6px 8px; background: #1f2937; border: 1px solid #10b98180; color: #34d399; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
            >
              Route Stop
            </button>
          ` : ""}
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
      <li style="margin-bottom: 4px; padding: 4px 6px; background: #1f2937; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 600; color: #e5e7eb; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(st.name)}
        </span>
        <button 
          type="button"
          onclick="window.zoltraakSelectStation(${st.id})"
          style="padding: 2px 6px; background: #10b98120; border: 1px solid #10b98150; color: #34d399; border-radius: 3px; font-size: 10px; font-weight: bold; cursor: pointer;"
        >
          Inspect
        </button>
      </li>
    `).join("");

    const remaining = stationCount - stationsInCell.slice(0, 5).length;

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #f3f4f6; min-width: 250px; padding: 2px;">
        <div style="border-bottom: 1px solid #374151; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="color: #34d399; font-size: 13px;">⬡ Uber H3 Hexagon Cell</strong>
            <span style="font-size: 10px; color: #9ca3af; font-family: monospace;">Res 8</span>
          </div>
          <code style="font-size: 11px; background: #1f2937; padding: 2px 6px; border-radius: 4px; color: #38bdf8; display: inline-block; margin-top: 3px;">
            ${cellId}
          </code>
        </div>

        <div style="margin-bottom: 6px; font-size: 11px; color: #d1d5db; display: flex; justify-content: space-between;">
          <span>Individual Stations in Cell:</span>
          <strong style="color: #10b981; font-size: 13px;">${stationCount}</strong>
        </div>

        ${stationsInCell.length > 0 ? `
          <div style="margin-top: 6px;">
            <span style="font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Stations (Click to View):</span>
            <ul style="list-style: none; padding: 0; margin: 4px 0 0 0;">
              ${listItems}
            </ul>
            ${remaining > 0 ? `<p style="font-size: 10px; color: #9ca3af; margin: 4px 0 0 0;">+ ${remaining} more stations in this hexagon</p>` : ""}
          </div>
        ` : ""}
      </div>
    `;
  };

  // Add Google Maps GPS navigation road layers
  const addRouteLayers = (map) => {
    if (!map.getSource("route-source")) {
      map.addSource("route-source", {
        type: "geojson",
        data: convertRouteToGeoJson(routeCoordinates),
      });
    }

    // Layer 1: GPS Outer Ambient Glow
    if (!map.getLayer("route-glow")) {
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#0284c7",
          "line-width": 14,
          "line-opacity": 0.4,
          "line-blur": 4,
        },
      });
    }

    // Layer 2: GPS Dark Royal Navy Casing
    if (!map.getLayer("route-casing")) {
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#172554",
          "line-width": 9,
        },
      });
    }

    // Layer 3: Vibrant Google Maps Electric Blue Main Line
    if (!map.getLayer("route-core")) {
      map.addLayer({
        id: "route-core",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#2563eb",
          "line-width": 6,
        },
      });
    }

    // Layer 4: Inner Bright Sky Guidance Track
    if (!map.getLayer("route-inner-track")) {
      map.addLayer({
        id: "route-inner-track",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#60a5fa",
          "line-width": 2.2,
        },
      });
    }

    // Layer 5: Directional Chevrons / Dashes
    if (!map.getLayer("route-direction-dash")) {
      map.addLayer({
        id: "route-direction-dash",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.5,
          "line-dasharray": [1, 5],
          "line-opacity": 0.85,
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

      // Pointer cursors
      map.on("mouseenter", "stations-circles", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "stations-circles", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "station-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "station-clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "h3-hexagons-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "h3-hexagons-fill", () => { map.getCanvas().style.cursor = ""; });

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

    setCurrentStyle(newStyleId);
    mapRef.current.setStyle(target.url);
    mapRef.current.once("style.load", () => {
      addAllLayers(mapRef.current);
    });
  };

  // Handle Clustering Toggle
  const handleToggleClustering = () => {
    const nextState = !clusteringEnabled;
    setClusteringEnabled(nextState);
    if (mapRef.current) {
      addStationsSourceAndLayers(mapRef.current, nextState);
    }
  };

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
          "w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-2xl flex items-center justify-center font-black text-[11px] text-dark-900";
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

    // 2. Charging Stop Pin S (when multi-stop via charger is chosen)
    if (activeRouteDetails?.isMultiStop && activeRouteDetails.stationLat) {
      if (!stationStopMarkerRef.current) {
        const el = document.createElement("div");
        el.className =
          "px-2.5 py-1 rounded-full bg-amber-500 border-2 border-white shadow-2xl flex items-center gap-1 font-bold text-[10px] text-dark-900 animate-pulse";
        el.innerHTML = `<span>⚡</span><span>${escapeHtml(activeRouteDetails.stationName.split(" ")[0])}</span>`;
        stationStopMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([activeRouteDetails.stationLng, activeRouteDetails.stationLat])
          .addTo(mapRef.current);
      } else {
        stationStopMarkerRef.current.setLngLat([activeRouteDetails.stationLng, activeRouteDetails.stationLat]);
      }
    } else if (stationStopMarkerRef.current) {
      stationStopMarkerRef.current.remove();
      stationStopMarkerRef.current = null;
    }

    // 3. Destination Pin B
    if (destLocation) {
      if (!destMarkerRef.current) {
        const el = document.createElement("div");
        el.className =
          "w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-2xl flex items-center justify-center font-black text-[11px] text-white";
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

      {/* Google Maps GPS Navigation Floating Banner */}
      {activeRouteDetails && (
        <div className="absolute top-20 left-4 right-4 md:left-[470px] md:right-8 z-20 flex flex-col items-center pointer-events-none">
          <div className="bg-dark-900/95 backdrop-blur-xl border border-blue-500/50 rounded-2xl shadow-2xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-4 pointer-events-auto max-w-2xl w-full text-xs">
            {/* Left: Direction Icon & Highway Summary */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 border border-blue-400/60 shadow-lg shadow-blue-600/30 flex items-center justify-center text-white shrink-0">
                <Navigation className="w-5 h-5 -rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-100">
                    {activeRouteDetails.summary}
                  </span>
                  {activeRouteDetails.isMultiStop && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                      1 Charging Stop
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                  <span className="text-blue-400 font-bold font-mono">
                    {activeRouteDetails.distanceKm} km
                  </span>
                  <span>•</span>
                  <span className="text-gray-200 font-semibold font-mono">
                    {Math.floor(activeRouteDetails.durationMin / 60) > 0
                      ? `${Math.floor(activeRouteDetails.durationMin / 60)} hr ${Math.round(activeRouteDetails.durationMin % 60)} min`
                      : `${Math.round(activeRouteDetails.durationMin)} min`}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">
                    Arriving ~{routeData?.battery_parameters?.direct_arrival_soc ?? 25}% SoC
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {activeRouteDetails.steps?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowGpsSteps(!showGpsSteps)}
                  className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-gray-700 hover:border-blue-500 text-gray-200 hover:text-blue-300 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                >
                  <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>Steps ({activeRouteDetails.steps.length})</span>
                  {showGpsSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              <button
                type="button"
                onClick={handleFitRouteBounds}
                className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg transition-colors"
                title="Fit full route in viewport"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Turn-by-Turn GPS Directions Dropdown Sheet */}
          {showGpsSteps && activeRouteDetails.steps?.length > 0 && (
            <div className="bg-dark-900/98 backdrop-blur-2xl border border-gray-700 rounded-2xl shadow-2xl p-3 mt-2 max-w-2xl w-full max-h-72 overflow-y-auto pointer-events-auto space-y-1.5 text-xs animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                <span>GPS Turn-by-Turn Maneuvers</span>
                <span className="text-blue-400 font-mono">Live Route</span>
              </div>
              {activeRouteDetails.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-dark-800/80 hover:bg-dark-800 border border-gray-800/80 rounded-xl flex items-start gap-2.5 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-100 text-xs">{step.instruction}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
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

      {/* Floating Map Controls (Bottom-Left) */}
      <div className="absolute bottom-6 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Style Switcher */}
        <div className="bg-dark-800/90 backdrop-blur-md border border-gray-700/70 rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs">
          <div className="px-2 py-1 text-gray-400 flex items-center gap-1 font-medium">
            <MapIcon className="w-3.5 h-3.5" />
            <span>Style:</span>
          </div>
          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => handleStyleChange(style.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentStyle === style.id
                  ? "bg-brand-500 text-dark-900 font-bold shadow-sm"
                  : "text-gray-300 hover:text-gray-100 hover:bg-gray-700/50"
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-xl text-xs font-semibold transition-all ${
            clusteringEnabled
              ? "bg-brand-500/20 border-brand-500/50 text-brand-300 hover:bg-brand-500/30"
              : "bg-dark-800/90 border-gray-700/70 text-gray-400 hover:text-gray-200 hover:bg-dark-700"
          }`}
          title="Toggle marker clustering at lower zoom levels"
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>Clustering:</span>
          <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
            clusteringEnabled ? "bg-brand-500/30 text-brand-200" : "bg-gray-800 text-gray-400"
          }`}>
            {clusteringEnabled ? "ON" : "OFF"}
          </span>
        </button>

        {/* H3 Hexagon Overlay Quick Toggle */}
        <button
          type="button"
          onClick={() => setShowH3Overlay && setShowH3Overlay(!showH3Overlay)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-xl text-xs font-semibold transition-all ${
            showH3Overlay
              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30"
              : "bg-dark-800/90 border-gray-700/70 text-gray-400 hover:text-gray-200 hover:bg-dark-700"
          }`}
          title="Toggle Uber H3 hexagon spatial grid overlay"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>H3 Grid:</span>
          <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
            showH3Overlay ? "bg-cyan-500/30 text-cyan-200" : "bg-gray-800 text-gray-400"
          }`}>
            {showH3Overlay ? "ON" : "OFF"}
          </span>
        </button>
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
