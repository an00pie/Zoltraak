"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import MapView from "@/components/MapView";
import FilterBar from "@/components/FilterBar";
import StationDetailsDrawer from "@/components/StationDetailsDrawer";
import StatusIndicator from "@/components/StatusIndicator";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  // Data states
  const [stations, setStations] = useState([]);
  const [h3GeoJson, setH3GeoJson] = useState(null);
  const [metadata, setMetadata] = useState({
    total_stations: 0,
    operators: [],
    connector_types: [],
    power_brackets: [
      { label: "Any Power", min_kw: 0 },
      { label: "Standard AC (≥7.4 kW)", min_kw: 7.4 },
      { label: "Fast AC/DC (≥22 kW)", min_kw: 22.0 },
      { label: "DC Fast (≥50 kW)", min_kw: 50.0 },
      { label: "Ultra-Fast (≥100 kW)", min_kw: 100.0 },
    ],
  });

  // UI & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedConnector, setSelectedConnector] = useState("");
  const [minPower, setMinPower] = useState(0);
  const [showH3Overlay, setShowH3Overlay] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [focusCoordinate, setFocusCoordinate] = useState(null);

  // Status states
  const [isLoading, setIsLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch Metadata & Filter Options
  const fetchMetadata = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stations/metadata`);
      if (res.ok) {
        const data = await res.json();
        setMetadata((prev) => ({
          ...prev,
          total_stations: data.total_stations,
          operators: data.operators || [],
          connector_types: data.connector_types || [],
          power_brackets: data.power_brackets || prev.power_brackets,
        }));
        setBackendOnline(true);
      }
    } catch (err) {
      console.warn("Could not reach backend metadata endpoint:", err);
    }
  }, []);

  // Fetch Stations from backend
  const fetchStations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Build query string
      const params = new URLSearchParams({
        page: "1",
        page_size: "1000",
      });

      if (selectedOperator) params.append("operator", selectedOperator);
      if (selectedConnector) params.append("connector_type", selectedConnector);
      if (minPower > 0) params.append("min_power_kw", minPower.toString());

      const res = await fetch(`${API_BASE_URL}/api/v1/stations?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setStations(data.items || []);
      setBackendOnline(true);
    } catch (err) {
      console.error("Failed to fetch stations:", err);
      setBackendOnline(false);
      setErrorMessage(
        `Unable to connect to Zoltraak API at ${API_BASE_URL}. Ensure the backend server is running.`
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedOperator, selectedConnector, minPower]);

  // Fetch H3 Hexagon Grid GeoJSON
  const fetchH3Grid = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOperator) params.append("operator", selectedOperator);
      if (selectedConnector) params.append("connector_type", selectedConnector);
      if (minPower > 0) params.append("min_power_kw", minPower.toString());

      const res = await fetch(`${API_BASE_URL}/api/v1/stations/h3-grid?${params.toString()}`);
      if (res.ok) {
        const geojson = await res.json();
        setH3GeoJson(geojson);
      }
    } catch (err) {
      console.warn("Failed to load H3 GeoJSON grid:", err);
    }
  }, [selectedOperator, selectedConnector, minPower]);

  // Initial load
  useEffect(() => {
    fetchMetadata();
    fetchStations();
    fetchH3Grid();
  }, [fetchMetadata, fetchStations, fetchH3Grid]);

  // Client-side text search filter (matches name, address, city, H3 cell)
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.toLowerCase().trim();

    return stations.filter((st) => {
      const nameMatch = (st.name || "").toLowerCase().includes(q);
      const addressMatch = (st.address || "").toLowerCase().includes(q);
      const cityMatch = (st.city || "").toLowerCase().includes(q);
      const opMatch = (st.operator_name || "").toLowerCase().includes(q);
      const h3Match = (st.h3_cell || "").toLowerCase().includes(q);
      return nameMatch || addressMatch || cityMatch || opMatch || h3Match;
    });
  }, [stations, searchQuery]);

  // Reset & refresh handler
  const handleRefresh = () => {
    fetchMetadata();
    fetchStations();
    fetchH3Grid();
  };

  const handleFocusStation = (lng, lat) => {
    setFocusCoordinate([lng, lat]);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-dark-900">
      {/* 1. Full-screen Interactive MapLibre GL Map */}
      <MapView
        stations={filteredStations}
        h3GeoJson={h3GeoJson}
        showH3Overlay={showH3Overlay}
        selectedStation={selectedStation}
        onSelectStation={(st) => setSelectedStation(st)}
        focusCoordinate={focusCoordinate}
      />

      {/* 2. Top Navigation & Floating Filter Bar */}
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[720px] z-20">
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedOperator={selectedOperator}
          setSelectedOperator={setSelectedOperator}
          selectedConnector={selectedConnector}
          setSelectedConnector={setSelectedConnector}
          minPower={minPower}
          setMinPower={setMinPower}
          showH3Overlay={showH3Overlay}
          setShowH3Overlay={setShowH3Overlay}
          operators={metadata.operators}
          connectorTypes={metadata.connector_types}
          powerBrackets={metadata.power_brackets}
          totalStations={metadata.total_stations}
          filteredCount={filteredStations.length}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onSelectPlace={(lng, lat) => setFocusCoordinate([lng, lat])}
        />
      </div>

      {/* 3. Status, Connectivity, and Empty/Error Indicators */}
      <StatusIndicator
        backendOnline={backendOnline}
        errorMessage={errorMessage}
        isLoading={isLoading}
        totalStations={metadata.total_stations}
        filteredCount={filteredStations.length}
        onRetry={handleRefresh}
      />

      {/* 4. Slide-in Station Details Drawer */}
      {selectedStation && (
        <StationDetailsDrawer
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onFocus={handleFocusStation}
        />
      )}
    </main>
  );
}
