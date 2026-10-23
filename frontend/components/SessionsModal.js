"use client";

import React from "react";
import {
  X,
  TrendingUp,
  Zap,
  Clock,
  BatteryCharging,
  CheckCircle2,
  Calendar,
  IndianRupee,
} from "lucide-react";

export default function SessionsModal({ isOpen, onClose, selectedVehicle }) {
  if (!isOpen) return null;

  const pastSessions = [
    {
      id: "ses_1",
      stationName: "Steelane | Kalamassery | EVOK",
      date: "Today, 11:20 AM",
      energyKwh: "24.5 kWh",
      duration: "34 mins",
      cost: "₹ 440",
      status: "Completed",
      type: "DC Fast (60 kW)",
    },
    {
      id: "ses_2",
      stationName: "Kakkanad Community Wallbox",
      date: "Yesterday, 7:15 PM",
      energyKwh: "18.2 kWh",
      duration: "2h 10m",
      cost: "₹ 209.30",
      status: "Completed",
      type: "Community (₹11.50/kWh)",
    },
    {
      id: "ses_3",
      stationName: "Chalakudy Highway Supercharger",
      date: "21 Oct 2026",
      energyKwh: "31.0 kWh",
      duration: "42 mins",
      cost: "₹ 589",
      status: "Completed",
      type: "DC Fast (120 kW)",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white text-zinc-900 rounded-3xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Charging Sessions</h3>
              <p className="text-[11px] text-zinc-500">History & Live Metering</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl">
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Energy</div>
              <div className="text-sm font-extrabold text-zinc-900 mt-0.5">73.7 kWh</div>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl">
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Saved CO₂</div>
              <div className="text-sm font-extrabold text-emerald-600 mt-0.5">58 kg</div>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl">
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Est. Cost</div>
              <div className="text-sm font-extrabold text-zinc-900 mt-0.5">₹ 1,238</div>
            </div>
          </div>

          <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider pt-2">
            Recent Sessions
          </h4>

          <div className="space-y-2.5">
            {pastSessions.map((s) => (
              <div
                key={s.id}
                className="p-3.5 bg-zinc-50/70 border border-zinc-200 rounded-2xl space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-zinc-900 leading-tight">
                      {s.stationName}
                    </h5>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {s.date} • {s.type}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                    {s.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200/60 font-mono">
                  <span className="text-zinc-600 flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{s.energyKwh}</span>
                  </span>
                  <span className="text-zinc-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>{s.duration}</span>
                  </span>
                  <span className="font-bold text-zinc-900">{s.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
