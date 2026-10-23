"use client";

import React, { useState } from "react";
import {
  MapPin,
  Navigation,
  Zap,
  Battery,
  Home,
  ShieldCheck,
  Search,
  ArrowRight,
  Sparkles,
  ChevronRight,
  RotateCw,
  Car,
  Layers,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { VehicleModelThumbnail } from "./VehicleIcons";

export default function LandingPage({
  onOpenMap,
  selectedVehicle,
  onChangeVehicleClick,
  batterySoC,
  totalStations = 0,
  totalCommunityChargers = 0,
  onOpenListHomeChargerModal,
  onSelectCorridor,
  onSearchPlace,
}) {
  const [localSearch, setLocalSearch] = useState("");

  const popularCorridors = [
    {
      id: "kochi_thrissur",
      name: "Kochi → Thrissur",
      highway: "NH 544",
      distance: "82 km",
      time: "1h 40m",
      stops: "1 Optimal Stop (Chalakudy)",
      origin: { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
      destination: { name: "Thrissur", latitude: 10.5276, longitude: 76.2144 },
    },
    {
      id: "kochi_kozhikode",
      name: "Kochi → Kozhikode",
      highway: "NH 66",
      distance: "186 km",
      time: "4h 15m",
      stops: "2 Fast Charging Hubs",
      origin: { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
      destination: { name: "Kozhikode", latitude: 11.2588, longitude: 75.7804 },
    },
    {
      id: "trivandrum_kochi",
      name: "Trivandrum → Kochi",
      highway: "MC Road / NH 66",
      distance: "205 km",
      time: "4h 30m",
      stops: "2 High-Power Hubs",
      origin: { name: "Thiruvananthapuram", latitude: 8.5241, longitude: 76.9366 },
      destination: { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
    },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localSearch.trim()) {
      onSearchPlace(localSearch.trim());
      onOpenMap();
    } else {
      onOpenMap();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-y-auto selection:bg-emerald-500 selection:text-black">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium">Kerala EV Routing & Community Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Seamless EV Corridors & <br className="hidden sm:inline" />
            <span className="text-emerald-400">Neighborhood Charging</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Plan long-distance Kerala highway routes with automatic optimal charging
            stops, dynamic H3 spatial coverage, and peer-to-peer homeowner wallboxes.
          </p>

          {/* Quick Search & Explore CTA */}
          <div className="pt-4 max-w-xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute left-4 text-zinc-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search Kerala city, highway, or charging hub..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-12 pr-32 py-3.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xl"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl transition-all flex items-center space-x-1"
              >
                <span>Find Chargers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Active Vehicle & Garage Bar */}
        <div className="mt-10 p-4 sm:p-5 bg-zinc-900/80 border border-zinc-800/90 rounded-3xl max-w-3xl mx-auto shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-10 bg-zinc-800 border border-zinc-700/80 rounded-xl flex items-center justify-center p-1 shrink-0">
                {selectedVehicle ? (
                  <VehicleModelThumbnail model={selectedVehicle} className="w-12 h-8" />
                ) : (
                  <Car className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    Your Active EV
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {batterySoC}% Battery
                  </span>
                </div>
                <h3 className="font-bold text-base text-zinc-100 mt-0.5">
                  {selectedVehicle?.name || "Mini Cooper SE"}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-zinc-400">
                  <span>{selectedVehicle?.capacityKwh || 32.6} kWh</span>
                  <span>•</span>
                  <span>{selectedVehicle?.nominalRangeKm || 230} km range</span>
                  <span>•</span>
                  <span>{selectedVehicle?.connectorType?.split("/")[0] || "CCS2"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onChangeVehicleClick}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700/80 transition-all flex items-center justify-center space-x-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Change Vehicle</span>
              </button>
              <button
                type="button"
                onClick={onOpenMap}
                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 shadow-sm"
              >
                <span>Launch Map</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {/* Card 1 */}
          <div className="p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <Navigation className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-zinc-100">
              Optimal Corridor Routing
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Auto-calculates the fastest route with minimal detour EV charging stops,
              tailored to your exact battery SoC and capacity.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-950/80 border border-violet-800/50 flex items-center justify-center text-violet-400">
              <Home className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-zinc-100">
              Community Home Chargers
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Access local homeowner chargers across Kerala with guaranteed standard
              rates of <strong>₹11.50 / kWh</strong> and zero surprise fees.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-zinc-100">
              Dynamic H3 Hexagons
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Fast spatial exploration powered by Uber H3 discrete global grid system
              that subdivides dynamically as you zoom.
            </p>
          </div>
        </div>

        {/* Popular Kerala EV Corridors */}
        <div className="mt-14 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                Popular Kerala EV Highway Corridors
              </h3>
              <p className="text-xs text-zinc-400">
                Pre-calculated routes with optimal intermediate charging stops
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenMap}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>View All Corridors</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {popularCorridors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (onSelectCorridor) onSelectCorridor(c.origin, c.destination);
                  onOpenMap();
                }}
                className="p-4 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all text-left flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>{c.highway}</span>
                    <span>{c.distance}</span>
                  </div>
                  <h4 className="font-bold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors mt-1">
                    {c.name}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{c.time}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-emerald-500 font-medium">
                  <span className="truncate">{c.stops}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Community Homeowner Host CTA Banner */}
        <div className="mt-14 p-6 bg-linear-to-r from-violet-950/40 via-purple-950/30 to-zinc-900 border border-violet-900/50 rounded-3xl max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1 max-w-lg">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-violet-900/60 text-violet-300 text-[11px] font-bold">
              <span>🏠 Kerala Homeowner Network</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Own an EV charger at your Kerala home?
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              List your charger on Zoltraak. Help fellow travelers while earning at the
              standard green residential tariff of <strong>₹11.50 / kWh</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenListHomeChargerModal}
            className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 w-full sm:w-auto"
          >
            + List Your Home Charger
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 py-6 px-4 text-center text-xs text-zinc-600">
        <p>Zoltraak EV Intelligence Platform • Powered by OSRM & Uber H3</p>
      </footer>
    </div>
  );
}
