// High-fidelity SVG Illustrations & Brand Logos matching UI specifications

import React from "react";

// 1. Vehicle Type Hero Illustrations (Image 1)
export function VehicleTypeIllustration({ type, className = "w-32 h-24" }) {
  if (type === "2wheels") {
    // Electric Scooter (Cyan & Dark Gray)
    return (
      <svg viewBox="0 0 160 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="80" cy="108" rx="55" ry="5" fill="#e2e8f0" />
        {/* Rear Wheel */}
        <circle cx="38" cy="85" r="18" fill="#1e293b" />
        <circle cx="38" cy="85" r="9" fill="#94a3b8" />
        <circle cx="38" cy="85" r="4" fill="#0f172a" />
        {/* Front Wheel */}
        <circle cx="125" cy="85" r="18" fill="#1e293b" />
        <circle cx="125" cy="85" r="9" fill="#94a3b8" />
        <circle cx="125" cy="85" r="4" fill="#0f172a" />
        {/* Body Chassis */}
        <path d="M42 85 H88 L104 60 L120 85" stroke="#334155" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Scooter Body / Deck */}
        <path d="M48 76 Q65 74 88 74 L94 65 Q70 65 48 76 Z" fill="#06b6d4" />
        {/* Seat & Rear Fairing */}
        <path d="M30 60 Q40 50 68 50 L75 62 L42 70 Q30 68 30 60 Z" fill="#06b6d4" />
        <path d="M40 50 Q55 48 72 48 Q76 54 70 56 Q52 54 38 54 Z" fill="#1e293b" />
        {/* Front Fork & Stem */}
        <path d="M125 85 L112 36" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Front Apron */}
        <path d="M102 44 L118 42 L112 70 L98 68 Z" fill="#06b6d4" />
        {/* Headlight & Handlebar */}
        <circle cx="111" cy="36" r="6" fill="#0ea5e9" />
        <path d="M100 35 L122 37" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
        <circle cx="114" cy="36" r="3" fill="#f8fafc" />
        {/* Rearview mirror */}
        <circle cx="103" cy="28" r="3" fill="#64748b" />
        <path d="M105 31 L106 35" stroke="#64748b" strokeWidth="2" />
      </svg>
    );
  }

  if (type === "3wheels") {
    // Electric Auto Rickshaw (Cyan & White / Dark Gray)
    return (
      <svg viewBox="0 0 160 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="80" cy="110" rx="55" ry="5" fill="#e2e8f0" />
        {/* Rear Wheel */}
        <circle cx="48" cy="88" r="16" fill="#1e293b" />
        <circle cx="48" cy="88" r="8" fill="#94a3b8" />
        <circle cx="48" cy="88" r="3" fill="#0f172a" />
        {/* Front Wheel */}
        <circle cx="120" cy="88" r="14" fill="#1e293b" />
        <circle cx="120" cy="88" r="7" fill="#94a3b8" />
        <circle cx="120" cy="88" r="3" fill="#0f172a" />
        {/* Rickshaw Cabin Canopy */}
        <path d="M38 82 L38 52 Q40 34 60 34 L102 34 Q116 34 122 55 L128 80 L115 82 L115 72 L45 74 L45 82 Z" fill="#06b6d4" />
        {/* Roof Cap */}
        <path d="M42 46 Q44 32 64 32 L102 32 Q114 32 118 46 Z" fill="#0f172a" />
        {/* Windshield */}
        <path d="M96 38 L114 42 L110 64 L96 64 Z" fill="#e0f2fe" opacity="0.9" />
        {/* Passenger Open Door Window */}
        <rect x="52" y="42" width="38" height="26" rx="4" fill="#1e293b" />
        {/* Mudguard & Mudflap */}
        <path d="M112 78 Q120 74 128 78" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
        <path d="M36 84 L40 76" stroke="#475569" strokeWidth="3" />
        {/* Headlamp */}
        <circle cx="127" cy="68" r="4" fill="#f8fafc" />
      </svg>
    );
  }

  if (type === "4wheels") {
    // Sleek Electric Sedan / Hatchback (White with Cyan battery stripe)
    return (
      <svg viewBox="0 0 180 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="90" cy="108" rx="65" ry="5" fill="#e2e8f0" />
        {/* Rear Wheel */}
        <circle cx="48" cy="86" r="17" fill="#1e293b" />
        <circle cx="48" cy="86" r="9" fill="#94a3b8" />
        <circle cx="48" cy="86" r="4" fill="#06b6d4" />
        {/* Front Wheel */}
        <circle cx="132" cy="86" r="17" fill="#1e293b" />
        <circle cx="132" cy="86" r="9" fill="#94a3b8" />
        <circle cx="132" cy="86" r="4" fill="#06b6d4" />
        {/* Car Body */}
        <path
          d="M24 78 Q24 72 34 68 L52 64 Q68 46 95 44 L124 46 Q146 54 154 68 L162 72 Q166 76 166 82 L150 82 Q148 72 132 72 Q116 72 114 82 L66 82 Q64 72 48 72 Q32 72 30 82 Z"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        {/* Windows */}
        <path
          d="M60 62 L88 48 L118 48 L138 62 Z"
          fill="#334155"
        />
        <path
          d="M92 49 L94 62"
          stroke="#f8fafc"
          strokeWidth="2"
        />
        {/* EV Battery Floor Highlight (Cyan Stripe) */}
        <path d="M66 82 H114" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" />
        {/* Headlamp & Taillight */}
        <path d="M156 68 L165 72" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 72 L24 76" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
        {/* Door handle */}
        <rect x="96" y="66" width="10" height="2" rx="1" fill="#94a3b8" />
      </svg>
    );
  }

  // Heavy (Bus)
  return (
    <svg viewBox="0 0 180 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="90" cy="110" rx="70" ry="5" fill="#e2e8f0" />
      {/* Rear Wheels */}
      <circle cx="52" cy="88" r="16" fill="#1e293b" />
      <circle cx="52" cy="88" r="8" fill="#94a3b8" />
      <circle cx="52" cy="88" r="3" fill="#06b6d4" />
      {/* Front Wheels */}
      <circle cx="134" cy="88" r="16" fill="#1e293b" />
      <circle cx="134" cy="88" r="8" fill="#94a3b8" />
      <circle cx="134" cy="88" r="3" fill="#06b6d4" />
      {/* Bus Body */}
      <path
        d="M26 84 L26 48 Q26 42 34 42 L146 42 Q156 42 158 52 L158 84 L148 84 Q146 75 134 75 Q122 75 120 84 L66 84 Q64 75 52 75 Q40 75 38 84 Z"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
      {/* Windows row */}
      <rect x="34" y="48" width="16" height="15" rx="2" fill="#334155" />
      <rect x="54" y="48" width="18" height="15" rx="2" fill="#334155" />
      <rect x="76" y="48" width="18" height="15" rx="2" fill="#334155" />
      <rect x="98" y="48" width="18" height="15" rx="2" fill="#334155" />
      <rect x="120" y="48" width="18" height="15" rx="2" fill="#334155" />
      <path d="M142 48 H154 V64 H142 Z" fill="#334155" />
      {/* EV Cyan Lower Skirt */}
      <path d="M26 76 H38" stroke="#06b6d4" strokeWidth="5" />
      <path d="M66 76 H120" stroke="#06b6d4" strokeWidth="5" />
      <path d="M148 76 H158" stroke="#06b6d4" strokeWidth="5" />
    </svg>
  );
}

