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
      className={`absolute top-4 left-4 z-30 transition-all duration-200 flex flex-col ${
        isOpen
          ? "w-[calc(100vw-2rem)] md:w-[420px] max-h-[calc(100vh-2rem)]"
          : "w-auto"
      }`}
    >
      {/* Toggle button when collapsed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium text-xs rounded-lg shadow-lg hover:bg-zinc-800 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span>Route Planner</span>
        </button>
      )}

      {/* Main expanded panel */}
      {isOpen && (
        <div className="bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-xl flex flex-col overflow-hidden text-xs max-h-[inherit]">
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-xs text-zinc-100">
                  Route Planner
                </h2>
                <p className="text-[10px] text-zinc-400">
                  Corridor detour & charging optimization
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
              title="Minimize Route Planner"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Control Tabs (Trip Setup vs En-Route Chargers) */}
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/30">
            <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setActiveTab("planner")}
                className={`flex-1 py-1.5 font-medium rounded-md text-center transition-all ${
                  activeTab === "planner"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Trip Setup
              </button>
              <button
                onClick={() => setActiveTab("stations")}
                className={`flex-1 py-1.5 font-medium rounded-md text-center transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "stations"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>En-Route Chargers</span>
                {candidateStations.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-zinc-300 text-[10px] font-mono">
                    {candidateStations.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "planner" && (
              <>
                {/* Location Inputs (A to B) with Autocomplete */}
                <div className="space-y-3 p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl relative">
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
                    <span className="text-[10px] text-zinc-500 font-medium">Highway Corridors</span>
                    <button
                      type="button"
                      onClick={handleSwapLocations}
                      className="p-1 px-2.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 text-[11px]"
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
                  <div className="pt-1.5 border-t border-zinc-800/80">
                    <p className="text-[10px] text-zinc-400 mb-1.5 font-medium">Quick Routes:</p>
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
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-zinc-300 transition-colors"
                        >
                          {corridor.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* EV Battery & Vehicle Parameters */}
                <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                      <BatteryCharging className="w-4 h-4 text-zinc-400" />
                      Vehicle & Battery
                    </span>
                    <button
                      onClick={() => setShowEvSettings(!showEvSettings)}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[11px]"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>{showEvSettings ? "Hide Models" : "Change EV"}</span>
                    </button>
                  </div>

                  {/* Vehicle Model Selector */}
                  {showEvSettings && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      <label className="text-zinc-400 text-[11px]">Selected EV Model</label>
                      <select
                        value={selectedEv.name}
                        onChange={(e) => {
                          const ev = EV_PRESETS.find((v) => v.name === e.target.value);
                          if (ev) setSelectedEv(ev);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-600"
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
                      <span className="text-zinc-400 text-[11px]">Current Battery Level (SoC)</span>
                      <span
                        className={`font-mono font-medium text-xs ${
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
                      className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>5%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Minimum Arrival Reserve Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[11px]">Min. Arrival Safety Reserve</span>
                      <span className="font-mono font-medium text-xs text-zinc-200">
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
                      className="w-full accent-zinc-400 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Calculate Route Action Button */}
                <button
                  onClick={onCalculateRoute}
                  disabled={!origin || !destination || isRouting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 text-xs"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isRouting ? "animate-spin" : ""}`} />
                  <span>
                    {isRouting ? "Calculating Route..." : "Calculate EV Route"}
                  </span>
                </button>

                {/* Direct Route Summary Box */}
                {routeData && (
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200">Trip Overview</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          routeData.battery_parameters.is_direct_feasible
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            : "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                        }`}
                      >
                        {routeData.battery_parameters.is_direct_feasible
                          ? "Direct Range OK"
                          : "Stop Recommended"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                        <div className="text-zinc-500 text-[10px]">Distance</div>
                        <div className="font-mono font-semibold text-zinc-100 text-sm">
                          {routeData.direct_route.distance_km} km
                        </div>
                      </div>
                      <div className="p-2 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                        <div className="text-zinc-500 text-[10px]">Estimated Drive</div>
                        <div className="font-mono font-semibold text-zinc-100 text-sm">
                          {Math.floor(routeData.direct_route.duration_min / 60)}h{" "}
                          {Math.round(routeData.direct_route.duration_min % 60)}m
                        </div>
                      </div>
                    </div>

                    {/* Active Selected Charging Stop Banner */}
                    {routeData.routed_via_station && (
                      <div className="p-2.5 bg-blue-950/40 border border-blue-900/60 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-300 flex items-center gap-1.5 text-[11px]">
                            <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                            Stop: {routeData.routed_via_station.station_name}
                          </span>
                          <button
                            onClick={onClearStationStop}
                            className="text-zinc-400 hover:text-rose-400 p-0.5"
                            title="Remove Charging Stop"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] text-zinc-300 flex items-center gap-2">
                          <span>Total: <strong className="text-zinc-100">{routeData.routed_via_station.total_distance_km} km</strong></span>
                          <span>•</span>
                          <span>Detour: <strong className="text-blue-400">+{routeData.routed_via_station.detour_km} km</strong></span>
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
                <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-800 text-[11px]">
                  <button
                    onClick={() => setStationFilterTier("all")}
                    className={`flex-1 py-1 rounded font-medium transition-colors ${
                      stationFilterTier === "all"
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    All ({candidateStations.length})
                  </button>
                  <button
                    onClick={() => setStationFilterTier("optimal")}
                    className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      stationFilterTier === "optimal"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/80"
                        : "text-emerald-400 hover:bg-emerald-950/30"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Optimal</span>
                  </button>
                  <button
                    onClick={() => setStationFilterTier("acceptable")}
                    className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      stationFilterTier === "acceptable"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-800/80"
                        : "text-amber-400 hover:bg-amber-950/30"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Acceptable</span>
                  </button>
                  <button
                    onClick={() => setStationFilterTier("suboptimal")}
                    className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      stationFilterTier === "suboptimal"
                        ? "bg-rose-950/80 text-rose-300 border border-rose-800/80"
                        : "text-rose-400 hover:bg-rose-950/30"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>Suboptimal</span>
                  </button>
                </div>

                {/* Candidate Station Cards */}
                {filteredCandidates.length > 0 ? (
                  <div className="space-y-2">
                    {filteredCandidates.map((st) => {
                      const isSelectedStop =
                        routeData?.routed_via_station?.station_id === st.id;

                      return (
                        <div
                          key={st.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            isSelectedStop
                              ? "bg-blue-950/20 border-blue-500/80"
                              : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700"
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                                    st.tier === "optimal"
                                      ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                                      : st.tier === "acceptable"
                                      ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                                      : "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                                  }`}
                                >
                                  {st.tier === "optimal" && <CheckCircle2 className="w-3 h-3" />}
                                  {st.tier === "acceptable" && <AlertTriangle className="w-3 h-3" />}
                                  {st.tier === "suboptimal" && <XCircle className="w-3 h-3" />}
                                  {st.tier_label}
                                </span>

                                <span className="text-zinc-500 text-[10px] font-mono">
                                  +{st.detour_km} km detour
                                </span>
                              </div>

                              <h4 className="font-medium text-zinc-100 text-xs line-clamp-1">
                                {st.name}
                              </h4>
                              <p className="text-[10px] text-zinc-400 line-clamp-1">
                                {st.operator_name} • {st.address}
                              </p>
                            </div>

                            <button
                              onClick={() => onFocusCoordinate(st.longitude, st.latitude)}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-300"
                              title="Center on Map"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Detour Reason */}
                          <p className="text-[11px] text-zinc-400 mb-2">
                            {st.tier_reason}
                          </p>

                          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                            <div className="text-[11px]">
                              <span className="text-zinc-500">Arrival SoC: </span>
                              <strong
                                className={`font-mono font-medium ${
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
                                className="px-2.5 py-1 bg-blue-600 text-white font-medium rounded-md flex items-center gap-1 text-[11px] transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>Active Stop</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onSelectStationStop(st)}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md font-medium transition-colors flex items-center gap-1 text-[11px]"
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
                  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-lg text-center text-zinc-400 space-y-1">
                    <p className="font-medium text-zinc-200">No Candidate Stations</p>
                    <p className="text-[11px] text-zinc-500">
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
