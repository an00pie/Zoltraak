"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Search, X, Crosshair, Loader2, Compass } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LocationAutocomplete({
  label,
  value,
  onChange,
  onTextChange,
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
    if (onTextChange) onTextChange(text);
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
          `${API_BASE_URL}/api/v1/geo/search?q=${encodeURIComponent(text.trim())}&limit=8`
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

  // Instant geocoding resolution for typed text (Enter key or form submit)
  const resolveAndSelectText = async (textToResolve) => {
    const q = (textToResolve || inputText || "").trim();
    if (!q) return null;

    // Check presets first
    const matchedPreset = presetCities.find(
      (c) => c.name.toLowerCase() === q.toLowerCase() || c.name.toLowerCase().startsWith(q.toLowerCase())
    );
    if (matchedPreset) {
      handleSelectPlace(matchedPreset);
      return matchedPreset;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/geo/search?q=${encodeURIComponent(q)}&limit=5`
      );
      if (res.ok) {
        const places = await res.json();
        if (places && places.length > 0) {
          handleSelectPlace(places[0]);
          return places[0];
        }
      }
    } catch (err) {
      console.warn("Auto-resolve place error:", err);
    } finally {
      setIsSearching(false);
    }
    return null;
  };

  // Keyboard navigation & Enter key auto-selection
  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSelectPlace(suggestions[0]);
      } else if (filteredPresets.length > 0) {
        handleSelectPlace(filteredPresets[0]);
      } else if (inputText.trim().length >= 2) {
        await resolveAndSelectText(inputText);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelectPlace = (place) => {
    const selectedObj = {
      name: place.name || place.display_name.split(",")[0],
      display_name: place.display_name || place.name,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
    };
    setInputText(selectedObj.name);
    setIsOpen(false);
    onChange(selectedObj);
  };

  const handleClear = () => {
    setInputText("");
    if (onTextChange) onTextChange("");
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
            `${API_BASE_URL}/api/v1/geo/reverse?latitude=${lat}&longitude=${lon}`
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
    accentColor === "emerald" ? "bg-emerald-500" : "bg-rose-500";
  const focusBorderClass = "focus-within:border-zinc-500";

  return (
    <div ref={containerRef} className="space-y-1 relative">
      {/* Label and GPS action */}
      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
        <label className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${indicatorDotClass}`}></span>
          <span className="text-zinc-300 font-medium">{label}</span>
        </label>
        {enableGps && (
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
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
        className={`relative flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg overflow-hidden transition-colors ${focusBorderClass}`}
      >
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputText.trim().length >= 2 && (!value || value.name !== inputText.trim())) {
              resolveAndSelectText(inputText);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-8 pr-7 py-2 text-zinc-100 text-xs placeholder-zinc-500 focus:outline-none font-normal"
        />

        {/* Clear or loading indicator */}
        <div className="absolute right-2 flex items-center">
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : inputText ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Suggestions & Preset Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden text-xs max-h-80 overflow-y-auto">
          {/* Active Search / Quick Resolution Action */}
          {inputText.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => resolveAndSelectText(inputText)}
              className="w-full px-3 py-2 text-left bg-blue-950/40 hover:bg-blue-900/60 border-b border-zinc-800 flex items-center justify-between text-blue-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-semibold text-xs">Use &ldquo;{inputText.trim()}&rdquo;</span>
              </div>
              <span className="text-[10px] bg-blue-900/80 px-1.5 py-0.5 rounded font-mono text-blue-200">
                Press Enter ↵
              </span>
            </button>
          )}

          {isSearching && (
            <div className="px-3 py-2 bg-zinc-950/90 text-zinc-400 flex items-center gap-2 border-b border-zinc-800">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span className="text-[11px]">Searching towns & villages across Kerala & India...</span>
            </div>
          )}
          {/* Matched Geocoded Locations */}
          {suggestions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-zinc-950/80 text-[10px] font-semibold text-zinc-400 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10">
                <span>Matched Places</span>
                <span className="font-mono text-zinc-500 text-[10px]">Select</span>
              </div>
              {suggestions.map((place, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-800/80 flex items-center gap-2.5 text-zinc-200 border-b border-zinc-800/50 last:border-0 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="truncate flex-1">
                    <p className="font-medium text-zinc-100 text-xs truncate">
                      {place.name || place.display_name.split(",")[0]}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {place.display_name}
                    </p>
                  </div>
                  {place.source === "local_corridor" && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-mono shrink-0">
                      Corridor
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Quick Preset Corridor Cities & Local Highway Towns */}
          <div>
            <div className="px-3 py-1.5 bg-zinc-950/80 text-[10px] font-semibold text-zinc-400 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10">
              <span>{inputText ? "Matching Highway Towns" : "Corridor Towns"}</span>
              <span className="text-zinc-500 text-[10px] font-mono">
                {filteredPresets.length}
              </span>
            </div>
            {filteredPresets.map((city, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPlace(city)}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800/80 flex items-center justify-between text-zinc-200 border-b border-zinc-800/50 last:border-0 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="font-normal text-xs text-zinc-200">
                    {city.name}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {city.state}
                </span>
              </button>
            ))}

            {filteredPresets.length === 0 && suggestions.length === 0 && (
              <div className="px-4 py-3 text-center text-zinc-500 text-xs">
                No matching towns found. Try searching full address.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
