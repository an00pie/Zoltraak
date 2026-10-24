"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapPin, Navigation, Zap } from "lucide-react";
import MapView from "@/components/MapView";
import FilterBar from "@/components/FilterBar";
import RoutePlannerPanel from "@/components/RoutePlannerPanel";
import RoutePlannerModal from "@/components/RoutePlannerModal";
import MapFloatingControls from "@/components/MapFloatingControls";
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
import AuthModal, { PRESET_PROFILES } from "@/components/AuthModal";
import ReportStationModal from "@/components/ReportStationModal";
import OwnerDashboardModal from "@/components/OwnerDashboardModal";
import { DEFAULT_VEHICLE } from "@/data/vehicles";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const getRoutingStationId = (station) => {
  if (!station || station.id == null) return null;
  const isCommunity = Boolean(station.is_community_host || station.host_name);
  const stationId = Number(station.id);
  return isCommunity && stationId < 100000 ? stationId + 100000 : stationId;
};

export default function Home() {
  // Navigation & View Mode: 'map' | 'home'
  const [currentView, setCurrentView] = useState("map");
  const [mobileNavTab, setMobileNavTab] = useState("map");

  // User Authentication & Role System
  const [currentUser, setCurrentUser] = useState(PRESET_PROFILES[0]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOwnerDashboardOpen, setIsOwnerDashboardOpen] = useState(false);

  // Crowdsourced Reporting Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportingStation, setReportingStation] = useState(null);

  // Station Filter Mode: 'all' | 'community_only' | 'public_only'
  const [stationFilterMode, setStationFilterMode] = useState("all");

  // Vehicle Onboarding & Garage Profile
  const [selectedEv, setSelectedEv] = useState(DEFAULT_VEHICLE);
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Dedicated Route A -> B Modal
  const [isRoutePlannerModalOpen, setIsRoutePlannerModalOpen] = useState(false);

  // Map Controls & Display Settings (Clustering OFF by default)
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [currentStyle, setCurrentStyle] = useState("light");
  const [isLocating, setIsLocating] = useState(false);

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

  // Road Routing & EV States (Starts Clean in Free Exploration Mode - NO auto predefined route)
  const [presetCities, setPresetCities] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [batterySoC, setBatterySoC] = useState(35);
  const [minReserveSoC, setMinReserveSoC] = useState(15);
  const [isRouting, setIsRouting] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [selectedStationStop, setSelectedStationStop] = useState(null);

  // Check saved vehicle and user role on first visit
  useEffect(() => {
    try {
      const savedVehicle = localStorage.getItem("zoltraak_user_ev");
      const hasOnboarded = localStorage.getItem("zoltraak_has_onboarded");
      const savedUser = localStorage.getItem("zoltraak_auth_user");
      if (savedVehicle) {
        setSelectedEv(JSON.parse(savedVehicle));
      }
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
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

  const handleSelectUser = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("zoltraak_auth_user", JSON.stringify(user));
    } catch (e) {}
  };

  const handleOpenReportModal = (st) => {
    setReportingStation(st);
    setIsReportModalOpen(true);
  };

  // Real Browser GPS Geolocation Recenter
  const handleLocateMe = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setFocusCoordinate([Number(longitude.toFixed(5)), Number(latitude.toFixed(5))]);
        setViewportCenter({ latitude, longitude });
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation permission error:", err);
        alert("Location access was denied. Please allow location permissions in your browser to center on your position.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Fetch Preset Cities (Does NOT force a route on start)
  const fetchPresetCities = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/routing/preset-cities`);
      if (res.ok) {
        const cities = await res.json();
        setPresetCities(cities);
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
        setCommunityChargers(Array.isArray(data) ? data : (data.items || []));
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
        }
      } catch (err) {
        console.warn("Failed to fetch nearby stations:", err);
      } finally {
        setIsFetchingNearby(false);
      }
    },
    [nearbyRadiusKm, nearbySortBy, selectedConnector, minPower]
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

  // Calculate OSRM Route (Triggered ONLY when user explicitly asks for Route A -> B)
  const handleCalculateRoute = async (stationOverride = null, customOrigin = null, customDest = null) => {
    const orig = customOrigin || origin;
    const dest = customDest || destination;

    if (!orig || !dest) return;
    setIsRouting(true);

    try {
      const isExplicitClear = stationOverride && stationOverride.id === -1;
      const targetStationId = isExplicitClear
        ? -1
        : stationOverride
        ? getRoutingStationId(stationOverride)
        : null;

      const payload = {
        origin: {
          name: orig.name,
          latitude: orig.latitude,
          longitude: orig.longitude,
        },
        destination: {
          name: dest.name,
          latitude: dest.latitude,
          longitude: dest.longitude,
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
        const activeStation = st.is_community_host
          ? communityChargers.find((charger) => charger.id === st.id - 100000) || st
          : st;
        setActiveMobileStation(activeStation);
      } else {
        setSelectedStationStop(null);
      }
    } catch (err) {
      console.error("Routing calculation error:", err);
      alert("Unable to calculate road route between selected locations. Please check internet connectivity.");
    } finally {
      setIsRouting(false);
    }
  };

  const handleSelectStationStop = (station) => {
    setSelectedStationStop(
      station?.id == null ? station : { ...station, id: getRoutingStationId(station) }
    );
    setActiveMobileStation(station);
    if (origin && destination) {
      handleCalculateRoute(station);
    }
  };

  const handleClearStationStop = () => {
    setSelectedStationStop(null);
    handleCalculateRoute({ id: -1 });
  };

  const handleClearRoute = () => {
    setRouteData(null);
    setSelectedStationStop(null);
    setOrigin(null);
    setDestination(null);
    setActiveMobileStation(null);
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

  const mobileNearbyStations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const publicStations = viewportNearbyStations.map((station) => ({
      ...station,
      is_community_host: false,
    }));
    const communityStations = communityChargers.map((station) => {
      const latitudeDelta = ((station.latitude - viewportCenter.latitude) * Math.PI) / 180;
      const longitudeDelta = ((station.longitude - viewportCenter.longitude) * Math.PI) / 180;
      const latitudeRadians = (viewportCenter.latitude * Math.PI) / 180;
      const distance = 2 * 6371 * Math.asin(Math.sqrt(
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(latitudeRadians) * Math.cos((station.latitude * Math.PI) / 180) *
        Math.sin(longitudeDelta / 2) ** 2
      ));
      return { ...station, name: station.title, distance_km: distance, max_power_kw: station.power_kw };
    });

    return [...publicStations, ...communityStations]
      .filter((station) => {
        const isCommunity = Boolean(station.is_community_host || station.host_name);
        if (stationFilterMode === "community_only" && !isCommunity) return false;
        if (stationFilterMode === "public_only" && isCommunity) return false;
        if (activeFilterChip === "available" && (station.is_available === false || ["unavailable", "offline"].includes((station.availability_status || station.status || "").toLowerCase()))) return false;
        if (!query) return true;
        return [station.name, station.address, station.city, station.operator_name, station.host_name]
          .some((value) => (value || "").toLowerCase().includes(query));
      })
      .sort((first, second) => (first.distance_km ?? Infinity) - (second.distance_km ?? Infinity))
      .slice(0, 12);
  }, [viewportNearbyStations, communityChargers, viewportCenter, searchQuery, stationFilterMode, activeFilterChip]);

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
    <main className="app-shell relative w-screen h-[100dvh] overflow-hidden bg-zinc-950 font-sans select-none">
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
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenOwnerDashboard={() => setIsOwnerDashboardOpen(true)}
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
              handleCalculateRoute(null, orig, dest);
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
            stationFilterMode={stationFilterMode}
            clusteringEnabled={clusteringEnabled}
            setClusteringEnabled={setClusteringEnabled}
            currentStyle={currentStyle}
            setCurrentStyle={setCurrentStyle}
            onClearRoute={handleClearRoute}
          />

          {/* 2. Top Search & Filter Bar (Matching Image 4) */}
          <div className="map-search absolute top-[calc(env(safe-area-inset-top)+6.5rem)] inset-x-3 sm:top-16 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-30 transition-all">
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
              stationFilterMode={stationFilterMode}
              onChangeStationFilterMode={setStationFilterMode}
              onOpenAdvancedFilters={() => setShowDesktopFilters(!showDesktopFilters)}
              onLocateMe={handleLocateMe}
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

          {/* 3. Floating Map Controls (Right-Side Floating Island) */}
          <MapFloatingControls
            onOpenRoutePlanner={() => setIsRoutePlannerModalOpen(true)}
            hasActiveRoute={Boolean(routeData)}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
            clusteringEnabled={clusteringEnabled}
            onToggleClustering={() => setClusteringEnabled(!clusteringEnabled)}
            showH3Overlay={showH3Overlay}
            onToggleH3={() => setShowH3Overlay(!showH3Overlay)}
            stationFilterMode={stationFilterMode}
            onChangeStationFilterMode={setStationFilterMode}
            totalCommunityChargers={communityChargers.length}
            currentStyle={currentStyle}
            onChangeStyle={(st) => setCurrentStyle(st)}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenOwnerDashboard={() => setIsOwnerDashboardOpen(true)}
          />

          {/* 4. Floating Bottom Station Preview Card (Matching Image 4) */}
          {activeMobileStation && !selectedStation && (
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.8rem)] inset-x-3 sm:bottom-20 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] z-20 flex justify-center">
              <MobileStationCard
                station={activeMobileStation}
                hasActiveRoute={Boolean(routeData)}
                onOpenReportModal={handleOpenReportModal}
                onGetDirection={(st) => {
                  if (origin && destination) {
                    handleSelectStationStop(st);
                  } else {
                    // Pre-fill destination and prompt for route
                    setDestination({
                      name: st.name || st.title,
                      latitude: st.latitude,
                      longitude: st.longitude,
                    });
                    setIsRoutePlannerModalOpen(true);
                  }
                }}
                onChargeNow={(st) => setSelectedStation(st)}
                onClose={() => setActiveMobileStation(null)}
              />
            </div>
          )}

          {!activeMobileStation && !selectedStation && (
            <section
              aria-label="Nearby charging stations"
              className="mobile-nearby-strip absolute bottom-[calc(env(safe-area-inset-bottom)+5.7rem)] left-3 right-[4.25rem] z-20 sm:hidden"
            >
              <div className="mb-2 flex items-center justify-between px-1 text-zinc-800">
                <h2 className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold shadow-sm backdrop-blur-sm">
                  Nearby chargers
                </h2>
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-sm">
                  {isFetchingNearby ? "Updating…" : `${mobileNearbyStations.length} options`}
                </span>
              </div>
              {mobileNearbyStations.length > 0 ? (
                <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {mobileNearbyStations.map((station) => {
                    const isCommunity = Boolean(station.is_community_host || station.host_name);
                    const stationName = station.name || station.title || "EV charging station";
                    const connectorLabels = isCommunity
                      ? [station.connector_type].filter(Boolean)
                      : (station.connectors || []).map((connector) => connector.connector_type).filter(Boolean);
                    return (
                      <article
                        key={`${isCommunity ? "community" : "public"}-${station.id}`}
                        className="w-[min(82vw,310px)] shrink-0 snap-start rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-xl"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isCommunity ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                              {isCommunity ? "Alpha Guaranteed" : "Public charger"}
                            </span>
                            <h3 className="mt-1 truncate text-sm font-bold">{stationName}</h3>
                            <p className="truncate text-[11px] text-zinc-500">
                              {station.operator_name || station.host_name || station.address || station.city || "Kerala"}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-700">
                            {Number.isFinite(Number(station.distance_km)) ? `${Number(station.distance_km).toFixed(1)} km` : "Nearby"}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 overflow-hidden text-[10px] font-semibold text-emerald-700">
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1">
                            <Zap className="h-3 w-3 fill-current" />
                            {station.max_power_kw || station.power_kw || "—"} kW
                          </span>
                          <span className="truncate rounded-md bg-zinc-100 px-2 py-1 text-zinc-600">
                            {connectorLabels.length ? connectorLabels.join(" · ") : "Connector details"}
                          </span>
                          {isCommunity && station.price_per_kwh != null && (
                            <span className="shrink-0 text-zinc-600">₹{station.price_per_kwh}/kWh</span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStation(station);
                              setFocusCoordinate([station.longitude, station.latitude]);
                            }}
                            className="rounded-xl bg-blue-50 px-2 py-2 text-xs font-bold text-blue-700"
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDestination({ name: stationName, latitude: station.latitude, longitude: station.longitude });
                              setIsRoutePlannerModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-700"
                          >
                            <Navigation className="h-3.5 w-3.5" /> Directions
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-white/95 p-3 text-xs text-zinc-600 shadow-lg">
                  {isFetchingNearby ? "Finding chargers near this map area…" : "No chargers match these filters nearby."}
                </div>
              )}
            </section>
          )}

          {/* 5. Full Station Details Drawer (when user taps for full info) */}
          {selectedStation && (
            <StationDetailsDrawer
              station={selectedStation}
              onClose={() => setSelectedStation(null)}
              onFocus={(lng, lat) => setFocusCoordinate([lng, lat])}
              onRouteViaStation={(st) => handleSelectStationStop(st)}
              onClearStationStop={handleClearStationStop}
              isSelectedStop={
                selectedStationStop?.id === getRoutingStationId(selectedStation) ||
                routeData?.routed_via_station?.station_id === getRoutingStationId(selectedStation)
              }
              currentUser={currentUser}
              onOpenReportModal={handleOpenReportModal}
              onOpenOwnerDashboard={() => setIsOwnerDashboardOpen(true)}
              apiBaseUrl={API_BASE_URL}
            />
          )}

          {/* 6. Mobile Bottom Navigation Bar (Matching Image 4) */}
          <MobileBottomNav
            activeTab={mobileNavTab}
            onTabChange={handleMobileNavTabChange}
            unreadNotifications={1}
          />
        </div>
      )}

      {/* 7. Dedicated Route Planner Modal (Point A to Point B) */}
      <RoutePlannerModal
        isOpen={isRoutePlannerModalOpen}
        onClose={() => setIsRoutePlannerModalOpen(false)}
        origin={origin}
        setOrigin={setOrigin}
        destination={destination}
        setDestination={setDestination}
        presetCities={presetCities}
        batterySoC={batterySoC}
        setBatterySoC={setBatterySoC}
        minReserveSoC={minReserveSoC}
        setMinReserveSoC={setMinReserveSoC}
        selectedVehicle={selectedEv}
        onChangeVehicleClick={() => {
          setIsRoutePlannerModalOpen(false);
          setIsVehicleSelectorOpen(true);
        }}
        onCalculateRoute={(routeOrigin, routeDestination) =>
          handleCalculateRoute(null, routeOrigin, routeDestination)
        }
        onClearRoute={handleClearRoute}
        isRouting={isRouting}
        routeData={routeData}
      />

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

      {/* 13. User Authentication & Role Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
      />

      {/* 14. Crowdsourced Driver Reporting & Rating Modal */}
      <ReportStationModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportingStation(null);
        }}
        station={reportingStation}
        currentUser={currentUser}
        apiBaseUrl={API_BASE_URL}
        onReportSuccess={() => {
          fetchStations();
          fetchCommunityChargers();
          if (selectedStation) {
            setSelectedStation({ ...selectedStation });
          }
        }}
      />

      {/* 15. Homeowner & Operator Management Dashboard Modal */}
      <OwnerDashboardModal
        isOpen={isOwnerDashboardOpen}
        onClose={() => setIsOwnerDashboardOpen(false)}
        currentUser={currentUser}
        communityChargers={communityChargers}
        publicStations={stations}
        apiBaseUrl={API_BASE_URL}
        onChargerUpdated={(updatedCharger) => {
          fetchCommunityChargers();
          fetchStations();
          if (updatedCharger && updatedCharger.latitude && updatedCharger.longitude) {
            setFocusCoordinate([Number(updatedCharger.longitude), Number(updatedCharger.latitude)]);
          }
        }}
      />

      {/* 16. System Status Indicator */}
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
