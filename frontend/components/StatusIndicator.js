"use client";

import React from "react";
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";

export default function StatusIndicator({
  backendOnline,
  errorMessage,
  isLoading,
  totalStations,
  filteredCount,
  onRetry,
}) {
  return (
    <>
      {/* Backend connection badge (top-left below filter bar or top-right) */}
      <div className="absolute top-24 left-4 z-20 flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-dark-800/90 backdrop-blur-md border border-gray-700/60 shadow-lg">
        {backendOnline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-gray-300">FastAPI Backend Online</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-rose-400 font-semibold">Backend Offline</span>
          </>
        )}
      </div>

      {/* Error state banner */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4">
          <div className="bg-rose-950/90 border border-rose-500/50 backdrop-blur-md rounded-xl p-3 shadow-2xl flex items-center justify-between gap-3 text-rose-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-md transition-colors flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State Banner (when filters match 0 stations) */}
      {!isLoading && filteredCount === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-dark-800/95 border border-gray-700/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-100 mb-1">No Charging Stations Found</h3>
          <p className="text-xs text-gray-400 mb-4">
            No stations match your current search and filter combination. Try resetting filters or widening the search radius.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold text-xs rounded-lg transition-colors"
            >
              Reset Filters & Reload
            </button>
          )}
        </div>
      )}

      {/* Subtle floating spinner during reload */}
      {isLoading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-dark-800/90 border border-gray-700 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xl flex items-center gap-2 text-xs text-brand-300">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
          <span>Synchronizing stations with H3 spatial index...</span>
        </div>
      )}
    </>
  );
}
