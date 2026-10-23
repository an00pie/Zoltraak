"use client";

import React from "react";
import {
  MapPin,
  Car,
  User,
  Sliders,
  Layers,
  Sparkles,
} from "lucide-react";

export default function TopNavHeader({
  currentView = "map",
  onViewChange,
  selectedVehicle,
  onChangeVehicleClick,
  onOpenProfile,
}) {
  return (
    <header className="fixed top-3 inset-x-0 z-40 pointer-events-none flex items-center justify-between px-3 sm:px-6">
      {/* Left: Brand or Vehicle indicator on desktop */}
      <div className="pointer-events-auto hidden md:flex items-center space-x-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-zinc-100 px-3 py-1.5 rounded-full shadow-lg">
        <button
          type="button"
          onClick={onChangeVehicleClick}
          className="flex items-center space-x-2 text-xs font-semibold hover:text-emerald-400 transition-colors"
          title="Change active EV"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Car className="w-3 h-3" />
          </div>
          <span className="max-w-[140px] truncate">
            {selectedVehicle?.name || "Mini Cooper SE"}
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            {selectedVehicle?.capacityKwh || 32.6}kWh
          </span>
        </button>
      </div>

      {/* Center: Top Pill Switch matching Image 4 [ Home NEW | Map View ] */}
      <div className="pointer-events-auto mx-auto bg-white/95 backdrop-blur-md p-1 rounded-full shadow-xl border border-zinc-200/90 flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onViewChange("home")}
          className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
            currentView === "home"
              ? "bg-zinc-900 text-white shadow-xs"
              : "text-zinc-700 hover:text-black hover:bg-zinc-100"
          }`}
        >
          <span>Home</span>
          <span className="px-1.5 py-0.2 bg-rose-500 text-white font-extrabold text-[9px] rounded-full uppercase tracking-wider">
            NEW
          </span>
        </button>

        <button
          type="button"
          onClick={() => onViewChange("map")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
            currentView === "map"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-zinc-700 hover:text-black hover:bg-zinc-100"
          }`}
        >
          <span>Map View</span>
        </button>
      </div>

      {/* Right: Profile Button on desktop */}
      <div className="pointer-events-auto hidden md:flex items-center space-x-2">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center space-x-2 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-md border border-zinc-800 text-zinc-100 px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold transition-all"
        >
          <div className="w-5 h-5 rounded-full bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
            EV
          </div>
          <span>Garage</span>
        </button>
      </div>
    </header>
  );
}
