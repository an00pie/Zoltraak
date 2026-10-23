"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import MapView from "@/components/MapView";
import FilterBar from "@/components/FilterBar";
import RoutePlannerPanel, { EV_PRESETS } from "@/components/RoutePlannerPanel";
import StationDetailsDrawer from "@/components/StationDetailsDrawer";
import StatusIndicator from "@/components/StatusIndicator";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  // Station Data & Metadata
  const [stations, setStations] = useState([]);
  const [h3GeoJson, setH3GeoJson] = useState(null);
  const [metadata, setMetadata] = useState({
    total_stations: 0,
    operators: [],
    connector_types: [],
    power_brackets: [],
  });

  // UI Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedConnector, setSelectedConnector] = useState("");
  const [minPower, setMinPower] = useState(0);
  const [showH3Overlay, setShowH3Overlay] = useState(false); // Default off so route is clear
  const [selectedStation, setSelectedStation] = useState(null);
  const [focusCoordinate, setFocusCoordinate] = useState(null);

  // Status
  const [isLoading, setIsLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Phase 3 — Road Routing & EV States
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(true);
  const [presetCities, setPresetCities] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [batterySoC, setBatterySoC] = useState(35);
  const [selectedEv, setSelectedEv] = useState(EV_PRESETS[0]);
  const [minReserveSoC, setMinReserveSoC] = useState(15);
  const [isRouting, setIsRouting] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [selectedStationStop, setSelectedStationStop] = useState(null);

  // Fetch Preset Cities for A to B dropdowns
  const fetchPresetCities = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/routing/preset-cities`);
      if (res.ok) {
        const cities = await res.json();
        setPresetCities(cities);
        // Default to popular Kerala EV corridor: Kochi to Thrissur
        if (cities.length >= 3) {
          setOrigin(cities[0]); // Kochi
          setDestination(cities[2]); // Thrissur
        }
      }
    } catch (err) {
      console.warn("Could not fetch preset cities:", err);
    }
  }, []);

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
      const params = new URLSearchParams({
        page: "1",
        page_size: "1000",
      });

      if (selectedOperator) params.append("operator", selectedOperator);
      if (selectedConnector) params.append("connector_type", selectedConnector);
      if (minPower > 0) params.append("min_power_kw", minPower.toString());

      const res = await fetch(`${API_BASE_URL}/api/v1/stations?${params.toString()}`);
      if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);

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
    fetchPresetCities();
    fetchMetadata();
    fetchStations();
    fetchH3Grid();
  }, [fetchPresetCities, fetchMetadata, fetchStations, fetchH3Grid]);

  // Phase 3: Calculate OSRM Route & Corridor Candidate Stations
  const handleCalculateRoute = async (stationOverride = null) => {
    if (!origin || !destination) return;
    setIsRouting(true);

    try {
      const payload = {
        origin: {
          name: origin.name,
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          name: destination.name,
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        current_soc: batterySoC,
        battery_capacity_kwh: selectedEv.capacityKwh,
        min_reserve_soc: minReserveSoC,
        selected_station_id: stationOverride ? stationOverride.id : selectedStationStop?.id || null,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/routing/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Routing API failed with HTTP ${res.status}`);

      const data = await res.json();
      setRouteData(data);
    } catch (err) {
      console.error("Routing calculation error:", err);
    } finally {
      setIsRouting(false);
    }
  };

  // Automatically calculate route when default origin/destination load
  useEffect(() => {
    if (origin && destination && !routeData) {
      handleCalculateRoute();
    }
  }, [origin, destination]);

  // Add / Select intermediate charging stop
  const handleSelectStationStop = (station) => {
    setSelectedStationStop(station);
    handleCalculateRoute(station);
  };

  // Remove intermediate charging stop
  const handleClearStationStop = () => {
    setSelectedStationStop(null);
    handleCalculateRoute({ id: null });
  };

  // Client-side text search filter
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

  // Active route coordinates (either routed via charging station, or direct)
  const activeRouteCoordinates = useMemo(() => {
    if (!routeData) return null;
    if (routeData.routed_via_station?.coordinates) {
      return routeData.routed_via_station.coordinates;
    }
    return routeData.direct_route?.coordinates || null;
  }, [routeData]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-dark-900">
      {/* 1. Full-screen Interactive MapLibre GL Map */}
      <MapView
        stations={filteredStations}
        candidateStations={routeData?.candidate_stations || []}
        routeCoordinates={activeRouteCoordinates}
        routeData={routeData}
        originLocation={origin}
        destLocation={destination}
        h3GeoJson={h3GeoJson}
        showH3Overlay={showH3Overlay}
        setShowH3Overlay={setShowH3Overlay}
        selectedStation={selectedStation}
        onSelectStation={(st) => setSelectedStation(st)}
        onRouteViaStation={(st) => handleSelectStationStop(st)}
        focusCoordinate={focusCoordinate}
      />

      {/* 2. Phase 3: Left Route & Battery Planner Sidebar */}
      <RoutePlannerPanel
        origin={origin}
        setOrigin={setOrigin}
        destination={destination}
        setDestination={setDestination}
        presetCities={presetCities}
        batterySoC={batterySoC}
        setBatterySoC={setBatterySoC}
        selectedEv={selectedEv}
        setSelectedEv={setSelectedEv}
        minReserveSoC={minReserveSoC}
        setMinReserveSoC={setMinReserveSoC}
        onCalculateRoute={() => handleCalculateRoute()}
        isRouting={isRouting}
        routeData={routeData}
        selectedStationStop={selectedStationStop}
        onSelectStationStop={handleSelectStationStop}
        onClearStationStop={handleClearStationStop}
        onFocusCoordinate={(lng, lat) => setFocusCoordinate([lng, lat])}
        isOpen={isRoutePlannerOpen}
        setIsOpen={setIsRoutePlannerOpen}
      />

      {/* 3. Top Navigation & Floating Filter Bar */}
      <div className="absolute top-4 right-4 left-4 md:left-[470px] md:right-4 z-20 transition-all">
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
          onRefresh={() => {
            fetchMetadata();
            fetchStations();
            fetchH3Grid();
          }}
          onSelectPlace={(lng, lat) => setFocusCoordinate([lng, lat])}
        />
      </div>

      {/* 4. Status, Connectivity, and Empty/Error Indicators */}
      <StatusIndicator
        backendOnline={backendOnline}
        errorMessage={errorMessage}
        isLoading={isLoading}
        totalStations={metadata.total_stations}
        filteredCount={filteredStations.length}
        onRetry={() => {
          fetchMetadata();
          fetchStations();
          fetchH3Grid();
        }}
      />

      {/* 5. Slide-in Station Details Drawer */}
      {selectedStation && (
        <StationDetailsDrawer
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onFocus={(lng, lat) => setFocusCoordinate([lng, lat])}
        />
      )}
    </main>
  );
}
