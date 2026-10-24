"use client";

import React, { useState } from "react";
import {
  Navigation,
  Crosshair,
  CircleDot,
  Layers,
  Home,
  Map as MapIcon,
  Check,
  Building,
  User,
  Settings,
  Zap,
} from "lucide-react";

export default function MapFloatingControls({
  onOpenRoutePlanner,
  hasActiveRoute = false,
  onLocateMe,
  isLocating = false,
  clusteringEnabled,
  onToggleClustering,
  showH3Overlay,
  onToggleH3,
  stationFilterMode = "all", // 'all' | 'community_only' | 'public_only'
  onChangeStationFilterMode,
  totalCommunityChargers = 0,
  currentStyle = "dark",
  onChangeStyle,
  currentUser,
  onOpenAuthModal,
  onOpenOwnerDashboard,
}) {
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const styles = [
    { id: "dark", label: "Dark Matter", detail: "High contrast" },
    { id: "osm", label: "OpenStreetMap", detail: "Street details" },
    { id: "light", label: "OSM Positron", detail: "Light and minimal" },
  ];

  const filterModes = [
    { id: "all", label: "All Chargers (⚡+🏠)", color: "text-zinc-100" },
    { id: "community_only", label: "Home Hosts Only (Blue 🏠)", color: "text-blue-400" },
    { id: "public_only", label: "Public Fast Only (Green ⚡)", color: "text-emerald-400" },
  ];

  const isOwner = currentUser?.role === "homeowner" || currentUser?.role === "operator";

  return (
    <div className="map-floating-controls absolute right-3 sm:right-4 top-24 z-30 flex flex-col items-end space-y-2 pointer-events-auto">
      {/* 1. Route A -> B Button (Highlighted) */}
      <button
        type="button"
        onClick={onOpenRoutePlanner}
        className={`hidden sm:flex items-center space-x-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl shadow-xl font-bold text-xs transition-all active:scale-95 border ${
          hasActiveRoute
            ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-400"
            : "bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200"
        }`}
        title="Plan Highway Route A to B"
      >
        <Navigation className="w-4 h-4 text-blue-500 fill-current shrink-0" />
        <span>{hasActiveRoute ? "Corridor Active (A→B)" : "Plan Route (A→B)"}</span>
      </button>

      {/* 2. Locate Me Crosshair Button (Browser Geolocation Prompt) */}
      <button
        type="button"
        onClick={onLocateMe}
        disabled={isLocating}
        className="w-10 h-10 sm:w-11 sm:h-11 bg-white hover:bg-zinc-50 active:scale-95 text-zinc-800 rounded-full shadow-xl border border-zinc-200 flex items-center justify-center transition-all"
        title="Find My Current GPS Location"
      >
        <Crosshair className={`w-5 h-5 text-amber-600 ${isLocating ? "animate-spin" : ""}`} />
      </button>

      <button
        type="button"
        onClick={onOpenRoutePlanner}
        aria-label={hasActiveRoute ? "Edit route" : "Plan a route"}
        className="flex sm:hidden w-10 h-10 bg-zinc-950 text-white active:scale-95 rounded-full shadow-xl border border-zinc-800 items-center justify-center transition-all"
        title={hasActiveRoute ? "Edit route" : "Plan a route"}
      >
        <Navigation className="w-5 h-5" />
      </button>

      {/* 3. Station Filter: All vs Home Hosts (Blue) vs Public Fast (Green) */}
      <div className="relative hidden sm:block">
        <button
          type="button"
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl shadow-lg text-xs font-semibold transition-all border ${
            stationFilterMode === "community_only"
              ? "bg-blue-600 text-white border-blue-400"
              : stationFilterMode === "public_only"
              ? "bg-emerald-700 text-white border-emerald-500"
              : "bg-zinc-900 text-zinc-200 border-zinc-700"
          }`}
          title="Filter Station Types"
        >
          {stationFilterMode === "community_only" ? (
            <Home className="w-3.5 h-3.5 text-white" />
          ) : stationFilterMode === "public_only" ? (
            <Zap className="w-3.5 h-3.5 text-white" />
          ) : (
            <span className="text-xs">⚡+🏠</span>
          )}
          <span>
            {stationFilterMode === "community_only"
              ? "Home Only (Blue)"
              : stationFilterMode === "public_only"
              ? "Public Only"
              : "All Stations"}
          </span>
        </button>

        {showFilterMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-zinc-950 rounded-xl shadow-2xl border border-zinc-800 overflow-hidden text-xs py-1 z-40">
            {filterModes.map((fm) => (
              <button
                key={fm.id}
                type="button"
                onClick={() => {
                  if (onChangeStationFilterMode) {
                    onChangeStationFilterMode(fm.id);
                  }
                  setShowFilterMenu(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-zinc-900 ${
                  stationFilterMode === fm.id ? "font-bold bg-zinc-900/80" : ""
                } ${fm.color}`}
              >
                <span>{fm.label}</span>
                {stationFilterMode === fm.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Owner Portal / Setup Details Button */}
      <button
        type="button"
        onClick={onOpenOwnerDashboard}
        className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl shadow-lg text-xs font-semibold transition-all border bg-zinc-900 text-zinc-200 border-zinc-700 hover:border-blue-500"
        title="Manage your EV Charging Station / Home Charger Setup"
      >
        {isOwner ? (
          currentUser?.role === "homeowner" ? (
            <Home className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Building className="w-3.5 h-3.5 text-amber-400" />
          )
        ) : (
          <Settings className="w-3.5 h-3.5 text-zinc-400" />
        )}
        <span>{isOwner ? "Manage Station" : "Host Setup"}</span>
      </button>

      {/* 5. User Role / Sign In Switcher */}
      <button
        type="button"
        onClick={onOpenAuthModal}
        className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl shadow-lg text-xs font-semibold transition-all border bg-zinc-950/90 text-zinc-300 border-zinc-800 hover:bg-zinc-900"
        title="Switch Account Role (Customer / Home Host / Station Operator)"
      >
        <User className="w-3.5 h-3.5 text-blue-400" />
        <span className="truncate max-w-[110px]">{currentUser?.name?.split(" ")[0] || "Sign In"}</span>
        <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
          {currentUser?.role === "homeowner" ? "Host" : currentUser?.role === "operator" ? "Operator" : "Driver"}
        </span>
      </button>

      {/* 6. Clustering Toggle Button */}
      <button
        type="button"
        onClick={onToggleClustering}
        className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl shadow-lg text-xs font-semibold transition-all border ${
          clusteringEnabled
            ? "bg-zinc-900 text-white border-zinc-700"
            : "bg-white text-zinc-600 border-zinc-200 hover:text-black"
        }`}
        title="Toggle Marker Clustering"
      >
        <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
        <span>Cluster:</span>
        <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${clusteringEnabled ? "bg-zinc-800 text-emerald-400" : "bg-zinc-100 text-zinc-500"}`}>
          {clusteringEnabled ? "ON" : "OFF"}
        </span>
      </button>

      {/* 7. H3 Hexagon Grid Toggle Button */}
      <button
        type="button"
        onClick={onToggleH3}
        className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl shadow-lg text-xs font-semibold transition-all border ${
          showH3Overlay
            ? "bg-zinc-900 text-white border-zinc-700"
            : "bg-white text-zinc-600 border-zinc-200 hover:text-black"
        }`}
        title="Toggle Uber H3 Hexagon Grid"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span>H3 Grid:</span>
        <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${showH3Overlay ? "bg-zinc-800 text-cyan-400" : "bg-zinc-100 text-zinc-500"}`}>
          {showH3Overlay ? "ON" : "OFF"}
        </span>
      </button>

      {/* 8. Map Style Switcher Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          aria-label="Choose map appearance"
          aria-expanded={showStyleMenu}
          className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center sm:justify-start space-x-1.5 px-2.5 py-1.5 bg-white/95 hover:bg-white text-zinc-800 rounded-full sm:rounded-xl shadow-lg text-xs font-semibold border border-zinc-200 transition-all backdrop-blur-md"
          title="Choose map appearance"
        >
          <MapIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-600" />
          <span className="hidden sm:inline">Map</span>
        </button>

        {showStyleMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-2xl backdrop-blur-xl z-40">
            <div className="px-2 pb-2">
              <p className="text-xs font-bold text-zinc-900">Map appearance</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">Choose how the map is displayed</p>
            </div>
            <div className="space-y-1">
              {styles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={currentStyle === style.id}
                  onClick={() => {
                    onChangeStyle(style.id);
                    setShowStyleMenu(false);
                  }}
                  className={`w-full min-h-12 rounded-xl px-2.5 text-left flex items-center gap-2.5 transition-colors ${
                    currentStyle === style.id
                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <span className={`w-9 h-9 rounded-lg border border-black/10 shrink-0 ${
                    style.id === "dark"
                      ? "bg-[linear-gradient(135deg,#27272a_0_35%,#52525b_35%_42%,#18181b_42%_68%,#3f3f46_68%)]"
                      : style.id === "osm"
                      ? "bg-[linear-gradient(135deg,#e7e5e4_0_32%,#fff_32%_43%,#86efac_43%_52%,#f5f5f4_52%_100%)]"
                      : "bg-[linear-gradient(135deg,#f4f4f5_0_35%,#fff_35%_46%,#d4d4d8_46%_51%,#fafafa_51%)]"
                  }`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{style.label}</span>
                    <span className="block text-[10px] text-zinc-500">{style.detail}</span>
                  </span>
                  {currentStyle === style.id && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
