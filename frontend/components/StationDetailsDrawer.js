"use client";

import React, { useState } from "react";
import {
  X,
  Zap,
  MapPin,
  Compass,
  Layers,
  Copy,
  Check,
  Building,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";

export default function StationDetailsDrawer({
  station,
  onClose,
  onFocus,
  onRouteViaStation,
  onClearStationStop,
  isSelectedStop = false,
}) {
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [copiedH3, setCopiedH3] = useState(false);

  if (!station) return null;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "coord") {
      setCopiedCoord(true);
      setTimeout(() => setCopiedCoord(false), 2000);
    } else {
      setCopiedH3(true);
      setTimeout(() => setCopiedH3(false), 2000);
    }
  };

  const isOperational = station.is_operational !== false;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-full max-w-md bg-dark-800/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/70 flex items-start justify-between gap-3 bg-dark-900/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                isOperational
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              {isOperational ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {station.status_type || (isOperational ? "Operational" : "Unavailable")}
            </span>

            {station.has_verified_entrance && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Entrance
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-gray-100 line-clamp-2">
            {station.name}
          </h2>
          <p className="text-xs text-brand-400 flex items-center gap-1 mt-0.5">
            <Building className="w-3.5 h-3.5" />
            {station.operator_name || "Independent / Unspecified CPO"}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* H3 Spatial Indexing Card */}
        <div className="p-3 bg-dark-900/80 border border-brand-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5 font-medium">
              <Layers className="w-4 h-4 text-brand-400" />
              Uber H3 Spatial Cell ID
            </span>
            <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono text-[10px]">
              Res {station.h3_resolution || 8}
            </span>
          </div>
          <div className="flex items-center justify-between bg-dark-800 px-2.5 py-1.5 rounded-lg border border-gray-700/60 font-mono text-gray-200">
            <span>{station.h3_cell}</span>
            <button
              onClick={() => copyToClipboard(station.h3_cell, "h3")}
              className="text-gray-400 hover:text-brand-400 transition-colors ml-2"
              title="Copy H3 Cell Index"
            >
              {copiedH3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Location & Coordinates */}
        <div className="p-3 bg-dark-900/60 border border-gray-700/60 rounded-xl space-y-2.5">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-gray-200 font-medium">
                {station.address || "Address not provided"}
              </p>
              <p className="text-gray-400">
                {[station.city, station.state, station.postcode, station.country_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-gray-300">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(`${station.latitude}, ${station.longitude}`, "coord")}
              className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300"
            >
              {copiedCoord ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCoord ? "Copied" : "Copy Coords"}</span>
            </button>
          </div>
        </div>

        {/* Charging Connectors / Ports */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-brand-400" />
              Charging Connectors & Power ({station.connectors?.length || 0})
            </h3>
            {station.number_of_points && (
              <span className="text-gray-400 text-[11px]">
                {station.number_of_points} total bays
              </span>
            )}
          </div>

          {station.connectors && station.connectors.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {station.connectors.map((conn, idx) => {
                const isFast = conn.power_kw && conn.power_kw >= 50;
                const isUltraFast = conn.power_kw && conn.power_kw >= 100;

                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-dark-900/60 border border-gray-700/50 rounded-lg flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-200 text-xs">
                          {conn.connector_type}
                        </span>
                        {conn.quantity > 1 && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-gray-800 text-gray-300 rounded font-mono">
                            ×{conn.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {conn.current_type || "Current unspecified"}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-sm font-extrabold text-brand-400 font-mono">
                        {conn.power_kw ? `${conn.power_kw} kW` : "Power N/A"}
                      </span>
                      {conn.power_kw && (
                        <p className="text-[10px] font-medium text-gray-400">
                          {isUltraFast ? "⚡⚡ Ultra-Fast" : isFast ? "⚡ Fast" : "Standard"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-dark-900/40 rounded-lg text-gray-400 text-center italic">
              Connector details not listed in source record.
            </div>
          )}
        </div>

        {/* Pricing / Usage Info */}
        {station.usage_cost && (
          <div className="p-3 bg-dark-900/60 border border-gray-700/60 rounded-xl space-y-1">
            <span className="text-gray-400 font-medium">Reported Tariff / Cost</span>
            <p className="text-gray-200 font-mono text-xs">{station.usage_cost}</p>
          </div>
        )}

        {/* Provenance and Attribution */}
        <div className="p-3 bg-dark-900/40 border border-gray-800 rounded-xl space-y-1.5 text-gray-400 text-[11px]">
          <div className="flex items-center justify-between">
            <span>Source Provider</span>
            <span className="text-gray-300 font-medium capitalize">{station.source}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Source OCM ID</span>
            <a
              href={`https://openchargemap.io/site/poi/details/${station.source_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:underline flex items-center gap-1 font-mono"
            >
              #{station.source_id}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          {station.source_last_updated && (
            <div className="flex items-center justify-between">
              <span>Source Updated</span>
              <span className="text-gray-300">
                {new Date(station.source_last_updated).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-gray-700/70 bg-dark-900 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {onRouteViaStation && (
            isSelectedStop ? (
              <button
                type="button"
                onClick={onClearStationStop}
                className="flex-1 py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs shadow-md"
              >
                <X className="w-3.5 h-3.5" />
                Remove Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRouteViaStation(station)}
                className="flex-1 py-2 px-3 bg-brand-500 hover:bg-brand-600 text-dark-900 font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs shadow-md shadow-brand-500/20"
              >
                <Zap className="w-3.5 h-3.5 fill-dark-900" />
                Route Via This Stop
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onFocus(station.longitude, station.latitude)}
            className="py-2 px-3 bg-dark-800 hover:bg-dark-700 border border-gray-700 text-gray-200 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs"
            title="Focus camera on this station"
          >
            <Compass className="w-3.5 h-3.5 text-brand-400" />
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
