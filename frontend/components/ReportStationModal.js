"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Wrench,
  Star,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";

const STATUS_OPTIONS = [
  {
    id: "available",
    label: "Working & Available",
    subtext: "Charger is operational and ready to plug in",
    icon: CheckCircle2,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/40",
    badgeColor: "bg-emerald-500",
  },
  {
    id: "busy",
    label: "Occupied / In Queue",
    subtext: "Vehicles currently charging or in line",
    icon: Clock,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/40",
    badgeColor: "bg-amber-500",
  },
  {
    id: "unavailable",
    label: "Charger Unavailable / Down",
    subtext: "Power failure, offline, or screen error",
    icon: Ban,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/40",
    badgeColor: "bg-rose-500",
  },
  {
    id: "broken_connector",
    label: "Damaged Cable / Connector",
    subtext: "Latch broken, gun damaged, or won't lock",
    icon: Wrench,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/40",
    badgeColor: "bg-orange-500",
  },
  {
    id: "ice_blocked",
    label: "Blocked by ICE Vehicle",
    subtext: "Non-EV parked in charging bay",
    icon: AlertTriangle,
    color: "text-red-400 bg-red-500/10 border-red-500/40",
    badgeColor: "bg-red-500",
  },
];

export default function ReportStationModal({
  isOpen,
  onClose,
  station,
  currentUser,
  onReportSuccess,
  apiBaseUrl = "http://127.0.0.1:8000",
}) {
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen || !station) return null;

  const stationType = station.is_community_host || station.host_name ? "community" : "public";
  const stationTitle = station.name || station.title || "EV Charging Station";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const payload = {
        station_type: stationType,
        station_id: station.id,
        user_name: currentUser?.name || "EV Driver",
        user_role: currentUser?.role || "customer",
        report_status: selectedStatus,
        rating: rating,
        comment: comment.trim() || undefined,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to submit report");
      }

      const data = await res.json();
      setSuccessMsg("Report submitted! Thank you for helping the EV community.");

      setTimeout(() => {
        if (onReportSuccess) {
          onReportSuccess(data);
        }
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Live Driver Report
              </span>
              <span className="text-xs text-zinc-500">•</span>
              <span className="text-xs text-zinc-400 capitalize">{stationType} Charger</span>
            </div>
            <h2 className="text-base font-semibold text-zinc-100 mt-1 truncate max-w-md">
              {stationTitle}
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {station.address || station.city || "Kerala, India"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Status Selection */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-2">
              What is the current status of this charger?
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedStatus === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedStatus(opt.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                      isSelected
                        ? opt.color
                        : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-100">{opt.label}</div>
                      <div className="text-[11px] text-zinc-500">{opt.subtext}</div>
                    </div>
                    {isSelected && (
                      <span className={`w-2 h-2 rounded-full ${opt.badgeColor} shrink-0`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">
              Rate your charging experience (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-700"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs text-zinc-400 font-medium">
                {rating === 5
                  ? "5.0 - Excellent"
                  : rating === 4
                  ? "4.0 - Good"
                  : rating === 3
                  ? "3.0 - Average"
                  : rating === 2
                  ? "2.0 - Poor"
                  : "1.0 - Broken / Unusable"}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Feedback / Details (Optional)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Delivered 29 kW, payment app worked immediately, convenient shade parking..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <span className="text-[11px] text-zinc-500">
              Posting as: <strong className="text-zinc-300">{currentUser?.name || "EV Driver"}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
