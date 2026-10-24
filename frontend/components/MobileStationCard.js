"use client";

import React from "react";
import {
  MapPin,
  Navigation,
  Zap,
  CornerDownRight,
  Home,
  Star,
  Send,
  X,
} from "lucide-react";

export default function MobileStationCard({
  station,
  onGetDirection,
  onChargeNow,
  onOpenReportModal,
  userLocation = null,
  onClose,
  hasActiveRoute = false,
}) {
  if (!station) return null;

  const isCommunity = Boolean(station.host_name || station.is_community_host || station.is_community);
  const power = station.max_power_kw || station.power_kw || 50;
  const isFast = power >= 30;

  // Real or simulated photo for station thumbnail
  const stationImage = station.photo_url;

  const distanceText = station.distance_km
    ? `${station.distance_km.toFixed(1)}km away`
    : station.corridor_detour_km
    ? `+${station.corridor_detour_km.toFixed(1)}km detour`
    : "Kerala, India";

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-3 shadow-2xl border border-zinc-200 text-zinc-900 pointer-events-auto transition-all animate-in slide-in-from-bottom-4 duration-200 sm:p-3.5">
      <div className="flex items-stretch gap-2.5">
        {/* Station Image Thumbnail */}
        <div className="relative w-20 h-28 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 border border-zinc-200">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-emerald-50 to-zinc-200 text-emerald-700">
            <Zap className="h-7 w-7 fill-current" />
            <span className="text-[9px] font-bold">EV charger</span>
          </div>
          {stationImage && (
            <img
              src={stationImage}
              alt=""
              onError={(event) => { event.currentTarget.style.display = "none"; }}
              className="relative h-full w-full object-cover"
            />
          )}
          {isCommunity ? (
              <div className="absolute top-1 left-1 whitespace-nowrap px-1 py-0.5 bg-blue-600 text-white text-[8px] font-bold rounded-md shadow">
              🏠 Home Host
            </div>
          ) : (
              <div className="absolute top-1 left-1 whitespace-nowrap px-1 py-0.5 bg-emerald-600 text-white text-[8px] font-bold rounded-md shadow">
              ⚡ Fast
            </div>
          )}
        </div>

        {/* Content details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              {/* Distance badge */}
              <div className="flex items-center space-x-1 text-[11px] font-semibold text-sky-600">
                <MapPin className="w-3 h-3 fill-sky-600 text-sky-600 shrink-0" />
                <span>{distanceText}</span>
              </div>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 -mr-1 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Title */}
            <h3 className="font-bold text-sm text-zinc-900 line-clamp-2 leading-tight mt-0.5">
              {station.name || station.title}
            </h3>

            {/* Address / Host */}
            <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
              {isCommunity
                ? `Host: ${station.host_name} • ₹11.50/kWh`
                : station.address || `${station.city || "Kerala"}, India`}
            </p>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            <span
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md ${
                isCommunity
                  ? "bg-blue-100 text-blue-800"
                  : isFast
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-zinc-100 text-zinc-800"
              }`}
            >
              <Zap className="w-3 h-3 fill-current" />
                <span>{isCommunity ? `${station.power_kw || 7.4} kW AC` : isFast ? "Fast Charging" : "Standard AC"}</span>
            </span>

            <span className="text-emerald-700 font-medium text-[10px] truncate">
              {isCommunity ? "Immediate Access" : `${station.available_connectors || 2} Plugs`}
            </span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onGetDirection && onGetDirection(station)}
              className="min-w-0 py-2 px-1.5 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>{hasActiveRoute ? "Route via" : "Plan route"}</span>
            </button>

            <button
              type="button"
              onClick={() => onChargeNow && onChargeNow(station)}
              className="min-w-0 py-2 px-1.5 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
