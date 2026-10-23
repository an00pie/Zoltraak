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
}) {
  if (!station) return null;

  const isCommunity = Boolean(station.host_name || station.is_community_host || station.is_community);
  const power = station.max_power_kw || station.power_kw || 50;
  const isFast = power >= 30;

  // Real or simulated photo for station thumbnail
  const stationImage =
    station.photo_url ||
    (isCommunity
      ? "https://images.unsplash.com/photo-1558441719-8b449c6ff673?auto=format&fit=crop&w=400&q=80"
      : "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=400&q=80");

  const distanceText = station.distance_km
    ? `${station.distance_km.toFixed(1)}km away`
    : station.corridor_detour_km
    ? `+${station.corridor_detour_km.toFixed(1)}km detour`
    : "Kerala, India";

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-3.5 shadow-2xl border border-zinc-200 text-zinc-900 pointer-events-auto transition-all animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-start space-x-3">
        {/* Station Image Thumbnail */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 border border-zinc-200">
          <img
            src={stationImage}
            alt={station.name || station.title}
            className="w-full h-full object-cover"
          />
          {isCommunity ? (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-md shadow">
              🏠 Home Host
            </div>
          ) : (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-md shadow">
              ⚡ Fast
            </div>
          )}
        </div>

        {/* Content details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-24 sm:h-28">
          <div>
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
            <h3 className="font-bold text-sm text-zinc-900 truncate leading-tight mt-0.5">
              {station.name || station.title}
            </h3>

            {/* Address / Host */}
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {isCommunity
                ? `Host: ${station.host_name} • ₹11.50/kWh`
                : station.address || `${station.city || "Kerala"}, India`}
            </p>
          </div>

          {/* Badges row */}
          <div className="flex items-center space-x-2 text-[11px] font-semibold">
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

            <span className="text-emerald-700 font-medium text-[11px] truncate">
              {isCommunity ? "Immediate Access" : `${station.available_connectors || 2} Plugs`}
            </span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onGetDirection && onGetDirection(station)}
              className="py-1.5 px-2 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Get Direction</span>
            </button>

            <button
              type="button"
              onClick={() => onChargeNow && onChargeNow(station)}
              className="py-1.5 px-2 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Details & Rate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
