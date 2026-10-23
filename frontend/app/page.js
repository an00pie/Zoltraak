"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import FilterBar from "@/components/FilterBar";
import RoutePlannerPanel from "@/components/RoutePlannerPanel";
import StationDetailsDrawer from "@/components/StationDetailsDrawer";
import StatusIndicator from "@/components/StatusIndicator";
import ListHomeChargerModal from "@/components/ListHomeChargerModal";
import VehicleSelectorModal from "@/components/VehicleSelectorModal";
import ProfileDrawer from "@/components/ProfileDrawer";
import LandingPage from "@/components/LandingPage";
import TopNavHeader from "@/components/TopNavHeader";
import MobileSearchBar from "@/components/MobileSearchBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileStationCard from "@/components/MobileStationCard";
import SessionsModal from "@/components/SessionsModal";
import NotificationsModal from "@/components/NotificationsModal";
import { DEFAULT_VEHICLE } from "@/data/vehicles";
import { QrCode, Crosshair, SlidersHorizontal } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  // Navigation & View Mode: 'map' | 'home'
  const [currentView, setCurrentView] = useState("map");
  const [mobileNavTab, setMobileNavTab] = useState("map");

  // Vehicle Onboarding & Garage Profile
  const [selectedEv, setSelectedEv] = useState(DEFAULT_VEHICLE);
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
  const [showH3Overlay, setShowH3Overlay] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [activeMobileStation, setActiveMobileStation] = useState(null);
  const [focusCoordinate, setFocusCoordinate] = useState(null);
  const [activeFilterChip, setActiveFilterChip] = useState("available"); // 'available' | 'all' | 'community'
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);

  // Viewport Spatial Search & Dynamic H3 Hierarchy
  const [viewportCenter, setViewportCenter] = useState({ latitude: 10.307, longitude: 76.333 });
  const [viewportZoom, setViewportZoom] = useState(7.5);
  const [viewportBounds, setViewportBounds] = useState(null);
  const [viewportNearbyStations, setViewportNearbyStations] = useState([]);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);
  const [nearbySortBy, setNearbySortBy] = useState("distance");
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(30);
  const [activePlannerTab, setActivePlannerTab] = useState("planner");
  const viewportDebounceRef = useRef(null);

  // Status
  const [isLoading, setIsLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Road Routing & EV States
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [presetCities, setPresetCities] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [batterySoC, setBatterySoC] = useState(35);
  const [minReserveSoC, setMinReserveSoC] = useState(15);
  const [isRouting, setIsRouting] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [selectedStationStop, setSelectedStationStop] = useState(null);

  // Check saved vehicle or trigger onboarding on first visit
  useEffect(() => {
    try {
      const savedVehicle = localStorage.getItem("zoltraak_user_ev");
      const hasOnboarded = localStorage.getItem("zoltraak_has_onboarded");
      if (savedVehicle) {
        setSelectedEv(JSON.parse(savedVehicle));
      }
      if (!hasOnboarded) {
        setIsVehicleSelectorOpen(true);
      }
    } catch (e) {
      console.warn("Storage reading error:", e);
    }
  }, []);

  const handleVehicleSelect = (vehicle) => {
    setSelectedEv(vehicle);
    try {
      localStorage.setItem("zoltraak_user_ev", JSON.stringify(vehicle));
      localStorage.setItem("zoltraak_has_onboarded", "true");
    } catch (e) {}
  };

  // Fetch Preset Cities
  const fetchPresetCities = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/routing/preset-cities`);
      if (res.ok) {
        const cities = await res.json();
        setPresetCities(cities);
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

  // Fetch Dynamic H3 Grid
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

  // Fetch nearby stations around visible viewport center
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
          const items = data.items || [];
          setViewportNearbyStations(items);
          // Pre-populate mobile card if empty
          if (!activeMobileStation && items.length > 0) {
            setActiveMobileStation(items[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nearby stations:", err);
      } finally {
        setIsFetchingNearby(false);
      }
    },
    [nearbyRadiusKm, nearbySortBy, selectedConnector, minPower, activeMobileStation]
  );

  // Viewport change listener
  const handleViewportChange = useCallback(
    ({ latitude, longitude, zoom, bounds }) => {
      setViewportCenter({ latitude, longitude });
      setViewportZoom(zoom);
      setViewportBounds(bounds);

      if (viewportDebounceRef.current) {
        clearTimeout(viewportDebounceRef.current);
      }

      viewportDebounceRef.current = setTimeout(() => {
        if (showH3Overlay) {
          fetchH3Grid(zoom, bounds);
        }
        fetchNearbyStations(latitude, longitude, nearbyRadiusKm, nearbySortBy);
      }, 250);
    },
    [showH3Overlay, fetchH3Grid, fetchNearbyStations, nearbyRadiusKm, nearbySortBy]
  );

  useEffect(() => {
    if (showH3Overlay) {
      fetchH3Grid(viewportZoom, viewportBounds);
    }
  }, [showH3Overlay, viewportZoom, viewportBounds, fetchH3Grid]);

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

  // Calculate OSRM Route
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
        battery_capacity_kwh: selectedEv?.capacityKwh || 32.6,
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

      if (data.routed_via_station) {
        const matched = data.candidate_stations?.find(
          (c) => c.id === data.routed_via_station.station_id
        );
        const st =
          matched || {
            id: data.routed_via_station.station_id,
            name: data.routed_via_station.station_name,
            latitude: data.routed_via_station.station_latitude,
            longitude: data.routed_via_station.station_longitude,
          };
        setSelectedStationStop(st);
        setActiveMobileStation(st);
      } else {
        setSelectedStationStop(null);
      }
    } catch (err) {
      console.error("Routing calculation error:", err);
    } finally {
      setIsRouting(false);
    }
  };

  useEffect(() => {
    if (origin && destination && !routeData) {
      handleCalculateRoute();
    }
  }, [origin, destination]);

  const handleSelectStationStop = (station) => {
    setSelectedStationStop(station);
    setActiveMobileStation(station);
    handleCalculateRoute(station);
  };

  const handleClearStationStop = () => {
    setSelectedStationStop(null);
    handleCalculateRoute({ id: -1 });
  };

  const handleClearRoute = () => {
    setRouteData(null);
    setSelectedStationStop(null);
    setActivePlannerTab("nearby");
  };

  // Filter stations based on search query & active chips
  const filteredStations = useMemo(() => {
    let result = stations;

    // Filter by availability chip
    if (activeFilterChip === "available") {
      result = result.filter(
        (st) => !st.status || st.status.toLowerCase().includes("operational") || st.is_available !== false
      );
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();

    return result.filter((st) => {
      const nameMatch = (st.name || "").toLowerCase().includes(q);
      const addressMatch = (st.address || "").toLowerCase().includes(q);
      const cityMatch = (st.city || "").toLowerCase().includes(q);
      const opMatch = (st.operator_name || "").toLowerCase().includes(q);
      return nameMatch || addressMatch || cityMatch || opMatch;
    });
  }, [stations, searchQuery, activeFilterChip]);

  // Active route coordinates
  const activeRouteCoordinates = useMemo(() => {
    if (!routeData) return null;
    if (routeData.routed_via_station?.coordinates) {
      return routeData.routed_via_station.coordinates;
    }
    return routeData.direct_route?.coordinates || null;
  }, [routeData]);

  // Handle Bottom Nav switching
  const handleMobileNavTabChange = (tabId) => {
    setMobileNavTab(tabId);
    if (tabId === "map") {
      setCurrentView("map");
    } else if (tabId === "profile") {
      setIsProfileOpen(true);
    } else if (tabId === "sessions") {
      setIsSessionsOpen(true);
    } else if (tabId === "notifications") {
      setIsNotificationsOpen(true);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans select-none">
      {/* Top Header matching Image 4: [ Home NEW | Map View ] */}
      <TopNavHeader
        currentView={currentView}
        onViewChange={(v) => {
          setCurrentView(v);
          if (v === "map") setMobileNavTab("map");
        }}
        selectedVehicle={selectedEv}
        onChangeVehicleClick={() => setIsVehicleSelectorOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* VIEW 1: LANDING PAGE */}
      {currentView === "home" ? (
        <div className="w-full h-full pt-14 overflow-y-auto">
          <LandingPage
            onOpenMap={() => {
              setCurrentView("map");
              setMobileNavTab("map");
            }}
            selectedVehicle={selectedEv}
            onChangeVehicleClick={() => setIsVehicleSelectorOpen(true)}
            batterySoC={batterySoC}
            totalStations={metadata.total_stations}
            totalCommunityChargers={communityChargers.length}
            onOpenListHomeChargerModal={() => setIsListHomeChargerOpen(true)}
            onSelectCorridor={(orig, dest) => {
              setOrigin(orig);
              setDestination(dest);
              handleCalculateRoute();
            }}
            onSearchPlace={(q) => {
              setSearchQuery(q);
            }}
          />
        </div>
      ) : (
        /* VIEW 2: INTERACTIVE MAP VIEW */
        <div className="relative w-full h-full">
          {/* 1. MapLibre GL Map */}
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
            onSelectStation={(st) => {
              setSelectedStation(st);
              setActiveMobileStation(st);
            }}
            onRouteViaStation={(st) => handleSelectStationStop(st)}
            focusCoordinate={focusCoordinate}
            onViewportChange={handleViewportChange}
            h3Resolution={h3Resolution}
            showCenterReticle={!routeData}
            communityChargers={communityChargers}
            showCommunityChargers={showCommunityChargers}
            setShowCommunityChargers={setShowCommunityChargers}
          />

          {/* 2. Top Search & Filter Bar (Matching Image 4) */}
          <div className="absolute top-16 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-30 transition-all">
            <MobileSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectPlace={(lng, lat) => setFocusCoordinate([lng, lat])}
              activeFilterChip={activeFilterChip}
              setActiveFilterChip={setActiveFilterChip}
              showH3Overlay={showH3Overlay}
              setShowH3Overlay={setShowH3Overlay}
              showCommunityChargers={showCommunityChargers}
              setShowCommunityChargers={setShowCommunityChargers}
              onOpenAdvancedFilters={() => setShowDesktopFilters(!showDesktopFilters)}
              onLocateMe={() => setFocusCoordinate([76.333, 10.307])}
              apiBaseUrl={API_BASE_URL}
            />

            {/* Expandable Advanced Filter Drawer */}
            {showDesktopFilters && (
              <div className="mt-2">
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
            )}
          </div>

          {/* 3. Floating Map Action Buttons (Matching Image 4) */}
          <div className="absolute right-4 top-40 z-20 flex flex-col space-y-3 pointer-events-auto">
            {/* QR Scanner button matching Image 4 */}
            <button
              type="button"
              onClick={() => {
                alert("EVOK QR Scan: Ready to scan QR code at any Kerala charging station or community wallbox!");
              }}
              className="w-11 h-11 rounded-full bg-zinc-900/90 text-white flex items-center justify-center shadow-xl border border-zinc-700/80 hover:bg-black active:scale-95 transition-all"
              title="Scan Charger QR Code"
            >
              <QrCode className="w-5 h-5" />
            </button>

            {/* Locate Me crosshairs button matching Image 4 */}
            <button
              type="button"
              onClick={() => {
                setFocusCoordinate([76.3385, 10.3065]);
              }}
              className="w-11 h-11 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-xl border border-zinc-200 hover:bg-zinc-100 active:scale-95 transition-all"
              title="Center Location"
            >
              <Crosshair className="w-5 h-5 text-amber-600" />
            </button>
          </div>

          {/* 4. Left Route Planner Panel (Desktop & Highway corridor mode) */}
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

          {/* 5. Floating Bottom Station Preview Card (Matching Image 4) */}
          {activeMobileStation && !selectedStation && (
            <div className="absolute bottom-20 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] z-20 flex justify-center">
              <MobileStationCard
                station={activeMobileStation}
                onGetDirection={(st) => handleSelectStationStop(st)}
                onChargeNow={(st) => setSelectedStation(st)}
                onClose={() => setActiveMobileStation(null)}
              />
            </div>
          )}

          {/* 6. Full Station Details Drawer (when user taps for full info) */}
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

          {/* 7. Mobile Bottom Navigation Bar (Matching Image 4) */}
          <MobileBottomNav
            activeTab={mobileNavTab}
            onTabChange={handleMobileNavTabChange}
            unreadNotifications={1}
          />
        </div>
      )}

      {/* 8. Vehicle Onboarding & Selector Modal (Step 1 -> 2 -> 3 from Images 1, 2, 3) */}
      <VehicleSelectorModal
        isOpen={isVehicleSelectorOpen}
        onClose={() => setIsVehicleSelectorOpen(false)}
        onSelectVehicle={handleVehicleSelect}
        currentVehicle={selectedEv}
        canDismiss={true}
      />

      {/* 9. Profile & My Garage Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setMobileNavTab("map");
        }}
        selectedVehicle={selectedEv}
        onChangeVehicleClick={() => {
          setIsProfileOpen(false);
          setIsVehicleSelectorOpen(true);
        }}
        batterySoC={batterySoC}
        setBatterySoC={setBatterySoC}
        minReserveSoC={minReserveSoC}
        setMinReserveSoC={setMinReserveSoC}
        onOpenListHomeChargerModal={() => setIsListHomeChargerOpen(true)}
      />

      {/* 10. Sessions Modal */}
      <SessionsModal
        isOpen={isSessionsOpen}
        onClose={() => {
          setIsSessionsOpen(false);
          setMobileNavTab("map");
        }}
        selectedVehicle={selectedEv}
      />

      {/* 11. Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          setMobileNavTab("map");
        }}
      />

      {/* 12. List Community Home Charger Modal */}
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

      {/* 13. System Status Indicator */}
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
    </main>
  );
}
