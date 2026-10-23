"use client";

import React from "react";
import { Search, Zap, Layers, RefreshCw, Filter, ShieldCheck, X } from "lucide-react";

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
}) {
  const hasActiveFilters = searchQuery || selectedOperator || selectedConnector || minPower > 0;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedOperator("");
    setSelectedConnector("");
    setMinPower(0);
  };

  return (
    <div className="bg-dark-800/90 backdrop-blur-md border border-gray-700/60 rounded-xl p-3 shadow-2xl space-y-3">
      {/* Top row: Brand & Primary Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Brand pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/30 rounded-lg text-brand-400 font-semibold text-sm shrink-0">
          <Zap className="w-4 h-4 text-brand-400 fill-brand-400" />
          <span>Zoltraak</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">Phase 2</span>
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city, station name, or address..."
            className="w-full pl-9 pr-8 py-2 bg-dark-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* H3 Overlay Toggle */}
        <button
          onClick={() => setShowH3Overlay(!showH3Overlay)}
          className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
            showH3Overlay
              ? "bg-brand-500/20 border border-brand-400 text-brand-300 shadow-sm shadow-brand-500/20"
              : "bg-dark-900 border border-gray-700 text-gray-400 hover:text-gray-200"
          }`}
          title="Toggle Uber H3 Hexagon Grid"
        >
          <Layers className={`w-4 h-4 ${showH3Overlay ? "text-brand-400" : "text-gray-400"}`} />
          <span>H3 Grid</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${showH3Overlay ? "bg-brand-500/30 text-brand-200" : "bg-gray-800 text-gray-400"}`}>
            {showH3Overlay ? "ON" : "OFF"}
          </span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center p-2 rounded-lg bg-dark-900 border border-gray-700 text-gray-400 hover:text-brand-400 hover:border-gray-600 transition-colors disabled:opacity-50"
          title="Reload stations from database"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-brand-400" : ""}`} />
        </button>
      </div>

      {/* Bottom row: Dropdown filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-700/50 text-xs">
        <div className="flex items-center gap-1.5 text-gray-400 font-medium pl-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Operator Select */}
        <select
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
          className="bg-dark-900 border border-gray-700 rounded-md px-2.5 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-brand-500 transition-colors"
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
          className="bg-dark-900 border border-gray-700 rounded-md px-2.5 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-brand-500 transition-colors"
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
          className="bg-dark-900 border border-gray-700 rounded-md px-2.5 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-brand-500 transition-colors"
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
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/10 border border-rose-500/30 rounded-md transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}

        {/* Results badge */}
        <div className="ml-auto text-xs text-gray-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
          <span>Showing <strong className="text-gray-100">{filteredCount}</strong> of <strong className="text-gray-300">{totalStations}</strong> stations</span>
        </div>
      </div>
    </div>
  );
}
