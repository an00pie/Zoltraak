"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  X,
  Check,
  ChevronRight,
  HelpCircle,
  Zap,
  Battery,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  VEHICLE_TYPES,
  VEHICLE_BRANDS,
  VEHICLE_MODELS,
  DEFAULT_VEHICLE,
} from "@/data/vehicles";
import {
  VehicleTypeIllustration,
  BrandLogo,
  VehicleModelThumbnail,
} from "./VehicleIcons";

export default function VehicleSelectorModal({
  isOpen,
  onClose,
  onSelectVehicle,
  currentVehicle = null,
  canDismiss = true,
}) {
  const [step, setStep] = useState(1); // 1: Type, 2: Brand, 3: Model
  const [selectedType, setSelectedType] = useState("4wheels");
  const [selectedBrand, setSelectedBrand] = useState("mini");
  const [selectedModel, setSelectedModel] = useState(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentVehicle) {
        setSelectedType(currentVehicle.type || "4wheels");
        setSelectedBrand(currentVehicle.brandId || "mini");
        setSelectedModel(currentVehicle);
      } else {
        setSelectedType("4wheels");
        setSelectedBrand("mini");
      }
      setStep(1);
    }
  }, [isOpen, currentVehicle]);

  if (!isOpen) return null;

  // Filter brands by selected vehicle type
  const availableBrands = VEHICLE_BRANDS.filter(
    (b) => b.type === selectedType
  );

  // Filter models by selected brand
  const availableModels = VEHICLE_MODELS.filter(
    (m) => m.brandId === selectedBrand
  );

  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId);
    // Find first brand matching this type
    const firstBrand = VEHICLE_BRANDS.find((b) => b.type === typeId);
    if (firstBrand) {
      setSelectedBrand(firstBrand.id);
    }
  };

  const handleBrandSelect = (brandId) => {
    setSelectedBrand(brandId);
  };

  const handleModelChoose = (model) => {
    setSelectedModel(model);
    if (onSelectVehicle) {
      onSelectVehicle(model);
    }
    // Save to localStorage
    try {
      localStorage.setItem("zoltraak_user_ev", JSON.stringify(model));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
    onClose();
  };

  const handleAddLater = () => {
    if (!currentVehicle && onSelectVehicle) {
      onSelectVehicle(DEFAULT_VEHICLE);
      try {
        localStorage.setItem("zoltraak_user_ev", JSON.stringify(DEFAULT_VEHICLE));
      } catch (e) {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white text-zinc-900 rounded-3xl shadow-2xl flex flex-col border border-zinc-200">
        {/* Step Indicator Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-zinc-100">
          <div className="flex items-center space-x-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="p-2 -ml-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-full transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              {step === 1 && "Select Vehicle Type"}
              {step === 2 && "Select Vehicle Brand"}
              {step === 3 && "Select Vehicle Model"}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-zinc-400">
              Step {step} of 3
            </span>
            {canDismiss && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          {/* STEP 1: SELECT VEHICLE TYPE (Image 1) */}
          {step === 1 && (
            <div className="space-y-6">
              {/* 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {VEHICLE_TYPES.map((t) => {
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTypeSelect(t.id)}
                      className={`relative flex flex-col items-center justify-between p-4 min-h-[170px] rounded-2xl border-2 transition-all text-center ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-50/70 shadow-md ring-2 ring-zinc-900/10"
                          : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/30"
                      }`}
                    >
                      {/* Top Radio Indicator */}
                      <div className="w-full flex justify-end">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Vector Illustration */}
                      <div className="my-auto py-2 flex items-center justify-center">
                        <VehicleTypeIllustration type={t.id} className="w-28 h-20" />
                      </div>

                      {/* Label */}
                      <span className="font-bold text-sm text-zinc-900 mt-1">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Informational Callout matching Image 1 */}
              <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-600 font-semibold text-xs">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-700 font-bold text-[10px]">💡</span>
                  </div>
                  <span>Why do we ask you to add your vehicle?</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Adding your vehicle helps us provide accurate charging estimates
                  tailored to your EV and enables faster, more effective troubleshooting
                  whenever you face an issue.
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3.5 px-4 bg-zinc-700 hover:bg-zinc-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-[0.98]"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleAddLater}
                  className="py-3.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-sm rounded-xl transition-all active:scale-[0.98]"
                >
                  Add Later
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT VEHICLE BRAND (Image 2) */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Grid of brand tiles */}
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5 sm:gap-3 max-h-[380px] overflow-y-auto pr-1">
                {availableBrands.map((b) => {
                  const isSelected = selectedBrand === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBrandSelect(b.id)}
                      className={`flex flex-col items-center justify-center p-2.5 sm:p-3 min-h-[76px] rounded-2xl border-2 transition-all ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-100/80 shadow-md ring-2 ring-zinc-900/10"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <BrandLogo brandId={b.id} className="w-9 h-9" />
                      <span className="text-[10px] font-bold text-zinc-700 mt-1.5 text-center line-clamp-1">
                        {b.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-sm rounded-xl transition-all active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!selectedBrand}
                  className="py-3.5 px-4 bg-zinc-700 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-[0.98]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT VEHICLE MODEL (Image 3) */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 font-medium">
                Choose your exact model to load battery capacity and charging profiles:
              </p>

              {availableModels.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-zinc-200">
                  <p className="text-sm text-zinc-600 font-medium">
                    No specific models found for this brand yet.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleModelChoose({
                        id: `${selectedBrand}_custom`,
                        name: `${selectedBrand.toUpperCase()} Electric`,
                        brandId: selectedBrand,
                        type: selectedType,
                        capacityKwh: 40.0,
                        nominalRangeKm: 280,
                        connectorType: "CCS2",
                        maxDcPowerKw: 50,
                      })
                    }
                    className="mt-3 px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg"
                  >
                    Use Standard {selectedBrand} Profile (40 kWh)
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {availableModels.map((m) => {
                    const isSelected = selectedModel?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModelChoose(m)}
                        className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all text-left group ${
                          isSelected
                            ? "border-zinc-900 bg-zinc-100/90 shadow-sm"
                            : "border-zinc-200 bg-zinc-50/60 hover:bg-zinc-100/80 hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          {/* Vehicle Thumbnail */}
                          <div className="w-16 h-11 bg-white border border-zinc-200/90 rounded-xl flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                            <VehicleModelThumbnail model={m} className="w-14 h-9" />
                          </div>

                          {/* Info */}
                          <div>
                            <h3 className="font-bold text-sm text-zinc-900 group-hover:text-black">
                              {m.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-0.5 text-xs text-zinc-500">
                              <span className="flex items-center space-x-1 font-semibold text-emerald-700">
                                <Battery className="w-3 h-3" />
                                <span>{m.capacityKwh} kWh</span>
                              </span>
                              <span>•</span>
                              <span>{m.nominalRangeKm} km range</span>
                              <span>•</span>
                              <span className="text-[11px] font-mono text-zinc-500">
                                {m.connectorType.split("/")[0]}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Chevron */}
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-800 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
