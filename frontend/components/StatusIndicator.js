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
      {/* Backend connection status (Discrete bottom-right or top-right indicator) */}
      {!backendOnline && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-4">
          <div className="bg-zinc-950 border border-rose-800/80 rounded-xl p-3 shadow-lg flex items-center justify-between gap-3 text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>FastAPI backend unreachable. Make sure port 8000 is running.</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium rounded-md transition-colors flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state banner */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4">
          <div className="bg-zinc-950 border border-rose-800/80 rounded-xl p-3 shadow-lg flex items-center justify-between gap-3 text-rose-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium rounded-md transition-colors flex items-center gap-1 shrink-0"
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-zinc-950 border border-zinc-800 p-6 rounded-xl shadow-xl text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium text-zinc-100 mb-1">No Stations Found</h3>
          <p className="text-xs text-zinc-400 mb-4">
            No charging stations match your active filters.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-xs rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Subtle floating spinner during reload */}
      {isLoading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 text-xs text-zinc-300">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          <span>Updating stations...</span>
        </div>
      )}
    </>
  );
}
