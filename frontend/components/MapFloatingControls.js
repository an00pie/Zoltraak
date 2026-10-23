"use client";

import React, { useState } from "react";
import {
  Navigation,
  Crosshair,
  CircleDot,
  Layers,
  Home,
  Map as MapIcon,
  ChevronRight,
  Sliders,
  Check,
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
  showCommunityChargers,
  onToggleCommunity,
  totalCommunityChargers = 0,
  currentStyle = "dark",
  onChangeStyle,
}) {
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const styles = [
    { id: "dark", label: "Dark" },
    { id: "osm", label: "OSM Street" },
    { id: "light", label: "Light" },
  ];

  return (
    <div className="absolute right-4 top-24 z-30 flex flex-col items-end space-y-2.5 pointer-events-auto">
      {/* 1. Route A -> B Button (Highlighted) */}
      <button
        type="button"
        onClick={onOpenRoutePlanner}
        className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl shadow-xl font-bold text-xs transition-all active:scale-95 border ${
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
        className="w-11 h-11 bg-white hover:bg-zinc-50 active:scale-95 text-zinc-800 rounded-full shadow-xl border border-zinc-200 flex items-center justify-center transition-all"
        title="Find My Current GPS Location"
      >
        <Crosshair className={`w-5 h-5 text-amber-600 ${isLocating ? "animate-spin" : ""}`} />
      </button>

      {/* 3. Clustering Toggle Button */}
      <button
        type="button"
        onClick={onToggleClustering}
        className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl shadow-lg text-xs font-semibold transition-all border ${
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

      {/* 4. H3 Hexagon Grid Toggle Button */}
      <button
        type="button"
        onClick={onToggleH3}
        className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl shadow-lg text-xs font-semibold transition-all border ${
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

      {/* 5. Community Hosts Toggle Button */}
      <button
        type="button"
        onClick={onToggleCommunity}
        className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl shadow-lg text-xs font-semibold transition-all border ${
          showCommunityChargers
            ? "bg-violet-900 text-white border-violet-700"
            : "bg-white text-zinc-600 border-zinc-200 hover:text-black"
        }`}
        title="Toggle Community Home EV Chargers"
      >
        <Home className="w-3.5 h-3.5 text-violet-300" />
        <span>Community:</span>
        <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${showCommunityChargers ? "bg-violet-950 text-violet-200" : "bg-zinc-100 text-zinc-500"}`}>
          {showCommunityChargers ? `${totalCommunityChargers}` : "OFF"}
        </span>
      </button>

      {/* 6. Map Style Switcher Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-zinc-50 text-zinc-800 rounded-xl shadow-lg text-xs font-semibold border border-zinc-200 transition-all"
          title="Switch Map Base Style"
        >
          <MapIcon className="w-3.5 h-3.5 text-zinc-500" />
          <span className="capitalize">{currentStyle}</span>
        </button>

        {showStyleMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-28 bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden text-xs py-1 z-40">
            {styles.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChangeStyle(s.id);
                  setShowStyleMenu(false);
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-100 ${
                  currentStyle === s.id ? "font-bold text-emerald-700 bg-emerald-50" : "text-zinc-700"
                }`}
              >
                <span>{s.label}</span>
                {currentStyle === s.id && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
