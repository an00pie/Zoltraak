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
    <div className="absolute top-4 right-4 bottom-4 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-800 flex items-start justify-between gap-3 bg-zinc-900/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                isOperational
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                  : "bg-amber-950/60 text-amber-400 border border-amber-800/60"
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
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                Verified
              </span>
            )}
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 line-clamp-2">
            {station.name}
          </h2>
          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
            <Building className="w-3.5 h-3.5 text-zinc-500" />
            {station.operator_name || "Independent / Unspecified CPO"}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {/* H3 Spatial Indexing Card */}
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              H3 Spatial Cell
            </span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">
              Res {station.h3_resolution || 8}
            </span>
          </div>
          <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800 font-mono text-zinc-200">
            <span>{station.h3_cell}</span>
            <button
              onClick={() => copyToClipboard(station.h3_cell, "h3")}
              className="text-zinc-500 hover:text-zinc-200 transition-colors ml-2"
              title="Copy H3 Cell Index"
            >
              {copiedH3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Location & Coordinates */}
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-zinc-200 font-medium">
                {station.address || "Address not provided"}
              </p>
              <p className="text-zinc-400">
                {[station.city, station.state, station.postcode, station.country_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
              <Compass className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(`${station.latitude}, ${station.longitude}`, "coord")}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
            >
              {copiedCoord ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCoord ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Charging Connectors / Ports */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-zinc-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              Connectors & Power ({station.connectors?.length || 0})
            </h3>
            {station.number_of_points && (
              <span className="text-zinc-500 text-[11px]">
                {station.number_of_points} total bays
              </span>
            )}
          </div>

          {station.connectors && station.connectors.length > 0 ? (
            <div className="grid grid-cols-1 gap-1.5">
              {station.connectors.map((conn, idx) => {
                const isFast = conn.power_kw && conn.power_kw >= 50;
                const isUltraFast = conn.power_kw && conn.power_kw >= 100;

                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-lg flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200 text-xs">
                          {conn.connector_type}
                        </span>
                        {conn.quantity > 1 && (
                          <span className="text-[10px] px-1 py-0.2 bg-zinc-800 text-zinc-400 rounded font-mono">
                            ×{conn.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {conn.current_type || "Current unspecified"}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-xs font-semibold text-zinc-100 font-mono">
                        {conn.power_kw ? `${conn.power_kw} kW` : "N/A"}
                      </span>
                      {conn.power_kw && (
                        <p className="text-[10px] font-normal text-zinc-500">
                          {isUltraFast ? "Ultra-Fast" : isFast ? "Fast" : "Standard"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg text-zinc-500 text-center italic">
              Connector details not listed in record.
            </div>
          )}
        </div>

        {/* Pricing / Usage Info */}
        {station.usage_cost && (
          <div className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-1">
            <span className="text-zinc-500 font-medium text-[11px]">Tariff / Cost</span>
            <p className="text-zinc-200 font-mono text-xs">{station.usage_cost}</p>
          </div>
        )}

        {/* Provenance and Attribution */}
        <div className="p-2.5 bg-zinc-900/30 border border-zinc-800/80 rounded-lg space-y-1 text-zinc-500 text-[11px]">
          <div className="flex items-center justify-between">
            <span>Source Provider</span>
            <span className="text-zinc-300 font-medium capitalize">{station.source}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>OCM ID</span>
            <a
              href={`https://openchargemap.io/site/poi/details/${station.source_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 font-mono"
            >
              #{station.source_id}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          {station.source_last_updated && (
            <div className="flex items-center justify-between">
              <span>Updated</span>
              <span className="text-zinc-300">
                {new Date(station.source_last_updated).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {onRouteViaStation && (
            isSelectedStop ? (
              <button
                type="button"
                onClick={onClearStationStop}
                className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-800 font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                Remove Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRouteViaStation(station)}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                Route Via This Stop
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onFocus(station.longitude, station.latitude)}
            className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs"
            title="Focus camera on this station"
          >
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium rounded-lg transition-colors text-xs border border-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
