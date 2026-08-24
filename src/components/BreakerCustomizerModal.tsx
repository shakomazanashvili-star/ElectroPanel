import React, { useState } from 'react';
import {
  X,
  Sliders,
  Shield,
  Zap,
  Power,
  Layers,
  Activity,
  Check,
  AlertTriangle,
  Info,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  BreakerCurve,
  BreakerCustomizationSettings,
  Language,
  PlacedComponent,
  ProtectionMechanism,
} from '../types';
import { TRANSLATIONS } from '../data/translations';

interface BreakerCustomizerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  component: PlacedComponent | null;
  lang: Language;
  onSave: (
    componentId: string | null,
    settings: BreakerCustomizationSettings
  ) => void;
}

export const BreakerCustomizerModal: React.FC<BreakerCustomizerModalProps> = ({
  isOpen = true,
  onClose,
  component,
  lang,
  onSave,
}) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  // Initialize form state from existing component settings or defaults
  const existingSettings = component?.breakerSettings;

  const [label, setLabel] = useState<string>(
    component?.customLabel || (lang === 'ka' ? 'ავტომატური ამომრთველი' : 'Circuit Breaker')
  );
  const [voltage, setVoltage] = useState<number>(existingSettings?.voltageRatingV || 230);
  const [currentRating, setCurrentRating] = useState<number>(
    component?.customCurrentA || existingSettings?.ratedCurrentA || 16
  );
  const [poles, setPoles] = useState<number>(existingSettings?.poles || 1);
  const [curve, setCurve] = useState<BreakerCurve>(
    component?.curve || existingSettings?.curve || 'C'
  );
  const [overloadMultiplier, setOverloadMultiplier] = useState<number>(
    existingSettings?.overloadTripMultiplier || 1.13
  );
  const [shortCircuitMultiplier, setShortCircuitMultiplier] = useState<number>(
    existingSettings?.shortCircuitTripMultiplier || (curve === 'B' ? 4 : curve === 'C' ? 7.5 : curve === 'D' ? 14 : 10)
  );
  const [mechanism, setMechanism] = useState<ProtectionMechanism>(
    existingSettings?.protectionMechanism || 'THERMAL_MAGNETIC'
  );
  const [breakingCapacity, setBreakingCapacity] = useState<number>(
    existingSettings?.breakingCapacityKa || 6
  );
  const [frequency, setFrequency] = useState<number>(existingSettings?.operatingFrequencyHz || 50);

  // Virtual test current simulation slider
  const [testCurrentA, setTestCurrentA] = useState<number>(currentRating);

  // Calculated exact trip currents
  const nonTripOverloadA = Number((currentRating * 1.05).toFixed(1));
  const fullOverloadTripA = Number((currentRating * overloadMultiplier * 1.25).toFixed(1));
  const instantaneousTripA = Number((currentRating * shortCircuitMultiplier).toFixed(1));

  // Determine test status
  let testStatus: 'NORMAL' | 'OVERLOAD_WARNING' | 'THERMAL_TRIP' | 'INSTANT_SHORT_TRIP' = 'NORMAL';
  let testTimeSeconds = '∞ (Continuous)';

  if (testCurrentA >= instantaneousTripA) {
    testStatus = 'INSTANT_SHORT_TRIP';
    testTimeSeconds = '< 10 ms (Instantaneous Magnetic Trip)';
  } else if (testCurrentA >= fullOverloadTripA) {
    testStatus = 'THERMAL_TRIP';
    const factor = testCurrentA / currentRating;
    const estSec = Math.max(1, Math.round(120 / (factor * factor - 1)));
    testTimeSeconds = `~${estSec} seconds (Thermal Bimetallic Delay)`;
  } else if (testCurrentA > currentRating) {
    testStatus = 'OVERLOAD_WARNING';
    testTimeSeconds = '~1 - 2 hours (Warm Thermal Zone)';
  }

  // Recommended wire gauge based on rating
  let recommendedWireMm2 = 2.5;
  if (currentRating <= 10) recommendedWireMm2 = 1.5;
  else if (currentRating <= 16) recommendedWireMm2 = 2.5;
  else if (currentRating <= 25) recommendedWireMm2 = 4.0;
  else if (currentRating <= 32) recommendedWireMm2 = 6.0;
  else if (currentRating <= 50) recommendedWireMm2 = 10.0;
  else recommendedWireMm2 = 16.0;

  const handleSave = () => {
    const customized: BreakerCustomizationSettings = {
      customLabel: label,
      voltageRatingV: voltage,
      ratedCurrentA: currentRating,
      poles,
      curve,
      overloadTripMultiplier: overloadMultiplier,
      shortCircuitTripMultiplier: shortCircuitMultiplier,
      protectionMechanism: mechanism,
      breakingCapacityKa: breakingCapacity,
      operatingFrequencyHz: frequency,
    };

    onSave(component ? component.id : null, customized);
    onClose();
  };

  const handleCurveSelect = (selectedCurve: BreakerCurve) => {
    setCurve(selectedCurve);
    if (selectedCurve === 'B') setShortCircuitMultiplier(4);
    else if (selectedCurve === 'C') setShortCircuitMultiplier(7.5);
    else if (selectedCurve === 'D') setShortCircuitMultiplier(14);
    else if (selectedCurve === 'K') setShortCircuitMultiplier(10);
    else if (selectedCurve === 'Z') setShortCircuitMultiplier(2.5);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {component ? t.customizeBreaker : t.customBreakerNew}
                <span className="font-mono text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                  {curve}
                  {currentRating}A ({poles}P)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ka'
                  ? 'დააკონფიგურირეთ ძაბვა, ნომინალური დენი, გადატვირთვისა და მოკლე ჩართვის მრუდები'
                  : 'Configure voltage, current rating, overload trip, short-circuit response & mechanism'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two columns layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Parameter Configuration (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Label & Circuit Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'ka' ? 'ავტომატის იარლიყი / დანიშნულება' : 'Breaker Circuit Label'}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                placeholder={lang === 'ka' ? 'მაგ: სამზარეულოს როზეტები' : 'e.g. Kitchen Sockets'}
              />
            </div>

            {/* 2. Rated Voltage & Poles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t.voltageRating} (V)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[230, 400, 120, 240].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVoltage(v)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                        voltage === v
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t.poles}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPoles(p)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                        poles === p
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {p}P
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Rated Current In (Amperes) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {t.currentRating} In (Amperes)
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {currentRating} A
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {[6, 10, 16, 20, 25, 32, 40, 50, 63, 80].map((amp) => (
                  <button
                    key={amp}
                    type="button"
                    onClick={() => {
                      setCurrentRating(amp);
                      setTestCurrentA(amp);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                      currentRating === amp
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {amp}A
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tripping Curve Selection (B, C, D, K, Z) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t.breakerCurve} (IEC 60898)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'B', name: 'Curve B', mult: '3-5x In', descKa: 'განათება, გრძელი ხაზები', descEn: 'Lighting, long cables' },
                  { id: 'C', name: 'Curve C', mult: '5-10x In', descKa: 'საყოფაცხოვრებო როზეტები', descEn: 'General sockets' },
                  { id: 'D', name: 'Curve D', mult: '10-20x In', descKa: 'ძრავები, ტრანსფორმატორები', descEn: 'Motors, inductive' },
                  { id: 'K', name: 'Curve K', mult: '8-12x In', descKa: 'სამრეწველო ძრავები', descEn: 'Industrial motors' },
                  { id: 'Z', name: 'Curve Z', mult: '2-3x In', descKa: 'მგრძნობიარე ელექტრონიკა', descEn: 'Semiconductors' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCurveSelect(c.id as BreakerCurve)}
                    className={`p-2 rounded-xl text-left border flex flex-col justify-between transition cursor-pointer ${
                      curve === c.id
                        ? 'bg-amber-400/15 border-amber-400 text-amber-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs">{c.name}</span>
                    <span className="font-mono text-[10px] text-amber-400/90">{c.mult}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Protection Mechanism */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t.protectionMechanism}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'THERMAL_MAGNETIC',
                    name: t.mechThermalMagnetic,
                    desc: 'Bimetal overload + Solenoid short-circuit',
                  },
                  {
                    id: 'ELECTRONIC_LSI',
                    name: t.mechElectronicLsi,
                    desc: 'Microprocessor LSI adjustable curve',
                  },
                  {
                    id: 'HYDRAULIC_MAGNETIC',
                    name: t.mechHydraulicMagnetic,
                    desc: 'Precision temperature-independent',
                  },
                  {
                    id: 'RESIDUAL_OVERCURRENT',
                    name: t.mechResidualCurrent,
                    desc: 'Combined RCBO overcurrent + RCD',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMechanism(m.id as ProtectionMechanism)}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                      mechanism === m.id
                        ? 'bg-amber-400/15 border-amber-400 text-amber-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200">{m.name}</div>
                    <div className="text-[10px] text-slate-400">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Overload & Short Circuit Multipliers Fine-Tuning */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              {/* Overload Multiplier */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">{t.overloadTripCurrent}:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {overloadMultiplier}x ({fullOverloadTripA} A)
                  </span>
                </div>
                <input
                  type="range"
                  min="1.05"
                  max="1.45"
                  step="0.01"
                  value={overloadMultiplier}
                  onChange={(e) => setOverloadMultiplier(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Thermal trip band (1.05x - 1.45x In)
                </span>
              </div>

              {/* Short Circuit Multiplier */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">{t.shortCircuitTripCurrent}:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {shortCircuitMultiplier}x ({instantaneousTripA} A)
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="0.5"
                  value={shortCircuitMultiplier}
                  onChange={(e) => setShortCircuitMultiplier(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Instantaneous magnetic threshold (Im)
                </span>
              </div>
            </div>

            {/* 7. Breaking Capacity (kA) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t.breakingCapacity} Icu (kA)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[4.5, 6, 10, 15].map((ka) => (
                  <button
                    key={ka}
                    type="button"
                    onClick={() => setBreakingCapacity(ka)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                      breakingCapacity === ka
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {ka} kA ({ka * 1000}A)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Tripping Curve Simulator & Spec Badge (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Live Interactive Trip Simulator */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  {t.tripSimulation}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  IEC 60947-2
                </span>
              </div>

              {/* Current Injection Slider */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">{t.simulatedLoadCurrent}:</span>
                  <div className="text-right font-mono">
                    <span className="text-lg font-black text-amber-300">{testCurrentA} A</span>
                    <span className="text-xs text-slate-500 ml-1">
                      ({(testCurrentA / currentRating).toFixed(1)}x In)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={Math.max(100, Math.round(instantaneousTripA * 1.5))}
                  step="1"
                  value={testCurrentA}
                  onChange={(e) => setTestCurrentA(Number(e.target.value))}
                  className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />

                {/* Quick Injection Buttons */}
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setTestCurrentA(Math.round(currentRating * 0.8))}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer"
                  >
                    80% In
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestCurrentA(Math.round(currentRating * 1.2))}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300 cursor-pointer"
                  >
                    120% (Overload)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestCurrentA(Math.round(instantaneousTripA * 1.1))}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-rose-300 cursor-pointer"
                  >
                    Short-Circuit
                  </button>
                </div>
              </div>

              {/* Simulation Result Box */}
              <div
                className={`p-3 rounded-xl border space-y-1.5 transition-colors ${
                  testStatus === 'INSTANT_SHORT_TRIP'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                    : testStatus === 'THERMAL_TRIP'
                    ? 'bg-amber-950/80 border-amber-600 text-amber-200'
                    : testStatus === 'OVERLOAD_WARNING'
                    ? 'bg-yellow-950/60 border-yellow-600 text-yellow-200'
                    : 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testStatus === 'INSTANT_SHORT_TRIP' ? (
                    <Flame className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                  ) : testStatus === 'THERMAL_TRIP' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-xs font-bold">
                    {testStatus === 'NORMAL'
                      ? (lang === 'ka' ? 'ნორმალური სამუშაო რეჟიმი' : 'Normal Operating State')
                      : testStatus === 'OVERLOAD_WARNING'
                      ? (lang === 'ka' ? 'მცირე გადატვირთვა (თერმული ზონა)' : 'Slight Overload (Warm zone)')
                      : testStatus === 'THERMAL_TRIP'
                      ? (lang === 'ka' ? 'თერმული გადატვირთვის გათიშვა!' : 'Thermal Overload Trip!')
                      : (lang === 'ka' ? 'მოკლე ჩართვის მყისიერი გათიშვა!' : 'Instantaneous Short-Circuit Trip!')}
                  </span>
                </div>
                <div className="text-[11px] font-mono opacity-90">
                  {lang === 'ka' ? 'გამორთვის დრო:' : 'Response Time:'} {testTimeSeconds}
                </div>
              </div>
            </div>

            {/* Breaker Physical Spec Preview Badge */}
            <div className="bg-slate-100 text-slate-900 border border-slate-300 rounded-2xl p-4 shadow-lg space-y-2">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  MCB SPECIFICATION BADGE
                </span>
                <span className="text-[10px] font-bold font-mono text-slate-700">
                  {breakingCapacity}000A 3
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black font-mono tracking-tight text-slate-950">
                    {curve}
                    {currentRating}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">{label || 'Circuit Breaker'}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-slate-800">{voltage}V ~ {frequency}Hz</div>
                  <div className="text-[10px] text-slate-500">{poles}P DIN-Mount</div>
                </div>
              </div>

              {/* Recommended Cable Gauge */}
              <div className="pt-2 border-t border-slate-300/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  {t.recommendedWireGauge}:
                </span>
                <span className="font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  {recommendedWireMm2} mm² Cu
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                {lang === 'ka' ? 'გაუქმება' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {t.applyChanges}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
