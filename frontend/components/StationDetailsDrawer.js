"use client";

import React, { useState, useEffect } from "react";
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
  Home,
  Phone,
  Star,
  MessageSquare,
  AlertCircle,
  CornerDownRight,
  Send,
  User,
} from "lucide-react";

export default function StationDetailsDrawer({
  station,
  onClose,
  onFocus,
  onRouteViaStation,
  onClearStationStop,
  isSelectedStop = false,
  onOpenReportModal,
  onOpenOwnerDashboard,
  currentUser,
  apiBaseUrl = "http://127.0.0.1:8000",
}) {
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [copiedH3, setCopiedH3] = useState(false);
  const [reportsData, setReportsData] = useState(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const isCommunity = Boolean(station?.is_community_host || station?.host_name);
  const isOperational = station?.is_operational !== false && station?.availability_status !== "unavailable";

  const isUserOwner = isCommunity
    ? currentUser?.role === "homeowner" && Number(currentUser?.chargerId) === Number(station?.id)
    : currentUser?.role === "operator" && (
        Number(currentUser?.stationId) === Number(station?.id) ||
        (currentUser?.operatorId != null && Number(currentUser.operatorId) === Number(station?.operator_id))
      );

  // Fetch live crowd-sourced reports & ratings
  useEffect(() => {
    if (!station?.id) return;

    let isMounted = true;
    const fetchReports = async () => {
      setIsLoadingReports(true);
      try {
        const type = isCommunity ? "community" : "public";
        const res = await fetch(`${apiBaseUrl}/api/v1/reports?station_id=${station.id}&station_type=${type}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setReportsData(data);
        }
      } catch (err) {
        console.warn("Could not load crowdsourced reports:", err);
      } finally {
        if (isMounted) setIsLoadingReports(false);
      }
    };

    fetchReports();
    return () => {
      isMounted = false;
    };
  }, [station?.id, isCommunity, apiBaseUrl]);

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

  const title = station.name || station.title || "EV Charging Station";
  const address = station.address || `${station.city || "Kerala"}, India`;
  const rating = reportsData?.average_rating || station.trust_score || 4.9;

  return (
    <div className="fixed inset-0 w-full max-w-none bg-zinc-950 border-0 rounded-none shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 pointer-events-auto sm:absolute sm:inset-y-4 sm:right-4 sm:left-auto sm:w-full sm:max-w-md sm:border sm:rounded-2xl sm:z-30">
      {/* Header */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 border-b border-zinc-800 flex items-start justify-between gap-3 bg-zinc-900/40 sm:p-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Community Blue Badge or Public Green Badge */}
            {isCommunity ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <Home className="w-3 h-3" />
                Homeowner Host (Blue Pin)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" />
                Public Fast Station
              </span>
            )}

            {/* Operational Status */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                isOperational
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                  : "bg-rose-950/60 text-rose-400 border border-rose-800/60"
              }`}
            >
              {isOperational ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {station.availability_status === "in_use"
                ? "Occupied / In Use"
                : station.availability_status === "unavailable" || !isOperational
                ? "Temporarily Unavailable"
                : "Available Now"}
            </span>

            {/* Star Rating */}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          </div>

          <h2 className="text-base font-semibold text-zinc-100 line-clamp-2 leading-tight">
            {title}
          </h2>

          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
            {isCommunity ? (
              <>
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Host: <strong>{station.host_name}</strong> • {station.city}</span>
              </>
            ) : (
              <>
                <Building className="w-3.5 h-3.5 text-zinc-500" />
                <span>{station.operator_name || "Commercial Fast Charger"}</span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Crowdsourced Availability Alert Banner */}
        {reportsData?.is_reported_down ? (
          <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-rose-200">Reported Down by EV Drivers</div>
              <p className="text-[11px] text-rose-300/90 mt-0.5">
                Recent crowd-sourced reports indicate this charger is unavailable or experiencing power issues.
              </p>
            </div>
          </div>
        ) : reportsData?.latest_status === "available" ? (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px]">Community Verified: Operational & available for charging</span>
          </div>
        ) : null}

        {/* Homeowner Specific Info Card */}
        {isCommunity && (
          <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-300 font-semibold">Standard Green Tariff:</span>
              <strong className="text-white font-mono text-sm">₹11.50 / kWh</strong>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-blue-900/30">
              <div>
                <span className="text-zinc-400 block">Queue Status:</span>
                <span className={`font-semibold ${station.queue_count > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {station.queue_count > 0 ? `${station.queue_count} in queue` : "0 waiting (Immediate)"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Output Power:</span>
                <span className="font-semibold text-zinc-100">⚡ {station.power_kw} kW</span>
              </div>
            </div>

            {station.access_hours && (
              <div className="text-[11px] text-zinc-300 pt-1 border-t border-blue-900/30">
                <Clock className="w-3 h-3 inline mr-1 text-zinc-400" />
                <strong>Hours:</strong> {station.access_hours}
              </div>
            )}

            {station.amenities && (
              <div className="text-[11px] text-blue-300">
                ✨ <strong>Amenities:</strong> {station.amenities}
              </div>
            )}

            {station.notes && (
              <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2 rounded-lg italic">
                "{station.notes}"
              </div>
            )}

            {/* Direct Phone / WhatsApp CTA */}
            {station.phone && (
              <div className="pt-2 flex gap-2">
                <a
                  href={`tel:${station.phone}`}
                  className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-center flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Host ({station.phone})</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Location & Coordinates Card */}
        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-zinc-200 text-xs leading-relaxed">{address}</p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px]">
            <span className="text-zinc-500 font-mono">
              {Number(station.latitude).toFixed(5)}, {Number(station.longitude).toFixed(5)}
            </span>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(`${station.latitude},${station.longitude}`, "coord")
              }
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
            >
              {copiedCoord ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Lat/Lng</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Connectors / Charging Equipment */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Available Plugs & Specs
          </h3>

          {isCommunity ? (
            <div className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                  AC
                </div>
                <div>
                  <div className="font-semibold text-zinc-100">{station.connector_type || "Type 2 (AC)"}</div>
                  <div className="text-[11px] text-zinc-400">Dedicated Home Wallbox</div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-zinc-100">
                {station.power_kw} kW
              </div>
            </div>
          ) : station.connectors && station.connectors.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {station.connectors.map((c, i) => (
                <div
                  key={c.id || i}
                  className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {c.power_kw >= 30 ? "DC" : "AC"}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-100">{c.connector_type}</div>
                      <div className="text-[11px] text-zinc-400">
                        {c.quantity || 1} Gun(s) • {c.current_type || "Fast Charging"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-zinc-100">
                    {c.power_kw ? `${c.power_kw} kW` : "N/A"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-800 rounded-lg text-zinc-500 text-center italic">
              Connector details not listed in record.
            </div>
          )}
        </div>

        {/* Crowdsourced Driver Reviews & Ratings Section */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              Driver Reports & Reviews ({reportsData?.total_reports || 0})
            </h3>
            <button
              type="button"
              onClick={() => onOpenReportModal && onOpenReportModal(station)}
              className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              Report / Rate
            </button>
          </div>

          {isLoadingReports ? (
            <div className="py-3 text-center text-zinc-500 text-xs">Loading community reports...</div>
          ) : reportsData?.reports && reportsData.reports.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {reportsData.reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-200">{rep.user_name}</span>
                      <span className="text-[10px] text-zinc-500">
                        ({rep.user_role === "homeowner" ? "Host" : "Driver"})
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{rep.rating}</span>
                    </div>
                  </div>
                  {rep.comment && (
                    <p className="text-zinc-300 text-[11px] leading-snug">{rep.comment}</p>
                  )}
                  <div className="text-[10px] text-zinc-500 flex items-center justify-between pt-1">
                    <span className="capitalize text-emerald-400">Status: {rep.report_status}</span>
                    <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center text-zinc-500 text-xs space-y-1">
              <div>No reviews posted yet.</div>
              <button
                type="button"
                onClick={() => onOpenReportModal && onOpenReportModal(station)}
                className="text-blue-400 hover:underline font-semibold"
              >
                Be the first to rate & report this charger!
              </button>
            </div>
          )}
        </div>

        {/* Owner Management Shortcut if signed in as host/operator */}
        {isUserOwner && (
          <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-1.5">
            <div className="text-xs font-semibold text-amber-300">You manage this station</div>
            <p className="text-[11px] text-zinc-400">
              Update live availability, power rating, and hours in your dashboard.
            </p>
            <button
              type="button"
              onClick={onOpenOwnerDashboard}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Open Management Portal
            </button>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-zinc-800 bg-zinc-950 flex flex-col gap-2 sm:p-3">
        <div className="flex items-center gap-2">
          {onRouteViaStation && (
            isSelectedStop ? (
              <button
                type="button"
                onClick={onClearStationStop}
                className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                Remove Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRouteViaStation(station)}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                Route Via This Stop
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onFocus && onFocus(station.longitude, station.latitude)}
            className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs"
            title="Focus camera on this station"
          >
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            <span>Center</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium rounded-xl transition-colors text-xs border border-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
