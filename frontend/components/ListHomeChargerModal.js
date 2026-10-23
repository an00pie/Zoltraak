"use client";

import React, { useState } from "react";
import {
  X,
  Home,
  Zap,
  MapPin,
  Phone,
  ShieldCheck,
  Clock,
  Coffee,
  Wifi,
  Car,
  Check,
  AlertCircle,
  LocateFixed,
} from "lucide-react";

const STANDARD_TARIFF = 11.5;

export default function ListHomeChargerModal({
  isOpen,
  onClose,
  mapCenter,
  onChargerCreated,
  apiBaseUrl = "http://127.0.0.1:8000",
}) {
  const [hostName, setHostName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chalakudy");
  const [latitude, setLatitude] = useState(mapCenter?.latitude ? mapCenter.latitude.toFixed(5) : "10.3065");
  const [longitude, setLongitude] = useState(mapCenter?.longitude ? mapCenter.longitude.toFixed(5) : "76.3385");
  const [connectorType, setConnectorType] = useState("Type 2 (AC)");
  const [powerKw, setPowerKw] = useState(7.4);
  const [accessHours, setAccessHours] = useState("6:00 AM - 10:00 PM");
  const [amenities, setAmenities] = useState(["Covered Parking", "Wi-Fi", "Restroom"]);
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleUseMapCenter = () => {
    if (mapCenter?.latitude && mapCenter?.longitude) {
      setLatitude(Number(mapCenter.latitude).toFixed(5));
      setLongitude(Number(mapCenter.longitude).toFixed(5));
    }
  };

  const toggleAmenity = (item) => {
    if (amenities.includes(item)) {
      setAmenities(amenities.filter((a) => a !== item));
    } else {
      setAmenities([...amenities, item]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const kwNum = parseFloat(powerKw);

    if (!hostName.trim() || !title.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      setErrorMsg("Please fill in all required fields (Host Name, Title, Phone, Address, City).");
      return;
    }

    if (isNaN(latNum) || isNaN(lngNum) || latNum < 8.0 || latNum > 13.0 || lngNum < 74.0 || lngNum > 78.0) {
      setErrorMsg("Please provide valid coordinates within Kerala (Lat ~8.0-13.0, Lng ~74.0-78.0).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        host_name: hostName.trim(),
        title: title.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: "Kerala",
        latitude: latNum,
        longitude: lngNum,
        connector_type: connectorType,
        power_kw: kwNum,
        price_per_kwh: STANDARD_TARIFF,
        access_hours: accessHours,
        amenities: amenities.join(", ") || "Covered Parking",
        notes: notes.trim() || undefined,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/community-chargers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned HTTP ${res.status}`);
      }

      const resData = await res.json();
      setSuccessMsg(resData.message || "Your community home charger has been listed!");

      if (onChargerCreated) {
        onChargerCreated(resData.charger);
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Listing creation failed:", err);
      setErrorMsg(err.message || "Failed to list home charger. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs text-zinc-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">List Your Home EV Charger</h3>
                <span className="px-1.5 py-0.2 rounded bg-blue-950/80 border border-blue-800/80 text-blue-300 font-mono text-[10px]">
                  Community Host
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Share your residential charger with neighboring EV drivers in Kerala
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Standard Tariff Banner */}
          <div className="p-3 bg-blue-950/30 border border-blue-900/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <p className="font-medium text-blue-200 text-xs">Standard Community Tariff</p>
                <p className="text-[10px] text-zinc-400">Fixed Kerala residential green energy EV price</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-sm text-blue-300">₹{STANDARD_TARIFF.toFixed(2)}</div>
              <div className="text-[10px] text-zinc-500">per kWh</div>
            </div>
          </div>

          {/* Host & Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">Host Full Name *</label>
              <input
                type="text"
                required
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Mathew Kurian"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">Contact Phone / WhatsApp *</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 94471 28910"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Listing Title */}
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1 font-medium">Charger Nickname / Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mathew's Residence Fast 7.4kW Point"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">Residential Street Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Green Crest Villa, NH-544 Bypass Road"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">City (Kerala) *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Chalakudy"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-300 text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Exact Location Coordinates</span>
              </span>
              <button
                type="button"
                onClick={handleUseMapCenter}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-blue-300 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                title="Use current visible map center coordinates"
              >
                <LocateFixed className="w-3 h-3" />
                <span>Use Current Map Center</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500">Latitude</label>
                <input
                  type="text"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500">Longitude</label>
                <input
                  type="text"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Charger Hardware Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">Connector Type</label>
              <select
                value={connectorType}
                onChange={(e) => setConnectorType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="Type 2 (AC)">Type 2 (AC) — Standard Indian EV</option>
                <option value="16A 3-Pin Socket (AC)">16A Industrial 3-Pin Socket</option>
                <option value="CCS-2 (DC)">CCS-2 Fast DC Box</option>
                <option value="Bharat AC-001">Bharat AC-001</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">Output Power (kW)</label>
              <select
                value={powerKw}
                onChange={(e) => setPowerKw(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value={3.3}>3.3 kW (Slow 16A)</option>
                <option value={7.4}>7.4 kW (Standard 32A Fast Box)</option>
                <option value={11.0}>11.0 kW (3-Phase Fast)</option>
                <option value={22.0}>22.0 kW (3-Phase Max)</option>
              </select>
            </div>
          </div>

          {/* Operating Hours & Amenities */}
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1 font-medium">Operating / Access Hours</label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={accessHours}
                onChange={(e) => setAccessHours(e.target.value)}
                placeholder="e.g. 6:00 AM - 10:00 PM, 24/7 Gate Access"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Amenities Checkboxes */}
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1.5 font-medium">Guest Amenities Available</label>
            <div className="flex flex-wrap gap-2">
              {[
                "Covered Parking",
                "Wi-Fi",
                "Restroom",
                "Filtered Water",
                "Coffee / Tea",
                "CCTV Security",
                "Solar Powered",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleAmenity(item)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border flex items-center gap-1.5 ${
                    amenities.includes(item)
                      ? "bg-blue-950/60 border-blue-700/80 text-blue-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {amenities.includes(item) && <Check className="w-3 h-3 text-blue-400" />}
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
              Helpful Notes for Drivers (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Driveway on the left side of gate. Ring the doorbell or call when you arrive."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
            >
              <Zap className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
              <span>{isSubmitting ? "Listing Charger..." : "List Home Charger"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
