"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import FilterBar from "@/components/FilterBar";
import RoutePlannerPanel, { EV_PRESETS } from "@/components/RoutePlannerPanel";
import StationDetailsDrawer from "@/components/StationDetailsDrawer";
import StatusIndicator from "@/components/StatusIndicator";
import ListHomeChargerModal from "@/components/ListHomeChargerModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  // Station Data & Metadata
  const [stations, setStations] = useState([]);
  const [communityChargers, setCommunityChargers] = useState([]);
  const [showCommunityChargers, setShowCommunityChargers] = useState(true);
  const [isListHomeChargerOpen, setIsListHomeChargerOpen] = useState(false);
  const [h3GeoJson, setH3GeoJson] = useState(null);
  const [h3Resolution, setH3Resolution] = useState(7);
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

  // Viewport Spatial Search & Dynamic H3 Hierarchy
  const [viewportCenter, setViewportCenter] = useState({ latitude: 10.307, longitude: 76.333 });
  const [viewportZoom, setViewportZoom] = useState(7.5);
  const [viewportBounds, setViewportBounds] = useState(null);
  const [viewportNearbyStations, setViewportNearbyStations] = useState([]);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);
  const [nearbySortBy, setNearbySortBy] = useState("distance"); // 'distance' | 'power' | 'name'
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(30);
  const [activePlannerTab, setActivePlannerTab] = useState("planner");
  const viewportDebounceRef = useRef(null);

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

  // Fetch Community Home Chargers
  const fetchCommunityChargers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/community-chargers`);
      if (res.ok) {
        const data = await res.json();
        setCommunityChargers(data.items || []);
      }
    } catch (err) {
      console.warn("Could not fetch community chargers:", err);
    }
  }, []);

  // Fetch Dynamic H3 Hexagon Grid GeoJSON (with zoom-based subdivision & viewport bounding)
  const fetchH3Grid = useCallback(
    async (zoom = null, bounds = null) => {
      try {
        const params = new URLSearchParams();
        if (zoom !== null && zoom !== undefined) {
          params.append("zoom", zoom.toString());
        }
        if (bounds) {
          params.append("min_lat", bounds.min_lat.toString());
          params.append("max_lat", bounds.max_lat.toString());
          params.append("min_lng", bounds.min_lng.toString());
          params.append("max_lng", bounds.max_lng.toString());
        }
        if (selectedOperator) params.append("operator", selectedOperator);
        if (selectedConnector) params.append("connector_type", selectedConnector);
        if (minPower > 0) params.append("min_power_kw", minPower.toString());

        const res = await fetch(`${API_BASE_URL}/api/v1/stations/h3-grid?${params.toString()}`);
        if (res.ok) {
          const geojson = await res.json();
          setH3GeoJson(geojson);
          if (geojson.resolution) {
            setH3Resolution(geojson.resolution);
          }
        }
      } catch (err) {
        console.warn("Failed to load H3 GeoJSON grid:", err);
      }
    },
    [selectedOperator, selectedConnector, minPower]
  );

  // Fetch nearby stations around the current visible map viewport center
  const fetchNearbyStations = useCallback(
    async (lat, lng, radius = nearbyRadiusKm, sortBy = nearbySortBy) => {
      if (!lat || !lng) return;
      setIsFetchingNearby(true);
      try {
        const params = new URLSearchParams({
          latitude: lat.toString(),
          longitude: lng.toString(),
          radius_km: radius.toString(),
          sort_by: sortBy,
          limit: "50",
        });
        if (selectedConnector) params.append("connector_type", selectedConnector);
        if (minPower > 0) params.append("min_power_kw", minPower.toString());

        const res = await fetch(`${API_BASE_URL}/api/v1/stations/nearby?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setViewportNearbyStations(data.items || []);
        }
      } catch (err) {
        console.warn("Failed to fetch nearby stations:", err);
      } finally {
        setIsFetchingNearby(false);
      }
    },
    [nearbyRadiusKm, nearbySortBy, selectedConnector, minPower]
  );

  // Viewport change listener triggered on map pan/zoom
  const handleViewportChange = useCallback(
    ({ latitude, longitude, zoom, bounds }) => {
      setViewportCenter({ latitude, longitude });
      setViewportZoom(zoom);
      setViewportBounds(bounds);

      if (viewportDebounceRef.current) {
        clearTimeout(viewportDebounceRef.current);
      }

      viewportDebounceRef.current = setTimeout(() => {
        // If H3 overlay is visible, fetch subdivided / aggregated hexagons
        if (showH3Overlay) {
          fetchH3Grid(zoom, bounds);
        }
        // Fetch nearby stations for current visible center
        fetchNearbyStations(latitude, longitude, nearbyRadiusKm, nearbySortBy);
      }, 250);
    },
    [showH3Overlay, fetchH3Grid, fetchNearbyStations, nearbyRadiusKm, nearbySortBy]
  );

  // When H3 overlay toggle changes, fetch grid if enabled
  useEffect(() => {
    if (showH3Overlay) {
      fetchH3Grid(viewportZoom, viewportBounds);
    }
  }, [showH3Overlay, viewportZoom, viewportBounds, fetchH3Grid]);

  // When sorting or search radius changes, immediately refresh nearby stations
  useEffect(() => {
    if (viewportCenter) {
      fetchNearbyStations(viewportCenter.latitude, viewportCenter.longitude, nearbyRadiusKm, nearbySortBy);
    }
  }, [nearbySortBy, nearbyRadiusKm]);

  // Initial load
  useEffect(() => {
    fetchPresetCities();
    fetchMetadata();
    fetchStations();
    fetchCommunityChargers();
    fetchH3Grid(viewportZoom, viewportBounds);
    fetchNearbyStations(viewportCenter.latitude, viewportCenter.longitude, nearbyRadiusKm, nearbySortBy);
  }, [fetchPresetCities, fetchMetadata, fetchStations, fetchCommunityChargers, fetchH3Grid, fetchNearbyStations]);

  // Phase 3: Calculate OSRM Route & Corridor Candidate Stations
  const handleCalculateRoute = async (stationOverride = null) => {
    if (!origin || !destination) return;
    setIsRouting(true);

    try {
      const isExplicitClear = stationOverride && stationOverride.id === -1;
      const targetStationId = isExplicitClear
        ? -1
        : stationOverride
        ? stationOverride.id
        : selectedStationStop?.id || null;

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
        selected_station_id: targetStationId,
        auto_select_optimal: !isExplicitClear,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/routing/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Routing API failed with HTTP ${res.status}`);

      const data = await res.json();
      setRouteData(data);

      // Auto-sync selectedStationStop from optimal route selection
      if (data.routed_via_station) {
        const matched = data.candidate_stations?.find(
          (c) => c.id === data.routed_via_station.station_id
        );
        setSelectedStationStop(
          matched || {
            id: data.routed_via_station.station_id,
            name: data.routed_via_station.station_name,
            latitude: data.routed_via_station.station_latitude,
            longitude: data.routed_via_station.station_longitude,
          }
        );
      } else {
        setSelectedStationStop(null);
      }
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

  // Add / Select intermediate charging stop (user preference)
  const handleSelectStationStop = (station) => {
    setSelectedStationStop(station);
    handleCalculateRoute(station);
  };

  // Remove intermediate charging stop (switch to direct route)
  const handleClearStationStop = () => {
    setSelectedStationStop(null);
    handleCalculateRoute({ id: -1 });
  };

  // Clear active route and switch cleanly to non-routing viewport exploration mode
  const handleClearRoute = () => {
    setRouteData(null);
    setSelectedStationStop(null);
    setActivePlannerTab("nearby");
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
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans">
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
        onViewportChange={handleViewportChange}
        h3Resolution={h3Resolution}
        showCenterReticle={!routeData}
        communityChargers={communityChargers}
        showCommunityChargers={showCommunityChargers}
        setShowCommunityChargers={setShowCommunityChargers}
      />

      {/* 2. Left Route & Battery Planner Sidebar */}
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
        // Viewport exploration & nearby search props
        viewportNearbyStations={viewportNearbyStations}
        viewportCenter={viewportCenter}
        isFetchingNearby={isFetchingNearby}
        nearbySortBy={nearbySortBy}
        setNearbySortBy={setNearbySortBy}
        nearbyRadiusKm={nearbyRadiusKm}
        setNearbyRadiusKm={setNearbyRadiusKm}
        onClearRoute={handleClearRoute}
        activeTab={activePlannerTab}
        setActiveTab={setActivePlannerTab}
      />

      {/* 3. Top Navigation & Floating Filter Bar */}
      <div className="absolute top-4 right-4 left-4 md:left-[448px] md:right-4 z-20 transition-all">
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
          showCommunityChargers={showCommunityChargers}
          setShowCommunityChargers={setShowCommunityChargers}
          totalCommunityChargers={communityChargers.length}
          onOpenListHomeChargerModal={() => setIsListHomeChargerOpen(true)}
          onRefresh={() => {
            fetchMetadata();
            fetchStations();
            fetchCommunityChargers();
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
          fetchCommunityChargers();
          fetchH3Grid();
        }}
      />

      {/* 5. Slide-in Station Details Drawer */}
      {selectedStation && (
        <StationDetailsDrawer
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onFocus={(lng, lat) => setFocusCoordinate([lng, lat])}
          onRouteViaStation={(st) => handleSelectStationStop(st)}
          onClearStationStop={handleClearStationStop}
          isSelectedStop={
            selectedStationStop?.id === selectedStation.id ||
            routeData?.routed_via_station?.station_id === selectedStation.id
          }
        />
      )}

      {/* 6. List Community Home Charger Modal */}
      <ListHomeChargerModal
        isOpen={isListHomeChargerOpen}
        onClose={() => setIsListHomeChargerOpen(false)}
        mapCenter={viewportCenter}
        apiBaseUrl={API_BASE_URL}
        onChargerCreated={(newCharger) => {
          setCommunityChargers((prev) => [newCharger, ...prev]);
          if (newCharger.longitude && newCharger.latitude) {
            setFocusCoordinate([Number(newCharger.longitude), Number(newCharger.latitude)]);
          }
        }}
      />
    </main>
  );
}
