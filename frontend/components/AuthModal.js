"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Home,
  Zap,
  ShieldCheck,
  Check,
  ArrowRight,
  LogOut,
  Building,
} from "lucide-react";

export const PRESET_PROFILES = [
  {
    id: "customer_1",
    role: "customer",
    name: "Rahul S.",
    title: "EV Driver / Customer",
    subtitle: "Tata Nexon EV Max owner",
    phone: "+91 98471 23456",
    badge: "Driver",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    avatarIcon: User,
    description: "Plan routes, charge at public or home stations, submit live status reports, and rate chargers.",
  },
  {
    id: "homeowner_1",
    role: "homeowner",
    name: "Mathew Kurian",
    title: "Home Charger Host",
    subtitle: "NH-544 Bypass Road, Chalakudy (7.4 kW)",
    phone: "+91 94471 98765",
    badge: "Home Host",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    avatarIcon: Home,
    description: "Manage your home EV wallbox, toggle live availability (Available/In-Use), set queue, and view earnings.",
    chargerId: 1, // matches seeded Chalakudy charger
  },
  {
    id: "operator_1",
    role: "operator",
    name: "Tata Power / KSEB Regional",
    title: "Station Operator / Business",
    subtitle: "Commercial Fast Charging Network",
    phone: "+91 98460 11223",
    badge: "Station Operator",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    avatarIcon: Building,
    description: "Manage commercial fast charging stations, update operational status, set port counts and maintenance alerts.",
    stationId: 1,
  },
];

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) {
  const [customName, setCustomName] = useState("");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [customPhone, setCustomPhone] = useState("");

  if (!isOpen) return null;

  const handleCustomLogin = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const userObj = {
      id: `custom_${Date.now()}`,
      role: selectedRole,
      name: customName.trim(),
      title:
        selectedRole === "homeowner"
          ? "Home Charger Host"
          : selectedRole === "operator"
          ? "Station Operator"
          : "EV Driver / Customer",
      phone: customPhone.trim() || "+91 90000 00000",
      badge:
        selectedRole === "homeowner"
          ? "Home Host"
          : selectedRole === "operator"
          ? "Station Operator"
          : "Driver",
      badgeColor:
        selectedRole === "homeowner"
          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
          : selectedRole === "operator"
          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };

    onSelectUser(userObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">User Sign In & Role Switcher</h2>
              <p className="text-xs text-zinc-400">Sign in as an EV Customer, Homeowner Host, or Station Operator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Role Personas */}
        <div className="mt-5 space-y-3">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Quick Sign In / Switch Demo Account
          </div>

          <div className="space-y-2.5">
            {PRESET_PROFILES.map((profile) => {
              const isCurrent = currentUser?.id === profile.id || currentUser?.role === profile.role;
              const Icon = profile.avatarIcon;

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    onSelectUser(profile);
                    onClose();
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isCurrent
                      ? "bg-zinc-900 border-blue-500/50 shadow-sm"
                      : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      profile.role === "homeowner"
                        ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                        : profile.role === "operator"
                        ? "bg-amber-600/20 border-amber-500/40 text-amber-400"
                        : "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">{profile.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${profile.badgeColor}`}
                      >
                        {profile.badge}
                      </span>
                      {isCurrent && (
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                          <Check className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 truncate mt-0.5">{profile.subtitle}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 leading-snug">{profile.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Login Form */}
        <form onSubmit={handleCustomLogin} className="mt-5 pt-4 border-t border-zinc-800/80">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2.5">
            Or Sign In with Custom Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Your Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Arun Nair"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Account Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                <option value="customer">EV Driver (Customer)</option>
                <option value="homeowner">Home Charger Host (Blue Pin)</option>
                <option value="operator">Station Operator (Commercial)</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">Session saved locally</span>
            <button
              type="submit"
              disabled={!customName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
