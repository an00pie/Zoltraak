"use client";

import React from "react";
import {
  MapPin,
  TrendingUp,
  Bell,
  User,
  Navigation,
  Compass,
} from "lucide-react";

export default function MobileBottomNav({
  activeTab = "map",
  onTabChange,
  unreadNotifications = 1,
}) {
  const tabs = [
    {
      id: "map",
      label: "Map View",
      icon: (isActive) => (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isActive ? "bg-amber-100/90 text-amber-700" : "text-zinc-600"
          }`}
        >
          <MapPin className="w-4 h-4 fill-current stroke-[2.5]" />
        </div>
      ),
    },
    {
      id: "sessions",
      label: "Sessions",
      icon: (isActive) => (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isActive ? "bg-zinc-200 text-zinc-900" : "text-zinc-600"
          }`}
        >
          <TrendingUp className="w-4 h-4 stroke-[2]" />
        </div>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: (isActive) => (
        <div className="relative w-7 h-7 rounded-full flex items-center justify-center text-zinc-600">
          <Bell className="w-4 h-4 stroke-[2]" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </div>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (isActive) => (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isActive ? "bg-zinc-200 text-zinc-900" : "text-zinc-600"
          }`}
        >
          <User className="w-4 h-4 stroke-[2]" />
        </div>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-auto bg-white/95 backdrop-blur-md border-t border-zinc-200/90 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] px-3 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-2xl transition-all min-w-0 flex-1 ${
                isActive
                  ? "bg-zinc-100/90 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.icon(isActive)}
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? "font-bold text-zinc-900" : "font-medium text-zinc-500"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
