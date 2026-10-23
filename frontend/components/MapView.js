"use client";

import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

// Dark modern vector map style (Free, zero-token CartoDB Dark Matter)
const MAP_STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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
  const popupRef = useRef(null);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_DARK,
      center: [78.9629, 20.5937], // Centered over India
      zoom: 4.8,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      // 1. Add H3 Hexagon Grid Source & Layers
      map.addSource("h3-grid-source", {
        type: "geojson",
        data: h3GeoJson || { type: "FeatureCollection", features: [] },
      });

      // H3 Hexagon Fill
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

      // H3 Hexagon Outlines
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

      // 2. Add Charging Stations Source & Layers
      map.addSource("stations-source", {
        type: "geojson",
        data: convertStationsToGeoJson(stations),
      });

      // Stations Glow / Halo
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

      // Stations Core Circle
      map.addLayer({
        id: "stations-circles",
        type: "circle",
        source: "stations-source",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 8],
          "circle-color": [
            "case",
            ["==", ["get", "is_operational"], false],
            "#f59e0b", // Amber for unavailable/offline
            "#10b981", // Emerald green for operational
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Station Click Listener
      map.on("click", "stations-circles", (e) => {
        if (!e.features || !e.features.length) return;
        const feature = e.features[0];
        const stationId = feature.properties.id;
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

      // Cursor Pointers
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
