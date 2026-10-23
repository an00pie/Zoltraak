"use client";

import React from "react";
import {
  X,
  User,
  Car,
  Battery,
  Zap,
  ShieldCheck,
  RotateCw,
  Home,
  Sliders,
  ChevronRight,
  Sparkles,
  Award,
  Navigation,
} from "lucide-react";
import { VehicleModelThumbnail } from "./VehicleIcons";

export default function ProfileDrawer({
  isOpen,
  onClose,
  selectedVehicle,
  onChangeVehicleClick,
  batterySoC,
  setBatterySoC,
  minReserveSoC,
  setMinReserveSoC,
  onOpenListHomeChargerModal,
  onNavigateHome,
  onNavigateMap,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full bg-white text-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 overflow-y-auto">
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-zinc-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              EV
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight">
                Profile & Garage
              </h2>
              <p className="text-xs text-zinc-500">Kerala EV Explorer</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Active Vehicle Card (My Garage) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Active Vehicle
              </span>
              <button
                type="button"
                onClick={onChangeVehicleClick}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 hover:underline"
              >
                <RotateCw className="w-3 h-3" />
                <span>Change Vehicle</span>
              </button>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-16 h-12 bg-white border border-zinc-200 rounded-xl flex items-center justify-center p-1 shrink-0 shadow-2xs">
                  {selectedVehicle ? (
                    <VehicleModelThumbnail model={selectedVehicle} className="w-14 h-9" />
                  ) : (
                    <Car className="w-6 h-6 text-zinc-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-zinc-900 truncate">
                    {selectedVehicle?.name || "Mini Cooper SE"}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-zinc-500 mt-0.5">
                    <span className="capitalize">{selectedVehicle?.type || "4 Wheels"}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-700 font-semibold">
                      {selectedVehicle?.capacityKwh || 32.6} kWh
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle Specs Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/80 text-center">
                <div className="p-2 bg-white rounded-xl border border-zinc-100">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">
                    Range
                  </div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5">
                    {selectedVehicle?.nominalRangeKm || 230} km
                  </div>
                </div>

                <div className="p-2 bg-white rounded-xl border border-zinc-100">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">
                    Port
                  </div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5 truncate px-1">
                    {selectedVehicle?.connectorType?.split("/")[0] || "CCS2"}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-xl border border-zinc-100">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">
                    Max DC
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5">
                    {selectedVehicle?.maxDcPowerKw || 50} kW
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onChangeVehicleClick}
                className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xs"
              >
                <Car className="w-4 h-4" />
                <span>Switch to another Brand or Model</span>
              </button>
            </div>
          </div>

          {/* Battery State of Charge (SoC) Slider */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700">
              <span className="flex items-center space-x-1.5">
                <Battery className="w-4 h-4 text-emerald-600" />
                <span>Current Battery Level</span>
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono font-bold">
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
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>5% (Critical)</span>
              <span>50%</span>
              <span>100% (Full)</span>
            </div>

            <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-between text-xs font-semibold text-zinc-700">
              <span>Minimum Reserve Buffer</span>
              <span className="font-mono text-zinc-900 font-bold">
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
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-700"
            />
          </div>

          {/* Community Host Program Banner */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
            <div className="flex items-start space-x-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-blue-950">
                  Host an EV Charger at Home
                </h4>
                <p className="text-[11px] text-blue-800 leading-snug mt-0.5">
                  Share your home EV wallbox with Kerala EV travelers. Standard
                  tariff of <strong>₹11.50 / kWh</strong> guaranteed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenListHomeChargerModal) onOpenListHomeChargerModal();
              }}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              + List Your Home Charger
            </button>
          </div>

          {/* Environmental Impact & App Info */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2 text-xs text-zinc-600">
            <div className="flex items-center space-x-2 font-bold text-zinc-800">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Zoltraak EV Green Network</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Real-time corridor optimization, H3 spatial clustering, and
              verified community charger sharing throughout Kerala.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
