"use client";

import React, { useState } from "react";
import {
  X,
  Navigation,
  MapPin,
  ArrowUpDown,
  Zap,
  Battery,
  Car,
  RotateCw,
  LocateFixed,
  Check,
  AlertCircle,
} from "lucide-react";

export const KERALA_PRESET_CITIES = [
  { name: "Kochi (Ernakulam)", latitude: 9.9312, longitude: 76.2673 },
  { name: "Thrissur", latitude: 10.5276, longitude: 76.2144 },
  { name: "Chalakudy", latitude: 10.3065, longitude: 76.3385 },
  { name: "Kozhikode (Calicut)", latitude: 11.2588, longitude: 75.7804 },
  { name: "Thiruvananthapuram", latitude: 8.5241, longitude: 76.9366 },
  { name: "Palakkad", latitude: 10.7867, longitude: 76.6548 },
  { name: "Alappuzha (Alleppey)", latitude: 9.4981, longitude: 76.3388 },
  { name: "Kottayam", latitude: 9.5916, longitude: 76.5222 },
  { name: "Kannur", latitude: 11.8745, longitude: 75.3704 },
  { name: "Kollam", latitude: 8.8932, longitude: 76.6141 },
  { name: "Malappuram", latitude: 11.0735, longitude: 76.0740 },
  { name: "Thodupuzha (Idukki)", latitude: 9.8959, longitude: 76.7184 },
  { name: "Kalpetta (Wayanad)", latitude: 11.6103, longitude: 76.0827 },
  { name: "Kasaragod", latitude: 12.5102, longitude: 74.9852 },
  { name: "Pathanamthitta", latitude: 9.2648, longitude: 76.7870 },
];

export default function RoutePlannerModal({
  isOpen,
  onClose,
  origin,
  setOrigin,
  destination,
  setDestination,
  batterySoC,
  setBatterySoC,
  minReserveSoC,
  setMinReserveSoC,
  selectedVehicle,
  onChangeVehicleClick,
  onCalculateRoute,
  onClearRoute,
  isRouting = false,
  routeData = null,
}) {
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  // Use real HTML5 browser geolocation for Origin (Point A)
  const handleUseCurrentLocationAsOrigin = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setOrigin({
          name: "My Current Location",
          latitude: Number(latitude.toFixed(5)),
          longitude: Number(longitude.toFixed(5)),
        });
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation permission error:", err);
        setErrorMessage("Location access was denied. Please allow location permissions in your browser.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleCalculate = async () => {
    if (!origin || !destination) {
      setErrorMessage("Please select both a starting point (A) and destination (B).");
      return;
    }
    setErrorMessage(null);
    await onCalculateRoute();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 pointer-events-auto">
      <div className="relative w-full max-w-md bg-white text-zinc-900 rounded-3xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Navigation className="w-4 h-4 fill-current stroke-none" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Plan Route (A → B)</h3>
              <p className="text-[11px] text-zinc-500">Auto-optimal EV charging stops</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Point A: Origin */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  A
                </span>
                <span>Starting Point (Origin)</span>
              </label>

              <button
                type="button"
                onClick={handleUseCurrentLocationAsOrigin}
                disabled={isLocating}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-blue-500" : ""}`} />
                <span>{isLocating ? "Detecting GPS..." : "Use Current Location"}</span>
              </button>
            </div>

            <select
              value={origin ? `${origin.latitude},${origin.longitude}` : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setOrigin(null);
                  return;
                }
                const [lat, lng] = val.split(",").map(Number);
                const matched = KERALA_PRESET_CITIES.find(
                  (c) => Math.abs(c.latitude - lat) < 0.001 && Math.abs(c.longitude - lng) < 0.001
                );
                setOrigin(matched || { name: "Custom Point", latitude: lat, longitude: lng });
              }}
              className="w-full py-2.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose Origin (A) --</option>
              {origin?.name === "My Current Location" && (
                <option value={`${origin.latitude},${origin.longitude}`}>
                  📍 My Current Location ({origin.latitude}, {origin.longitude})
                </option>
              )}
              {KERALA_PRESET_CITIES.map((c) => (
                <option key={`orig_${c.name}`} value={`${c.latitude},${c.longitude}`}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full border border-zinc-200 transition-transform active:scale-90"
              title="Swap Origin and Destination"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Point B: Destination */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 flex items-center space-x-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                B
              </span>
              <span>Destination</span>
            </label>

            <select
              value={destination ? `${destination.latitude},${destination.longitude}` : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setDestination(null);
                  return;
                }
                const [lat, lng] = val.split(",").map(Number);
                const matched = KERALA_PRESET_CITIES.find(
                  (c) => Math.abs(c.latitude - lat) < 0.001 && Math.abs(c.longitude - lng) < 0.001
                );
                setDestination(matched || { name: "Custom Destination", latitude: lat, longitude: lng });
              }}
              className="w-full py-2.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Choose Destination (B) --</option>
              {KERALA_PRESET_CITIES.map((c) => (
                <option key={`dest_${c.name}`} value={`${c.latitude},${c.longitude}`}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active EV & Battery SoC parameters */}
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-zinc-600" />
                <span className="font-bold text-zinc-900">
                  {selectedVehicle?.name || "Mini Cooper SE"}
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  ({selectedVehicle?.capacityKwh || 32.6} kWh)
                </span>
              </div>
              <button
                type="button"
                onClick={onChangeVehicleClick}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Change EV
              </button>
            </div>

            {/* Battery SoC Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-zinc-600">
                <span>Current Battery Level</span>
                <span className="font-mono font-bold text-emerald-700">{batterySoC}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={batterySoC}
                onChange={(e) => setBatterySoC(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Min Reserve Buffer */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-zinc-600">
                <span>Minimum Arrival Reserve</span>
                <span className="font-mono font-bold text-zinc-800">{minReserveSoC}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={minReserveSoC}
                onChange={(e) => setMinReserveSoC(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-700"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isRouting || !origin || !destination}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isRouting ? "Calculating Route..." : "Calculate Optimal EV Route"}</span>
            </button>

            {routeData && (
              <button
                type="button"
                onClick={() => {
                  onClearRoute();
                  onClose();
                }}
                className="w-full py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition-all"
              >
                Clear Active Route
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
