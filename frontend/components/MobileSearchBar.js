"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Zap,
  Home,
  Layers,
  QrCode,
  Crosshair,
} from "lucide-react";

export default function MobileSearchBar({
  searchQuery,
  setSearchQuery,
  onSelectPlace,
  activeFilterChip = "available", // 'available' | 'all' | 'community'
  setActiveFilterChip,
  showH3Overlay,
  setShowH3Overlay,
  showCommunityChargers,
  setShowCommunityChargers,
  onOpenScanner,
  onLocateMe,
  onOpenAdvancedFilters,
  apiBaseUrl = "http://127.0.0.1:8000",
}) {
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setPlaceSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/geo/search?q=${encodeURIComponent(searchQuery)}&limit=4`
        );
        if (res.ok) {
          const places = await res.json();
          setPlaceSuggestions(places || []);
          if (places.length > 0) setShowDropdown(true);
        }
      } catch (err) {
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, apiBaseUrl]);

  const handleSelectPlace = (place) => {
    setSearchQuery(place.name || place.display_name.split(",")[0]);
    setShowDropdown(false);
    if (onSelectPlace && place.longitude && place.latitude) {
      onSelectPlace(place.longitude, place.latitude);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-2 pointer-events-auto">
      {/* 1. Main Search Input Pill matching Image 4 */}
      <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-zinc-200/90 px-4 py-2.5">
        <Search className="w-4 h-4 text-zinc-500 mr-2.5 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => placeSuggestions.length > 0 && setShowDropdown(true)}
          placeholder="Where would you like to Charge?"
          className="w-full bg-transparent text-xs sm:text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setShowDropdown(false);
            }}
            className="p-1 text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onOpenAdvancedFilters}
          className="ml-2 p-1.5 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-full transition-colors shrink-0"
          title="Filter options"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Place Suggestions Dropdown */}
        {showDropdown && placeSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden z-50 text-xs">
            <div className="px-3 py-1.5 bg-zinc-50 text-[10px] font-bold uppercase text-zinc-500 border-b border-zinc-100">
              Suggested Locations
            </div>
            {placeSuggestions.map((place, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className="w-full px-3.5 py-2.5 text-left hover:bg-zinc-50 flex items-center space-x-2.5 text-zinc-800 border-b border-zinc-100 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{place.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Quick Filter Chips matching Image 4 */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5 px-1">
        <button
          type="button"
          onClick={() => setActiveFilterChip("available")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
            activeFilterChip === "available"
              ? "bg-zinc-950 text-white shadow-sm"
              : "bg-white/90 text-zinc-700 border border-zinc-200 hover:bg-white"
          }`}
        >
          Available
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterChip("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
            activeFilterChip === "all"
              ? "bg-zinc-950 text-white shadow-sm"
              : "bg-white/90 text-zinc-700 border border-zinc-200 hover:bg-white"
          }`}
        >
          All chargers
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !showCommunityChargers;
            if (setShowCommunityChargers) setShowCommunityChargers(next);
            setActiveFilterChip(next ? "community" : "all");
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center space-x-1 ${
            showCommunityChargers
              ? "bg-violet-700 text-white shadow-sm"
              : "bg-white/90 text-zinc-700 border border-zinc-200 hover:bg-white"
          }`}
        >
          <Home className="w-3 h-3" />
          <span>Community Hosts</span>
        </button>

        <button
          type="button"
          onClick={() => setShowH3Overlay(!showH3Overlay)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center space-x-1 ${
            showH3Overlay
              ? "bg-zinc-800 text-white"
              : "bg-white/90 text-zinc-700 border border-zinc-200"
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>H3 Grid</span>
        </button>
      </div>
    </div>
  );
}
