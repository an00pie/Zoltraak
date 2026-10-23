"use client";

import React from "react";
import {
  Car,
  User,
  Home,
  Building,
  Settings,
} from "lucide-react";

export default function TopNavHeader({
  currentView = "map",
  onViewChange,
  selectedVehicle,
  onChangeVehicleClick,
  onOpenProfile,
  currentUser,
  onOpenAuthModal,
  onOpenOwnerDashboard,
}) {
  const isOwner = currentUser?.role === "homeowner" || currentUser?.role === "operator";

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

      {/* Right: Role Account & Garage Buttons on desktop */}
      <div className="pointer-events-auto hidden md:flex items-center space-x-2">
        {/* Role Account Switcher Button */}
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex items-center space-x-1.5 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-md border border-zinc-800 text-zinc-100 px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold transition-all"
          title="Switch role between Customer, Home Host, or Station Operator"
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
              currentUser?.role === "homeowner"
                ? "bg-blue-600/30 text-blue-400"
                : currentUser?.role === "operator"
                ? "bg-amber-600/30 text-amber-400"
                : "bg-emerald-600/30 text-emerald-400"
            }`}
          >
            {currentUser?.role === "homeowner" ? (
              <Home className="w-3 h-3" />
            ) : currentUser?.role === "operator" ? (
              <Building className="w-3 h-3" />
            ) : (
              <User className="w-3 h-3" />
            )}
          </div>
          <span className="max-w-[110px] truncate">{currentUser?.name || "Sign In"}</span>
          <span className="text-[10px] font-mono text-zinc-400 uppercase">
            ({currentUser?.role === "homeowner" ? "Host" : currentUser?.role === "operator" ? "Operator" : "Driver"})
          </span>
        </button>

        {/* Owner Management Shortcut */}
        {isOwner && (
          <button
            type="button"
            onClick={onOpenOwnerDashboard}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold transition-all"
            title="Open Owner Management Portal"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage</span>
          </button>
        )}

        {/* Garage Profile Button */}
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
