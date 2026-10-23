"use client";

import React from "react";
import { X, Bell, Zap, Home, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function NotificationsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const notifications = [
    {
      id: "notif_1",
      title: "New Community Charger in Chalakudy",
      description:
        "7.4 kW Type 2 residential wallbox listed by Manoj V. Available at ₹11.50/kWh.",
      time: "15 mins ago",
      type: "community",
    },
    {
      id: "notif_2",
      title: "Fast Charger Corridor Alert: NH 544",
      description:
        "Steelane Kalamassery now operating 2 CCS2 guns with zero queue waiting time.",
      time: "2 hours ago",
      type: "corridor",
    },
    {
      id: "notif_3",
      title: "Vehicle Optimization Profile Active",
      description:
        "Mini Cooper SE energy profile loaded. Battery buffer set to 15% reserve.",
      time: "1 day ago",
      type: "system",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white text-zinc-900 rounded-3xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Notifications</h3>
              <p className="text-[11px] text-zinc-500">Corridor & Community Updates</p>
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

        {/* List */}
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900">{n.title}</span>
                <span className="text-[10px] text-zinc-400 font-mono">{n.time}</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">{n.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