// 2. Brand Logos / Badges (Image 2)
export function BrandLogo({ brandId, className = "w-10 h-10" }) {
  switch (brandId) {
    case "mini":
      return (
        <div className={`${className} flex items-center justify-center font-black text-xs tracking-tighter border border-zinc-800 rounded-full px-1 bg-zinc-900 text-zinc-100`}>
          MINI
        </div>
      );
    case "tata":
    case "tata_heavy":
      return (
        <div className={`${className} flex flex-col items-center justify-center font-bold text-[10px] leading-tight text-zinc-900 border border-zinc-300 rounded-md bg-white p-0.5`}>
          <span className="font-extrabold tracking-wider">TATA</span>
          <span className="text-[8px] text-cyan-600 font-black">ev</span>
        </div>
      );
    case "mahindra":
    case "mahindra_3w":
      return (
        <div className={`${className} flex items-center justify-center font-black text-xs tracking-wider bg-black text-white rounded-md border border-zinc-800`}>
          <span className="text-white text-[10px] font-black tracking-tighter">M♾️</span>
        </div>
      );
    case "mg":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-red-500 bg-white`}>
          <div className="w-7 h-7 border-2 border-red-600 rounded-full flex items-center justify-center font-black text-red-600 text-xs">
            MG
          </div>
        </div>
      );
    case "byd":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-red-500 bg-white`}>
          <div className="border border-red-600 rounded-full px-1.5 py-0.5 font-bold text-red-600 text-[10px] tracking-wider">
            BYD
          </div>
        </div>
      );
    case "hyundai":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white text-blue-900 font-black italic text-sm`}>
          H
        </div>
      );
    case "kia":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white text-black font-extrabold text-sm tracking-widest`}>
          KИ
        </div>
      );
    case "citroen":
      return (
        <div className={`${className} flex flex-col items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-800`}>
          <span className="text-[10px] font-bold">^ ^</span>
          <span className="text-[8px] font-semibold">CITROËN</span>
        </div>
      );
    case "bmw":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white`}>
          <div className="w-7 h-7 rounded-full border border-black flex items-center justify-center overflow-hidden">
            <div className="grid grid-cols-2 w-full h-full">
              <div className="bg-blue-600"></div>
              <div className="bg-white"></div>
              <div className="bg-white"></div>
              <div className="bg-blue-600"></div>
            </div>
          </div>
        </div>
      );
    case "mercedes":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900`}>
          <div className="w-7 h-7 rounded-full border border-zinc-800 flex items-center justify-center text-xs font-bold">
            ★
          </div>
        </div>
      );
    case "audi":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white`}>
          <div className="flex -space-x-1">
            <div className="w-3 h-3 rounded-full border border-zinc-800"></div>
            <div className="w-3 h-3 rounded-full border border-zinc-800"></div>
            <div className="w-3 h-3 rounded-full border border-zinc-800"></div>
            <div className="w-3 h-3 rounded-full border border-zinc-800"></div>
          </div>
        </div>
      );
    case "volvo":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white`}>
          <div className="w-7 h-7 rounded-full border-2 border-zinc-800 flex items-center justify-center text-[8px] font-bold">
            VOLVO
          </div>
        </div>
      );
    case "tesla":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white text-red-600 font-extrabold text-sm`}>
          T
        </div>
      );
    case "porsche":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-amber-50 text-amber-800 font-serif font-black text-[10px]`}>
          🛡️
        </div>
      );
    case "lotus":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-yellow-400 text-green-950 font-bold text-[9px] rounded-full`}>
          LOTUS
        </div>
      );
    case "rolls_royce":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 font-serif font-black text-xs`}>
          RR
        </div>
      );
    case "jaguar":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-800 font-semibold text-[8px]`}>
          JAGUAR
        </div>
      );
    case "toyota":
      return (
        <div className={`${className} flex flex-col items-center justify-center rounded-md border border-zinc-200 bg-white text-red-600`}>
          <span className="text-[12px]">⬡</span>
          <span className="text-[7px] font-bold">TOYOTA</span>
        </div>
      );
    case "ather":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-emerald-500 bg-zinc-900 text-emerald-400 font-black text-xs`}>
          ⚡
        </div>
      );
    case "ola":
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-white text-lime-600 font-black text-xs`}>
          OLA
        </div>
      );
    default:
      return (
        <div className={`${className} flex items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-zinc-700 font-bold text-xs uppercase`}>
          {brandId.substring(0, 3)}
        </div>
      );
  }
}

// 3. Model Silhouette Thumbnails (Image 3)
export function VehicleModelThumbnail({ model, className = "w-16 h-10" }) {
  if (model.type === "2wheels") {
    return <VehicleTypeIllustration type="2wheels" className={className} />;
  }
  if (model.type === "3wheels") {
    return <VehicleTypeIllustration type="3wheels" className={className} />;
  }
  if (model.type === "heavy") {
    return <VehicleTypeIllustration type="heavy" className={className} />;
  }
  // 4 Wheels
  return <VehicleTypeIllustration type="4wheels" className={className} />;
}
