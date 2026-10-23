"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Zap, Layers, RefreshCw, Filter, X, MapPin } from "lucide-react";

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedOperator,
  setSelectedOperator,
  selectedConnector,
  setSelectedConnector,
  minPower,
  setMinPower,
  showH3Overlay,
  setShowH3Overlay,
  operators = [],
  connectorTypes = [],
  powerBrackets = [],
  totalStations = 0,
  filteredCount = 0,
  isLoading = false,
  onRefresh,
  onSelectPlace,
}) {
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  const hasActiveFilters = searchQuery || selectedOperator || selectedConnector || minPower > 0;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedOperator("");
    setSelectedConnector("");
    setMinPower(0);
    setPlaceSuggestions([]);
    setShowDropdown(false);
  };

  // OpenStreetMap Nominatim Geocoding Autocomplete
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
        setIsSearchingPlaces(true);
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/geo/search?q=${encodeURIComponent(searchQuery)}&limit=4`
        );
        if (res.ok) {
          const places = await res.json();
          setPlaceSuggestions(places || []);
          if (places.length > 0) setShowDropdown(true);
        }
      } catch (err) {
        // Silently handle geocoding timeout
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSelectPlace = (place) => {
    setSearchQuery(place.name || place.display_name.split(",")[0]);
    setShowDropdown(false);
    if (onSelectPlace && place.longitude && place.latitude) {
      onSelectPlace(place.longitude, place.latitude);
    }
  };

  return (
    <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-2.5 shadow-lg space-y-2.5">
      {/* Top row: Brand & Primary Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Brand pill */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 font-medium text-xs shrink-0">
          <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          <span className="font-semibold tracking-tight">Zoltraak</span>
        </div>

        {/* Search input with OpenStreetMap Autocomplete */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => placeSuggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search station, city, or address..."
            className="w-full pl-8 pr-7 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowDropdown(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* OpenStreetMap Place Suggestions Dropdown */}
          {showDropdown && placeSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden text-xs">
              <div className="px-3 py-1.5 bg-zinc-950/80 text-[10px] font-semibold text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
                <span>Places</span>
                <span className="font-mono text-zinc-500">Fly to Location</span>
              </div>
              {placeSuggestions.map((place, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPlace(place)}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-800/80 flex items-center gap-2.5 text-zinc-200 border-b border-zinc-800/50 last:border-0 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{place.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* H3 Overlay Toggle */}
        <button
          onClick={() => setShowH3Overlay(!showH3Overlay)}
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            showH3Overlay
              ? "bg-zinc-800 border border-zinc-700 text-zinc-100"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
          }`}
          title="Toggle Uber H3 Hexagon Grid"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>H3 Grid</span>
          <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${showH3Overlay ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500"}`}>
            {showH3Overlay ? "ON" : "OFF"}
          </span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors disabled:opacity-50"
          title="Reload stations"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {/* Bottom row: Dropdown filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80 text-xs">
        <div className="flex items-center gap-1 text-zinc-500 font-medium pl-0.5 text-[11px]">
          <Filter className="w-3 h-3" />
          <span>Filter:</span>
        </div>

        {/* Operator Select */}
        <select
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-zinc-600 transition-colors"
        >
          <option value="">All Operators</option>
          {operators.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        {/* Connector Type Select */}
        <select
          value={selectedConnector}
          onChange={(e) => setSelectedConnector(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-zinc-600 transition-colors"
        >
          <option value="">All Plugs / Connectors</option>
          {connectorTypes.map((ct) => (
            <option key={ct} value={ct}>
              {ct}
            </option>
          ))}
        </select>

        {/* Minimum Power Select */}
        <select
          value={minPower}
          onChange={(e) => setMinPower(Number(e.target.value))}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-zinc-600 transition-colors"
        >
          {powerBrackets.map((pb) => (
            <option key={pb.min_kw} value={pb.min_kw}>
              {pb.label}
            </option>
          ))}
        </select>

        {/* Clear filters pill */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-0.5 bg-rose-950/40 border border-rose-900/60 rounded-md transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}

        {/* Results count */}
        <div className="ml-auto text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
          <span>{filteredCount} / {totalStations} stations</span>
        </div>
      </div>
    </div>
  );
}
