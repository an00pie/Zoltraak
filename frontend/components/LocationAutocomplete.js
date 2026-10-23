"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Search, X, Crosshair, Loader2, Compass } from "lucide-react";

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  presetCities = [],
  placeholder = "Type any city, town, or address in India...",
  accentColor = "emerald", // "emerald" for A, "rose" for B
  enableGps = false,
}) {
  const [inputText, setInputText] = useState(value ? value.name : "");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);

  // Synchronize internal text if external value changes (e.g. on swap or preset click)
  useEffect(() => {
    if (value) {
      setInputText(value.name || value.display_name || "");
    } else {
      setInputText("");
    }
  }, [value]);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Instant client-side filtering across preset towns
  const filteredPresets = useMemo(() => {
    if (!inputText || inputText.trim().length === 0) return presetCities;
    const q = inputText.toLowerCase().trim();
    return presetCities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q))
    );
  }, [inputText, presetCities]);

  // Search places via backend geocoding (combines local corridor directory + OpenStreetMap Nominatim)
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    setIsOpen(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/geo/search?q=${encodeURIComponent(text.trim())}&limit=8`
        );
        if (res.ok) {
          const places = await res.json();
          setSuggestions(places || []);
        }
      } catch (err) {
        console.warn("Geocoding query error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
  };

  const handleSelectPlace = (place) => {
    const selectedObj = {
      name: place.name || place.display_name.split(",")[0],
      display_name: place.display_name,
      latitude: place.latitude,
      longitude: place.longitude,
    };
    setInputText(selectedObj.name);
    setIsOpen(false);
    onChange(selectedObj);
  };

  const handleClear = () => {
    setInputText("");
    setSuggestions([]);
    setIsOpen(false);
    onChange(null);
  };

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(
            `http://127.0.0.1:8000/api/v1/geo/reverse?latitude=${lat}&longitude=${lon}`
          );
          if (res.ok) {
            const data = await res.json();
            const placeName = data.city || data.road || "My Current Location";
            const locObj = {
              name: placeName,
              display_name: data.display_name,
              latitude: lat,
              longitude: lon,
            };
            setInputText(placeName);
            onChange(locObj);
          }
        } catch {
          const fallback = {
            name: "My Current GPS Location",
            display_name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            latitude: lat,
            longitude: lon,
          };
          setInputText("My Current GPS Location");
          onChange(fallback);
        } finally {
          setIsLocating(false);
          setIsOpen(false);
        }
      },
      (err) => {
        setIsLocating(false);
        alert(`Location access denied or unavailable (${err.message}).`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const indicatorDotClass =
    accentColor === "emerald" ? "bg-emerald-400" : "bg-rose-400";
  const focusBorderClass =
    accentColor === "emerald"
      ? "focus-within:border-emerald-500"
      : "focus-within:border-rose-500";

  return (
    <div ref={containerRef} className="space-y-1 relative">
      {/* Label and GPS action */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
        <label className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${indicatorDotClass}`}></span>
          <span>{label}</span>
        </label>
        {enableGps && (
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
          >
            {isLocating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Crosshair className="w-3 h-3" />
            )}
            <span>{isLocating ? "Locating..." : "Use GPS"}</span>
          </button>
        )}
      </div>

      {/* Input container */}
      <div
        className={`relative flex items-center bg-dark-800 border border-gray-700 rounded-lg overflow-hidden transition-all ${focusBorderClass}`}
      >
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-8 pr-7 py-2 text-gray-100 text-xs placeholder-gray-400 focus:outline-none font-medium"
        />

        {/* Clear or loading indicator */}
        <div className="absolute right-2 flex items-center">
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
          ) : inputText ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Suggestions & Preset Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-dark-900/98 backdrop-blur-2xl border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-80 overflow-y-auto">
          {/* Matched Geocoded Locations */}
          {suggestions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-dark-800/90 text-[10px] font-semibold text-gray-400 border-b border-gray-800 flex items-center justify-between sticky top-0 backdrop-blur z-10">
                <span>Matched Places (OSM & Corridors)</span>
                <span className="font-mono text-brand-400 text-[10px]">Instant Select</span>
              </div>
              {suggestions.map((place, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-800/90 flex items-center gap-2.5 text-gray-200 border-b border-gray-800/40 last:border-0 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <div className="truncate flex-1">
                    <p className="font-bold text-gray-100 text-xs truncate">
                      {place.name || place.display_name.split(",")[0]}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {place.display_name}
                    </p>
                  </div>
                  {place.source === "local_corridor" && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono shrink-0">
                      Corridor Town
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Quick Preset Corridor Cities & Local Highway Towns */}
          <div>
            <div className="px-3 py-1.5 bg-dark-800/90 text-[10px] font-semibold text-gray-400 border-b border-gray-800 flex items-center justify-between sticky top-0 backdrop-blur z-10">
              <span>{inputText ? "Matching Highway Towns" : "Popular Highway Corridors"}</span>
              <span className="text-gray-500 text-[10px] font-mono">
                {filteredPresets.length} Towns
              </span>
            </div>
            {filteredPresets.map((city, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPlace(city)}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-800/90 flex items-center justify-between text-gray-200 border-b border-gray-800/40 last:border-0 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-medium text-xs text-gray-200">
                    {city.name}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {city.state}
                </span>
              </button>
            ))}

            {filteredPresets.length === 0 && suggestions.length === 0 && (
              <div className="px-4 py-3 text-center text-gray-400 text-xs">
                No matching towns found. Try searching full address or landmark.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
