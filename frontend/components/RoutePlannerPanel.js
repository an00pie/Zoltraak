"use client";

import React, { useState, useEffect } from "react";
import {
  Navigation,
  MapPin,
  BatteryCharging,
  ArrowRight,
  ArrowUpDown,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Sliders,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
} from "lucide-react";
import LocationAutocomplete from "./LocationAutocomplete";

export const EV_PRESETS = [
  { name: "Tata Nexon EV Max", capacityKwh: 40.5, nominalRangeKm: 270 },
  { name: "MG ZS EV Long Range", capacityKwh: 50.3, nominalRangeKm: 335 },
  { name: "Mahindra XUV400 EL", capacityKwh: 39.4, nominalRangeKm: 260 },
  { name: "Tata Curvv EV (55)", capacityKwh: 55.0, nominalRangeKm: 365 },
  { name: "Hyundai Ioniq 5", capacityKwh: 72.6, nominalRangeKm: 480 },
];

export default function RoutePlannerPanel({
  origin,
  setOrigin,
  destination,
  setDestination,
  presetCities = [],
  batterySoC,
  setBatterySoC,
  selectedEv,
  setSelectedEv,
  minReserveSoC,
  setMinReserveSoC,
  onCalculateRoute,
  isRouting = false,
  routeData = null,
  selectedStationStop = null,
  onSelectStationStop,
  onClearStationStop,
  onFocusCoordinate,
  isOpen = true,
  setIsOpen,
}) {
  const [activeTab, setActiveTab] = useState("planner"); // 'planner' | 'stations'
  const [stationFilterTier, setStationFilterTier] = useState("all"); // 'all' | 'optimal' | 'acceptable' | 'suboptimal'
  const [showEvSettings, setShowEvSettings] = useState(false);

  // Auto-switch to stations tab when route data arrives
  useEffect(() => {
    if (routeData && routeData.candidate_stations?.length > 0) {
      setActiveTab("stations");
    }
  }, [routeData]);

  const handleSwapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const candidateStations = routeData?.candidate_stations || [];
  const filteredCandidates = candidateStations.filter((s) => {
    if (stationFilterTier === "all") return true;
    return s.tier === stationFilterTier;
  });

  return (
    <aside
      className={`absolute top-4 left-4 z-30 transition-all duration-300 flex flex-col ${
        isOpen
          ? "w-[calc(100vw-2rem)] md:w-[440px] max-h-[calc(100vh-2rem)]"
          : "w-auto"
      }`}
    >
      {/* Toggle button when collapsed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-dark-800/95 border border-brand-500/50 text-brand-400 font-bold text-xs rounded-xl shadow-2xl backdrop-blur-md hover:bg-dark-700 transition-colors"
        >
          <Navigation className="w-4 h-4 text-brand-400" />
          <span>EV Route Planner (Phase 3)</span>
        </button>
      )}

      {/* Main expanded panel */}
      {isOpen && (
        <div className="bg-dark-800/95 backdrop-blur-2xl border border-gray-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs max-h-[inherit]">
          {/* Header */}
          <div className="p-3.5 border-b border-gray-700/70 bg-dark-900/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-400">
                <Navigation className="w-4 h-4 fill-brand-400/20" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-gray-100">
                  EV Corridor Route Planner
                </h2>
                <p className="text-[11px] text-gray-400">
                  OSRM road snapped routing & detour optimization
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
              title="Minimize Route Planner"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs (Planner vs Candidate Stations) */}
          <div className="flex border-b border-gray-700/60 bg-dark-900/40 px-2 pt-1">
            <button
              onClick={() => setActiveTab("planner")}
              className={`flex-1 py-2 font-bold text-center border-b-2 transition-colors ${
                activeTab === "planner"
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              Route & Battery
            </button>
            <button
              onClick={() => setActiveTab("stations")}
              className={`flex-1 py-2 font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "stations"
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>En-Route Chargers</span>
              {candidateStations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-mono">
                  {candidateStations.length}
                </span>
              )}
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "planner" && (
              <>
                {/* Location Inputs (A to B) with Autocomplete */}
                <div className="space-y-3 p-3 bg-dark-900/60 border border-gray-700/60 rounded-xl relative">
                  {/* Origin A */}
                  <LocationAutocomplete
                    label="Origin (Start A)"
                    value={origin}
                    onChange={setOrigin}
                    presetCities={presetCities}
                    placeholder="Type origin (e.g. Kochi, Chalakudy, Bangalore)..."
                    accentColor="emerald"
                    enableGps={true}
                  />

                  {/* Swap Button & Quick Route Presets */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-gray-500 font-medium">Highway Corridors</span>
                    <button
                      type="button"
                      onClick={handleSwapLocations}
                      className="p-1 px-2.5 rounded-lg bg-dark-800 border border-gray-700 hover:border-brand-500 text-gray-400 hover:text-brand-400 transition-colors flex items-center gap-1.5 text-[11px]"
                      title="Swap Origin and Destination"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Swap A ⇄ B</span>
                    </button>
                  </div>

                  {/* Destination B */}
                  <LocationAutocomplete
                    label="Destination (End B)"
                    value={destination}
                    onChange={setDestination}
                    presetCities={presetCities}
                    placeholder="Type destination (e.g. Thrissur, Palakkad, Kozhikode)..."
                    accentColor="rose"
                    enableGps={false}
                  />

                  {/* Quick Corridor Chips */}
                  <div className="pt-1 border-t border-gray-800/80">
                    <p className="text-[10px] text-gray-400 mb-1.5 font-medium">Quick Routes:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          from: { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
                          to: { name: "Chalakudy", latitude: 10.307, longitude: 76.333 },
                          label: "Kochi → Chalakudy",
                        },
                        {
                          from: { name: "Chalakudy", latitude: 10.307, longitude: 76.333 },
                          to: { name: "Thrissur", latitude: 10.5276, longitude: 76.2144 },
                          label: "Chalakudy → Thrissur",
                        },
                        {
                          from: { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
                          to: { name: "Palakkad", latitude: 10.7867, longitude: 76.6548 },
                          label: "Kochi → Palakkad",
                        },
                        {
                          from: { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
                          to: { name: "Mysuru", latitude: 12.2958, longitude: 76.6394 },
                          label: "Bengaluru → Mysuru",
                        },
                      ].map((corridor, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setOrigin(corridor.from);
                            setDestination(corridor.to);
                          }}
                          className="px-2 py-0.5 bg-dark-800 hover:bg-dark-700 border border-gray-700/80 hover:border-brand-500/60 rounded-md text-[10px] text-gray-300 hover:text-brand-300 transition-colors"
                        >
                          {corridor.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* EV Battery & Vehicle Parameters */}
                <div className="p-3 bg-dark-900/60 border border-gray-700/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                      <BatteryCharging className="w-4 h-4 text-brand-400" />
                      Battery & Range Parameters
                    </span>
                    <button
                      onClick={() => setShowEvSettings(!showEvSettings)}
                      className="text-gray-400 hover:text-brand-400 flex items-center gap-1 text-[11px]"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>{showEvSettings ? "Hide Models" : "Change EV"}</span>
                    </button>
                  </div>

                  {/* Vehicle Model Selector */}
                  {showEvSettings && (
                    <div className="space-y-1.5 pt-2 border-t border-gray-800">
                      <label className="text-gray-400 text-[11px]">Selected EV Model</label>
                      <select
                        value={selectedEv.name}
                        onChange={(e) => {
                          const ev = EV_PRESETS.find((v) => v.name === e.target.value);
                          if (ev) setSelectedEv(ev);
                        }}
                        className="w-full bg-dark-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-200 text-xs"
                      >
                        {EV_PRESETS.map((ev) => (
                          <option key={ev.name} value={ev.name}>
                            {ev.name} ({ev.capacityKwh} kWh)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Battery State of Charge (SoC) Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-[11px]">Current Battery Level (SoC)</span>
                      <span
                        className={`font-mono font-bold text-xs ${
                          batterySoC > 50
                            ? "text-emerald-400"
                            : batterySoC > 20
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {batterySoC}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={batterySoC}
                      onChange={(e) => setBatterySoC(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span>Empty (5%)</span>
                      <span>Half (50%)</span>
                      <span>Full (100%)</span>
                    </div>
                  </div>

                  {/* Minimum Arrival Reserve Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-[11px]">Min. Arrival Safety Reserve</span>
                      <span className="font-mono font-bold text-xs text-brand-300">
                        {minReserveSoC}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={minReserveSoC}
                      onChange={(e) => setMinReserveSoC(Number(e.target.value))}
                      className="w-full accent-brand-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Calculate Route Action Button */}
                <button
                  onClick={onCalculateRoute}
                  disabled={!origin || !destination || isRouting}
                  className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 text-dark-900 font-extrabold rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 text-xs"
                >
                  <Navigation className={`w-4 h-4 ${isRouting ? "animate-spin" : ""}`} />
                  <span>
                    {isRouting ? "Calculating OSRM Corridor..." : "Calculate EV Route & Detours"}
                  </span>
                </button>

                {/* Direct Route Summary Box */}
                {routeData && (
                  <div className="p-3 bg-dark-900/80 border border-gray-700/80 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-200">Trip Overview</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          routeData.battery_parameters.is_direct_feasible
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {routeData.battery_parameters.is_direct_feasible
                          ? "Direct Range OK"
                          : "Charging Stop Required"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-dark-800 rounded-lg">
                        <div className="text-gray-400 text-[10px]">Highway Distance</div>
                        <div className="font-mono font-black text-gray-100 text-sm">
                          {routeData.direct_route.distance_km} km
                        </div>
                      </div>
                      <div className="p-2 bg-dark-800 rounded-lg">
                        <div className="text-gray-400 text-[10px]">Estimated Drive</div>
                        <div className="font-mono font-black text-gray-100 text-sm">
                          {Math.floor(routeData.direct_route.duration_min / 60)}h{" "}
                          {Math.round(routeData.direct_route.duration_min % 60)}m
                        </div>
                      </div>
                    </div>

                    {/* Active Selected Charging Stop Banner */}
                    {routeData.routed_via_station && (
                      <div className="p-2.5 bg-brand-500/10 border border-brand-500/40 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-brand-300 flex items-center gap-1 text-[11px]">
                            <Zap className="w-3.5 h-3.5 text-brand-400 fill-brand-400" />
                            Routed via: {routeData.routed_via_station.station_name}
                          </span>
                          <button
                            onClick={onClearStationStop}
                            className="text-gray-400 hover:text-rose-400 p-0.5"
                            title="Remove Charging Stop"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] text-gray-300 flex items-center gap-2">
                          <span>Total: <strong>{routeData.routed_via_station.total_distance_km} km</strong></span>
                          <span>•</span>
                          <span>Detour: <strong className="text-brand-400">+{routeData.routed_via_station.detour_km} km</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Candidate Stations Tab */}
            {activeTab === "stations" && (
              <div className="space-y-3">
                {/* Station Rating Filter Chips */}
                <div className="flex items-center gap-1.5 p-1 bg-dark-900 rounded-lg border border-gray-800 text-[11px]">
                  <button
                    onClick={() => setStationFilterTier("all")}
                    className={`flex-1 py-1 rounded-md font-medium transition-colors ${
                      stationFilterTier === "all"
                        ? "bg-gray-700 text-gray-100 font-bold"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    All ({candidateStations.length})
                  </button>
                  <button
                    onClick={() => setStationFilterTier("optimal")}
                    className={`flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
                      stationFilterTier === "optimal"
                        ? "bg-emerald-500 text-dark-900 font-bold"
                        : "text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Optimal</span>
                  </button>
                  <button
                    onClick={() => setStationFilterTier("acceptable")}
                    className={`flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
                      stationFilterTier === "acceptable"
                        ? "bg-amber-500 text-dark-900 font-bold"
                        : "text-amber-400 hover:bg-amber-500/10"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Acceptable</span>
                  </button>
                  <button
                    onClick={() => setStationFilterTier("suboptimal")}
                    className={`flex-1 py-1 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
                      stationFilterTier === "suboptimal"
                        ? "bg-rose-500 text-dark-900 font-bold"
                        : "text-rose-400 hover:bg-rose-500/10"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>Suboptimal</span>
                  </button>
                </div>

                {/* Candidate Station Cards */}
                {filteredCandidates.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredCandidates.map((st) => {
                      const isSelectedStop =
                        routeData?.routed_via_station?.station_id === st.id;

                      return (
                        <div
                          key={st.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelectedStop
                              ? "bg-brand-500/15 border-brand-400 shadow-md shadow-brand-500/10"
                              : "bg-dark-900/70 border-gray-700/60 hover:border-gray-600"
                          }`}
                        >
                          {/* Card Header with User's Color-Coding Specification */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                    st.tier === "optimal"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : st.tier === "acceptable"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  }`}
                                >
                                  {st.tier === "optimal" && <CheckCircle2 className="w-3 h-3" />}
                                  {st.tier === "acceptable" && <AlertTriangle className="w-3 h-3" />}
                                  {st.tier === "suboptimal" && <XCircle className="w-3 h-3" />}
                                  {st.tier_label}
                                </span>

                                <span className="text-gray-400 text-[10px] font-mono">
                                  +{st.detour_km} km detour
                                </span>
                              </div>

                              <h4 className="font-bold text-gray-100 text-xs line-clamp-1">
                                {st.name}
                              </h4>
                              <p className="text-[10px] text-gray-400 line-clamp-1">
                                {st.operator_name} • {st.address}
                              </p>
                            </div>

                            <button
                              onClick={() => onFocusCoordinate(st.longitude, st.latitude)}
                              className="p-1 rounded text-gray-400 hover:text-brand-400"
                              title="Center on Map"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Detour Reason & Arrival SoC */}
                          <p className="text-[11px] text-gray-300 mb-2 italic">
                            "{st.tier_reason}"
                          </p>

                          <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                            <div className="text-[11px]">
                              <span className="text-gray-400">Arrival SoC: </span>
                              <strong
                                className={`font-mono ${
                                  st.arrival_soc > 20
                                    ? "text-emerald-400"
                                    : st.arrival_soc > 10
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {st.arrival_soc}%
                              </strong>
                            </div>

                            {/* Add as Charging Stop Button */}
                            {isSelectedStop ? (
                              <button
                                onClick={onClearStationStop}
                                className="px-2.5 py-1 bg-brand-500 text-dark-900 font-extrabold rounded-lg flex items-center gap-1 text-[11px]"
                              >
                                <Check className="w-3 h-3" />
                                <span>Active Stop</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onSelectStationStop(st)}
                                className="px-2.5 py-1 bg-dark-800 hover:bg-brand-500 hover:text-dark-900 text-brand-300 border border-brand-500/30 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px]"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Route Via This</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-dark-900/50 rounded-xl text-center text-gray-400 space-y-1">
                    <p className="font-semibold text-gray-200">No Candidate Stations</p>
                    <p className="text-[11px]">
                      Calculate a route first, or adjust the filter tier above.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
