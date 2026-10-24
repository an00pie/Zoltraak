"use client";

import React, { useState } from "react";
import {
  X,
  Navigation,
  ArrowUpDown,
  Zap,
  Battery,
  Car,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";
import LocationAutocomplete from "./LocationAutocomplete";

export const KERALA_PRESET_CITIES = [
  // Central Kerala & NH-544 / MC Road
  { name: "Kochi (Ernakulam)", latitude: 9.9312, longitude: 76.2673 },
  { name: "Aluva", latitude: 10.1076, longitude: 76.3516 },
  { name: "Angamaly", latitude: 10.1960, longitude: 76.3860 },
  { name: "Chalakudy", latitude: 10.3065, longitude: 76.3385 },
  { name: "Irinjalakuda", latitude: 10.3524, longitude: 76.2087 },
  { name: "Kodakara", latitude: 10.3667, longitude: 76.3000 },
  { name: "Thrissur", latitude: 10.5276, longitude: 76.2144 },
  { name: "Guruvayur", latitude: 10.5946, longitude: 76.0396 },
  { name: "Kunnamkulam", latitude: 10.6500, longitude: 76.0700 },
  { name: "Perumbavoor", latitude: 10.1070, longitude: 76.4740 },
  { name: "Kothamangalam", latitude: 10.0610, longitude: 76.6270 },
  { name: "Muvattupuzha", latitude: 9.9810, longitude: 76.5780 },
  { name: "Thodupuzha (Idukki)", latitude: 9.8959, longitude: 76.7184 },
  { name: "Pala", latitude: 9.7120, longitude: 76.6840 },

  // South Kerala & NH-66
  { name: "Cherthala", latitude: 9.6845, longitude: 76.3317 },
  { name: "Alappuzha (Alleppey)", latitude: 9.4981, longitude: 76.3388 },
  { name: "Kottayam", latitude: 9.5916, longitude: 76.5222 },
  { name: "Changanassery", latitude: 9.4447, longitude: 76.5367 },
  { name: "Thiruvalla", latitude: 9.3835, longitude: 76.5741 },
  { name: "Chengannur", latitude: 9.3175, longitude: 76.6174 },
  { name: "Adoor", latitude: 9.1530, longitude: 76.7356 },
  { name: "Pathanamthitta", latitude: 9.2648, longitude: 76.7870 },
  { name: "Kayamkulam", latitude: 9.1723, longitude: 76.5015 },
  { name: "Karunagappally", latitude: 9.0538, longitude: 76.5332 },
  { name: "Kollam (Quilon)", latitude: 8.8932, longitude: 76.6141 },
  { name: "Attingal", latitude: 8.6966, longitude: 76.8143 },
  { name: "Varkala", latitude: 8.7379, longitude: 76.7163 },
  { name: "Neyyattinkara", latitude: 8.4033, longitude: 77.0864 },
  { name: "Thiruvananthapuram (Trivandrum)", latitude: 8.5241, longitude: 76.9366 },

  // North Kerala & Malabar
  { name: "Ottapalam", latitude: 10.7725, longitude: 76.3800 },
  { name: "Palakkad", latitude: 10.7867, longitude: 76.6548 },
  { name: "Shornur", latitude: 10.7600, longitude: 76.2800 },
  { name: "Perinthalmanna", latitude: 10.9760, longitude: 76.2250 },
  { name: "Malappuram", latitude: 11.0735, longitude: 76.0740 },
  { name: "Manjeri", latitude: 11.1200, longitude: 76.1200 },
  { name: "Tirur", latitude: 10.9150, longitude: 75.9230 },
  { name: "Ponnani", latitude: 10.7740, longitude: 75.9250 },
  { name: "Kozhikode (Calicut)", latitude: 11.2588, longitude: 75.7804 },
  { name: "Vatakara", latitude: 11.6030, longitude: 75.5900 },
  { name: "Thalassery", latitude: 11.7500, longitude: 75.4900 },
  { name: "Kannur", latitude: 11.8745, longitude: 75.3704 },
  { name: "Payyanur", latitude: 12.1000, longitude: 75.2000 },
  { name: "Kanhangad", latitude: 12.3100, longitude: 75.0900 },
  { name: "Kasaragod", latitude: 12.5102, longitude: 74.9852 },

  // High Ranges (Idukki & Wayanad)
  { name: "Munnar", latitude: 10.0889, longitude: 77.0595 },
  { name: "Kattappana", latitude: 9.7780, longitude: 77.1210 },
  { name: "Kumily", latitude: 9.6000, longitude: 77.1660 },
  { name: "Kalpetta (Wayanad)", latitude: 11.6103, longitude: 76.0827 },
  { name: "Sulthan Bathery", latitude: 11.6620, longitude: 76.2570 },
  { name: "Mananthavady", latitude: 11.8020, longitude: 76.0030 },
];

export default function RoutePlannerModal({
  isOpen,
  onClose,
  origin,
  setOrigin,
  destination,
  setDestination,
  presetCities = [],
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
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    const tempText = originText;
    setOriginText(destText);
    setDestText(tempText);
  };

  const resolveLocation = async (query) => {
    if (!query || typeof query !== "string" || query.trim().length < 2) return null;
    const q = query.trim();
    const preset = activePresets.find(
      (c) => c.name.toLowerCase() === q.toLowerCase() || c.name.toLowerCase().startsWith(q.toLowerCase())
    );
    if (preset) return preset;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/geo/search?q=${encodeURIComponent(q)}&limit=3`);
      if (res.ok) {
        const places = await res.json();
        if (places && places.length > 0) {
          return {
            name: places[0].name || places[0].display_name.split(",")[0],
            display_name: places[0].display_name,
            latitude: Number(places[0].latitude),
            longitude: Number(places[0].longitude),
          };
        }
      }
    } catch (e) {
      console.warn("Geocoding lookup error:", e);
    }
    return null;
  };

  const handleCalculate = async () => {
    setIsResolving(true);
    let effectiveOrigin = origin;
    let effectiveDest = destination;

    if (!effectiveOrigin && originText.trim().length >= 2) {
      effectiveOrigin = await resolveLocation(originText);
      if (effectiveOrigin) setOrigin(effectiveOrigin);
    }
    if (!effectiveDest && destText.trim().length >= 2) {
      effectiveDest = await resolveLocation(destText);
      if (effectiveDest) setDestination(effectiveDest);
    }

    setIsResolving(false);

    if (!effectiveOrigin || !effectiveDest) {
      setErrorMessage("Please specify both a starting point (A) and destination (B). You can type any town, village, or address in India.");
      return;
    }
    setErrorMessage(null);
    await onCalculateRoute(effectiveOrigin, effectiveDest);
    onClose();
  };

  const activePresets = presetCities.length > 0 ? presetCities : KERALA_PRESET_CITIES;
  const batteryWarning = routeData?.battery_warning || routeData?.battery_parameters?.battery_warning;
  const chargingStops = routeData?.charging_stops || (routeData?.routed_via_station?.stops || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 pointer-events-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 text-zinc-100 rounded-3xl shadow-2xl flex flex-col border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/60 border-b border-zinc-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Navigation className="w-4 h-4 fill-current stroke-none" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-100">Plan Route (Point A → B)</h3>
              <p className="text-[11px] text-zinc-400">Search any town or address in India with EV battery simulation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Critical Battery Warning Banner */}
          {batteryWarning && (
            <div className="p-3.5 bg-rose-950/90 border border-rose-700/80 rounded-2xl text-xs text-rose-200 flex items-start space-x-2.5 shadow-lg animate-in slide-in-from-top-1">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-100">{batteryWarning.title}</p>
                <p className="text-[11px] text-rose-300 mt-0.5 leading-relaxed">{batteryWarning.message}</p>
                {batteryWarning.available_range_km && (
                  <div className="mt-2 flex gap-3 text-[10px] font-mono text-rose-400">
                    <span>Range: ~{batteryWarning.available_range_km} km</span>
                    {batteryWarning.nearest_station_km && (
                      <span>Nearest Charger: {batteryWarning.nearest_station_km} km</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Point A: Origin Searchable Autocomplete */}
          <LocationAutocomplete
            label="Starting Point (Origin A)"
            value={origin}
            onChange={setOrigin}
            onTextChange={setOriginText}
            presetCities={activePresets}
            placeholder="Type any city, town, or village (e.g. Aluva, Pala, Peermade, Vithura...)"
            accentColor="blue"
            enableGps={true}
          />

          {/* Swap Button */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-full border border-zinc-800 transition-transform active:scale-90"
              title="Swap Origin and Destination"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Point B: Destination Searchable Autocomplete */}
          <LocationAutocomplete
            label="Destination (Point B)"
            value={destination}
            onChange={setDestination}
            onTextChange={setDestText}
            presetCities={activePresets}
            placeholder="Type destination town or address (e.g. Munnar, Wayanad, Peermade...)"
            accentColor="emerald"
            enableGps={false}
          />

          {/* Active EV & Battery SoC parameters */}
          <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-zinc-400" />
                <span className="font-bold text-zinc-200">
                  {selectedVehicle?.name || "Tata Nexon EV Max"}
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  ({selectedVehicle?.capacityKwh || 40.5} kWh)
                </span>
              </div>
              <button
                type="button"
                onClick={onChangeVehicleClick}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:underline"
              >
                Change EV
              </button>
            </div>

            {/* Battery SoC Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-zinc-400">
                <span>Current Battery Level</span>
                <span className={`font-mono font-bold ${batterySoC <= minReserveSoC ? "text-rose-400" : "text-emerald-400"}`}>
                  {batterySoC}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={batterySoC}
                onChange={(e) => setBatterySoC(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
                <span>5% (Critical)</span>
                <span>50%</span>
                <span>100% (Full)</span>
              </div>
            </div>

            {/* Min Reserve Buffer */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-zinc-400">
                <span>Minimum Arrival Reserve</span>
                <span className="font-mono font-bold text-zinc-300">{minReserveSoC}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={minReserveSoC}
                onChange={(e) => setMinReserveSoC(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-500"
              />
            </div>
          </div>

          {/* Planned Multi-Stops Summary (if route data is already calculated) */}
          {chargingStops.length > 0 && (
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Planned Charging Stops ({chargingStops.length})</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Arrival SoC: ~{routeData?.battery_parameters?.final_arrival_soc ?? 30}%
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {chargingStops.map((stop, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-zinc-950/80 border border-zinc-800/60 rounded-xl text-[11px] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        stop.is_community_host ? "bg-blue-900/80 text-blue-200" : "bg-amber-900/80 text-amber-200"
                      }`}>
                        {stop.stop_number || idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-zinc-200 line-clamp-1">{stop.name}</p>
                        <p className="text-[10px] text-zinc-500">
                          {stop.is_community_host ? "🏠 Community Host" : "⚡ Public Fast Charger"} • {stop.max_power_kw} kW
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-mono shrink-0 pl-2">
                      <span className="text-rose-400">{stop.arrival_soc}%</span>
                      <span className="text-zinc-600"> ➔ </span>
                      <span className="text-emerald-400">{stop.departure_soc}%</span>
                      <p className="text-zinc-400">+{stop.charge_time_min}m</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isRouting || !origin || !destination}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isRouting ? "Calculating Route & Stops..." : "Calculate Optimal EV Route"}</span>
            </button>

            {routeData && (
              <button
                type="button"
                onClick={() => {
                  onClearRoute();
                  onClose();
                }}
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-xs rounded-xl transition-all border border-zinc-800"
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
