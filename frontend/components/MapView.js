"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Map as MapIcon } from "lucide-react";

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

export default function MapView({
  stations = [],
  h3GeoJson = null,
  showH3Overlay = true,
  selectedStation = null,
  onSelectStation,
  focusCoordinate = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [currentStyle, setCurrentStyle] = useState("dark");

  const addLayersToMap = (map) => {
    // 1. Add H3 Hexagon Grid Source & Layers
    if (!map.getSource("h3-grid-source")) {
      map.addSource("h3-grid-source", {
        type: "geojson",
        data: h3GeoJson || { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "h3-hexagons-fill",
        type: "fill",
        source: "h3-grid-source",
        layout: {
          visibility: showH3Overlay ? "visible" : "none",
        },
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["get", "station_count"],
            1, 0.12,
            5, 0.25,
            10, 0.4,
          ],
        },
      });

      map.addLayer({
        id: "h3-hexagons-line",
        type: "line",
        source: "h3-grid-source",
        layout: {
          visibility: showH3Overlay ? "visible" : "none",
        },
        paint: {
          "line-color": "#34d399",
          "line-width": 1.5,
          "line-opacity": 0.8,
        },
      });
    }

    // 2. Add Charging Stations Source & Layers
    if (!map.getSource("stations-source")) {
      map.addSource("stations-source", {
        type: "geojson",
        data: convertStationsToGeoJson(stations),
      });

      map.addLayer({
        id: "stations-halo",
        type: "circle",
        source: "stations-source",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 12, 14],
          "circle-color": "#10b981",
          "circle-opacity": 0.25,
          "circle-blur": 0.5,
        },
      });

      map.addLayer({
        id: "stations-circles",
        type: "circle",
        source: "stations-source",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 8],
          "circle-color": [
            "case",
            ["==", ["get", "is_operational"], false],
            "#f59e0b",
            "#10b981",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  };

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyleObj = MAP_STYLES.find((s) => s.id === currentStyle) || MAP_STYLES[0];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyleObj.url,
      center: [78.9629, 20.5937],
      zoom: 4.8,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      addLayersToMap(map);

      // Station Click Listener
      map.on("click", "stations-circles", (e) => {
        if (!e.features || !e.features.length) return;
        const stationId = e.features[0].properties.id;
        const matched = stations.find((s) => s.id === stationId);
        if (matched) {
          onSelectStation(matched);
        }
      });

      // Hexagon Click Listener
      map.on("click", "h3-hexagons-fill", (e) => {
        if (!e.features || !e.features.length) return;
        const props = e.features[0].properties;
        new maplibregl.Popup({ closeButton: true, offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
              <strong style="color: #34d399;">Uber H3 Cell:</strong><br/>
              <code style="font-size: 11px; background: #1f2937; padding: 2px 4px; border-radius: 4px;">${props.h3_cell}</code><br/>
              <span style="color: #9ca3af; margin-top: 4px; display: inline-block;">
                Stations in cell: <strong>${props.station_count}</strong>
              </span>
            </div>`
          )
          .addTo(map);
      });

      // Pointer Cursors
      map.on("mouseenter", "stations-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stations-circles", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "h3-hexagons-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "h3-hexagons-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle Style Changes
  const handleStyleChange = (newStyleId) => {
    if (!mapRef.current || newStyleId === currentStyle) return;
    const target = MAP_STYLES.find((s) => s.id === newStyleId);
    if (!target) return;

    setCurrentStyle(newStyleId);
    mapRef.current.setStyle(target.url);

    mapRef.current.once("style.load", () => {
      addLayersToMap(mapRef.current);
    });
  };

  // Update Stations Source Data
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    const source = mapRef.current.getSource("stations-source");
    if (source) {
      source.setData(convertStationsToGeoJson(stations));
    }
  }, [stations]);

  // Update H3 GeoJSON Source Data
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    const source = mapRef.current.getSource("h3-grid-source");
    if (source && h3GeoJson) {
      source.setData(h3GeoJson);
    }
  }, [h3GeoJson]);

  // Toggle H3 Hexagon Overlay Visibility
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    const visibility = showH3Overlay ? "visible" : "none";
    if (mapRef.current.getLayer("h3-hexagons-fill")) {
      mapRef.current.setLayoutProperty("h3-hexagons-fill", "visibility", visibility);
    }
    if (mapRef.current.getLayer("h3-hexagons-line")) {
      mapRef.current.setLayoutProperty("h3-hexagons-line", "visibility", visibility);
    }
  }, [showH3Overlay]);

  // Handle Focus On Coordinate changes
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
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Map Style Switcher (Bottom-Left) */}
      <div className="absolute bottom-6 left-4 z-20 bg-dark-800/90 backdrop-blur-md border border-gray-700/70 rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs">
        <div className="px-2 py-1 text-gray-400 flex items-center gap-1 font-medium">
          <MapIcon className="w-3.5 h-3.5" />
          <span>Style:</span>
        </div>
        {MAP_STYLES.map((style) => (
          <button
            key={style.id}
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
    </div>
  );
}

function convertStationsToGeoJson(stations = []) {
  return {
    type: "FeatureCollection",
    features: stations.map((st) => ({
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
        is_operational: st.is_operational !== false,
      },
    })),
  };
}
