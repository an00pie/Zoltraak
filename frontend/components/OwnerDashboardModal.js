"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Home,
  Building,
  Zap,
  CheckCircle2,
  Clock,
  Ban,
  Phone,
  MapPin,
  Save,
  Plus,
  RefreshCw,
  Star,
  Users,
  LocateFixed,
  AlertCircle,
} from "lucide-react";

export default function OwnerDashboardModal({
  isOpen,
  onClose,
  currentUser,
  communityChargers = [],
  publicStations = [],
  onChargerUpdated,
  apiBaseUrl = "http://127.0.0.1:8000",
}) {
  const isHomeowner = currentUser?.role === "homeowner";
  const isOperator = currentUser?.role === "operator";

  // Active home charger being edited
  const [selectedHomeChargerId, setSelectedHomeChargerId] = useState(
    currentUser?.chargerId || communityChargers[0]?.id || 1
  );

  // Homeowner form state
  const [homeTitle, setHomeTitle] = useState("");
  const [homeHostName, setHomeHostName] = useState("");
  const [homePhone, setHomePhone] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeCity, setHomeCity] = useState("Chalakudy");
  const [homePowerKw, setHomePowerKw] = useState(7.4);
  const [homeConnectorType, setHomeConnectorType] = useState("Type 2 (AC)");
  const [homeStatus, setHomeStatus] = useState("available");
  const [homeQueueCount, setHomeQueueCount] = useState(0);
  const [homeAccessHours, setHomeAccessHours] = useState("6:00 AM - 10:00 PM");
  const [homeAmenities, setHomeAmenities] = useState("Covered Parking, Wi-Fi, Restroom");
  const [homeNotes, setHomeNotes] = useState("");

  // Commercial operator form state
  const [selectedStationId, setSelectedStationId] = useState(publicStations[0]?.id || 1);
  const [opStatusType, setOpStatusType] = useState("Operational");
  const [opIsOperational, setOpIsOperational] = useState(true);
  const [opPoints, setOpPoints] = useState(2);
  const [opCost, setOpCost] = useState("₹18.50 / kWh");

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync state when charger changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (isHomeowner) {
      const target =
        communityChargers.find((c) => c.id === Number(selectedHomeChargerId)) ||
        communityChargers[0];

      if (target) {
        setHomeTitle(target.title || "");
        setHomeHostName(target.host_name || currentUser?.name || "");
        setHomePhone(target.phone || currentUser?.phone || "+91 94471 98765");
        setHomeAddress(target.address || "");
        setHomeCity(target.city || "Chalakudy");
        setHomePowerKw(target.power_kw || 7.4);
        setHomeConnectorType(target.connector_type || "Type 2 (AC)");
        setHomeStatus(target.availability_status || "available");
        setHomeQueueCount(target.queue_count || 0);
        setHomeAccessHours(target.access_hours || "6:00 AM - 10:00 PM");
        setHomeAmenities(target.amenities || "Covered Parking, Wi-Fi, Restroom");
        setHomeNotes(target.notes || "");
      }
    } else if (isOperator) {
      const target =
        publicStations.find((s) => s.id === Number(selectedStationId)) ||
        publicStations[0];

      if (target) {
        setOpIsOperational(target.is_operational !== false);
        setOpStatusType(target.status_type || "Operational");
        setOpPoints(target.number_of_points || 2);
        setOpCost(target.usage_cost || "₹18.50 / kWh");
      }
    }
  }, [isOpen, selectedHomeChargerId, selectedStationId, isHomeowner, isOperator, communityChargers, publicStations, currentUser]);

  if (!isOpen) return null;

  // Handle Home Charger Save
  const handleSaveHomeCharger = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        title: homeTitle.trim(),
        host_name: homeHostName.trim(),
        phone: homePhone.trim(),
        address: homeAddress.trim(),
        city: homeCity.trim(),
        power_kw: parseFloat(homePowerKw),
        connector_type: homeConnectorType,
        availability_status: homeStatus,
        queue_count: parseInt(homeQueueCount, 10),
        access_hours: homeAccessHours,
        amenities: homeAmenities,
        notes: homeNotes.trim() || undefined,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/community-chargers/${selectedHomeChargerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update charger details");
      }

      const data = await res.json();
      setSuccessMsg("Home charger details & live availability updated successfully!");
      if (onChargerUpdated) {
        onChargerUpdated(data.charger);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to save updates.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Commercial Operator Save
  const handleSaveOperatorStation = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        is_operational: opIsOperational,
        status_type: opStatusType,
        number_of_points: parseInt(opPoints, 10),
        usage_cost: opCost,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/stations/${selectedStationId}/operator-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update station status");
      }

      setSuccessMsg("Station status & operational settings updated successfully!");
      if (onChargerUpdated) {
        onChargerUpdated();
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to save operator updates.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-zinc-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isHomeowner
                  ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                  : "bg-amber-600/20 border-amber-500/30 text-amber-400"
              }`}
            >
              {isHomeowner ? <Home className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-zinc-100">
                  {isHomeowner ? "Home Charger Management Portal" : "Station Operator Dashboard"}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    isHomeowner
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {isHomeowner ? "Blue Pin Host" : "Commercial Network"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Logged in as <strong className="text-zinc-200">{currentUser?.name || "Owner"}</strong> • Configure your details and live availability
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback banners */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Homeowner Charger Setup & Live Status */}
        {isHomeowner && (
          <form onSubmit={handleSaveHomeCharger} className="mt-5 space-y-4">
            {/* Charger Selector */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                Select Your Home Charger Listing to Manage:
              </label>
              <select
                value={selectedHomeChargerId}
                onChange={(e) => setSelectedHomeChargerId(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {communityChargers.slice(0, 30).map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} - {c.title} ({c.city}, Kerala) • {c.power_kw}kW
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Live Status Toggle Box */}
            <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Live Availability Status (Updates Map in Real-Time)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setHomeStatus("available")}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    homeStatus === "available"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Available Now
                </button>
                <button
                  type="button"
                  onClick={() => setHomeStatus("in_use")}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    homeStatus === "in_use"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  In Use / Busy
                </button>
                <button
                  type="button"
                  onClick={() => setHomeStatus("unavailable")}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    homeStatus === "unavailable"
                      ? "bg-rose-500/20 border-rose-500 text-rose-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <Ban className="w-4 h-4 text-rose-400" />
                  Offline / Private
                </button>
              </div>

              {/* Queue counter */}
              <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-zinc-800/80">
                <span className="text-zinc-400">Current Queue (Vehicles Waiting):</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHomeQueueCount(Math.max(0, homeQueueCount - 1))}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-semibold text-zinc-100">{homeQueueCount}</span>
                  <button
                    type="button"
                    onClick={() => setHomeQueueCount(homeQueueCount + 1)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Editable Details Form */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Station Profile & Technical Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Listing Title</label>
                  <input
                    type="text"
                    value={homeTitle}
                    onChange={(e) => setHomeTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Host Name</label>
                  <input
                    type="text"
                    value={homeHostName}
                    onChange={(e) => setHomeHostName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Contact Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={homePhone}
                    onChange={(e) => setHomePhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">City / Town in Kerala</label>
                  <input
                    type="text"
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Residential Address</label>
                <input
                  type="text"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Power Output (kW)</label>
                  <select
                    value={homePowerKw}
                    onChange={(e) => setHomePowerKw(parseFloat(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value={3.3}>3.3 kW (Slow 16A)</option>
                    <option value={7.4}>7.4 kW (Fast Wallbox)</option>
                    <option value={11.0}>11.0 kW (3-Phase AC)</option>
                    <option value={22.0}>22.0 kW (Ultra AC)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Connector Plug</label>
                  <select
                    value={homeConnectorType}
                    onChange={(e) => setHomeConnectorType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Type 2 (AC)">Type 2 (AC)</option>
                    <option value="16A 3-Pin Socket">16A 3-Pin Socket</option>
                    <option value="CCS2 (DC)">CCS2 (DC)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Standard Fixed Tariff</label>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-blue-400 font-semibold">
                    ₹11.50 / kWh (Fixed)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Access Hours</label>
                  <input
                    type="text"
                    value={homeAccessHours}
                    onChange={(e) => setHomeAccessHours(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Amenities</label>
                  <input
                    type="text"
                    value={homeAmenities}
                    onChange={(e) => setHomeAmenities(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Access & Parking Notes for Drivers</label>
                <textarea
                  rows={2}
                  value={homeNotes}
                  onChange={(e) => setHomeNotes(e.target.value)}
                  placeholder="e.g. Drive into right portico, knock on door or ring bell. Cable length is 5 meters."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Saving..." : "Save & Update Charger"}
              </button>
            </div>
          </form>
        )}

        {/* Commercial Operator Setup */}
        {isOperator && (
          <form onSubmit={handleSaveOperatorStation} className="mt-5 space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">
                Select Commercial Station to Manage:
              </label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {publicStations.slice(0, 40).map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} - {s.name} ({s.city || "Kerala"}) • {s.operator_name || "Commercial"}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Live Station Operational Status
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpIsOperational(true);
                    setOpStatusType("Operational");
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    opIsOperational
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Operational
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpIsOperational(false);
                    setOpStatusType("Under Maintenance");
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    !opIsOperational
                      ? "bg-rose-500/20 border-rose-500 text-rose-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <Ban className="w-4 h-4 text-rose-400" />
                  Under Maintenance / Down
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Available Charging Points</label>
                  <input
                    type="number"
                    value={opPoints}
                    onChange={(e) => setOpPoints(parseInt(e.target.value, 10))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Tariff / Pricing Display</label>
                  <input
                    type="text"
                    value={opCost}
                    onChange={(e) => setOpCost(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Saving..." : "Update Station Status"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
