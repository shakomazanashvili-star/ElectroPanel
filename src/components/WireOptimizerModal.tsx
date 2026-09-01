import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Flame,
  Layers,
  ArrowRight,
  TrendingDown,
  Scale,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2,
  HelpCircle,
} from 'lucide-react';
import { Language, PlacedComponent, WireConnection } from '../types';
import { TRANSLATIONS } from '../data/translations';
import {
  OptimizationConstraints,
  OptimizationMode,
  OptimizationResult,
  getComponentDinUnits,
  isHighThermalComponent,
  optimizeWireLengthAndPlacement,
} from '../engine/wireOptimizerEngine';

interface WireOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: PlacedComponent[];
  wires: WireConnection[];
  numRails: number;
  lang: Language;
  onApplyOptimization: (optimizedComponents: PlacedComponent[]) => void;
}

export const WireOptimizerModal: React.FC<WireOptimizerModalProps> = ({
  isOpen,
  onClose,
  components,
  wires,
  numRails,
  lang,
  onApplyOptimization,
}) => {
  const t = TRANSLATIONS[lang];

  // Mode and Constraints State
  const [mode, setMode] = useState<OptimizationMode>('BALANCED');
  const [lockMainsInfeed, setLockMainsInfeed] = useState<boolean>(true);
  const [enforceThermalClearance, setEnforceThermalClearance] = useState<boolean>(true);
  const [preserveRcdClusters, setPreserveRcdClusters] = useState<boolean>(true);
  const [maxDinUnitsPerRail, setMaxDinUnitsPerRail] = useState<number>(18);
  const [activeTab, setActiveTab] = useState<'METRICS' | 'LAYOUT_PREVIEW' | 'SAFETY_AUDIT'>('METRICS');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Compute optimization result dynamically based on options
  const optimizationResult: OptimizationResult = useMemo(() => {
    return optimizeWireLengthAndPlacement(components, wires, numRails, {
      mode,
      constraints: {
        lockMainsInfeed,
        enforceThermalClearance,
        preserveRcdClusters,
        preservePhaseGroups: true,
        maxDinUnitsPerRail,
      },
    });
  }, [
    components,
    wires,
    numRails,
    mode,
    lockMainsInfeed,
    enforceThermalClearance,
    preserveRcdClusters,
    maxDinUnitsPerRail,
  ]);

  if (!isOpen) return null;

  const { metrics, safetyAudit, optimizedComponents, repositionedCount, executionTimeMs } = optimizationResult;

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      onApplyOptimization(optimizedComponents);
      setIsApplying(false);
      onClose();
    }, 200);
  };

  // Group initial and optimized components by rail for preview
  const getRailsMap = (comps: PlacedComponent[]) => {
    const map: Record<string, PlacedComponent[]> = {};
    comps.forEach((c) => {
      if (!map[c.railId]) map[c.railId] = [];
      map[c.railId].push(c);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => a.positionIndex - b.positionIndex);
    });
    return map;
  };

  const initialRails = getRailsMap(components);
  const optimizedRails = getRailsMap(optimizedComponents);

  const getComponentBadgeColor = (typeId: string) => {
    if (typeId.startsWith('MAIN_INCOMING')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (typeId.includes('SPD') || typeId.includes('SURGE')) return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    if (typeId.includes('VOLTAGE_RELAY')) return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    if (typeId.includes('RCD') || typeId.includes('RCBO')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (typeId.includes('BUSBAR')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    if (typeId.startsWith('LOAD_')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t.wireOptimizerTitle}
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  IEC 61439-1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t.wireOptimizerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('METRICS')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'METRICS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>{t.optBeforeVsAfter}</span>
          </button>
          <button
            onClick={() => setActiveTab('LAYOUT_PREVIEW')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LAYOUT_PREVIEW'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{lang === 'ka' ? 'რელსების განლაგების შედარება' : 'DIN Rail Layout Preview'}</span>
            {repositionedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                {repositionedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('SAFETY_AUDIT')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SAFETY_AUDIT'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.optSafetyAuditTitle}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* 1. Strategy & Mode Selection */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'ka' ? 'ოპტიმიზაციის სტრატეგია' : 'Optimization Strategy'}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Processed in {executionTimeMs}ms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('BALANCED')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'BALANCED'
                    ? 'bg-amber-500/10 border-amber-400/80 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-300">
                    {t.optStrategyBalanced}
                  </span>
                  {mode === 'BALANCED' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === 'ka'
                    ? 'ამცირებს მავთულის სიგრძეს, ინარჩუნებს მთავარ შემომყვანს დასაწყისში და იცავს თერმულ დისტანციას.'
                    : 'Minimizes wire length while preserving supply hierarchy and convection clearance.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('AGGRESSIVE_COPPER_SAVING')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'AGGRESSIVE_COPPER_SAVING'
                    ? 'bg-amber-500/10 border-amber-400/80 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-300">
                    {t.optStrategyAggressive}
                  </span>
                  {mode === 'AGGRESSIVE_COPPER_SAVING' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === 'ka'
                    ? 'მაქსიმალური სპილენძის დაზოგვა 2-Opt ალგორითმით რელსების სრული გადანაწილებით.'
                    : 'Aggressive copper mass minimization across all rails with 2-Opt local search.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('SAME_RAIL_ONLY')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'SAME_RAIL_ONLY'
                    ? 'bg-amber-500/10 border-amber-400/80 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-300">
                    {t.optStrategySameRail}
                  </span>
                  {mode === 'SAME_RAIL_ONLY' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === 'ka'
                    ? 'გადაალაგებს მოწყობილობებს მხოლოდ მიმდინარე რელსის ფარგლებში, რელსებს შორის გადატანის გარეშე.'
                    : 'Reorders components strictly inside their assigned rails without cross-rail moves.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('MULTI_RAIL_DISTRIBUTION')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'MULTI_RAIL_DISTRIBUTION'
                    ? 'bg-amber-500/10 border-amber-400/80 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-300">
                    {t.optStrategyMultiRail}
                  </span>
                  {mode === 'MULTI_RAIL_DISTRIBUTION' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === 'ka'
                    ? 'თანაბრად ანაწილებს მოწყობილობებს ყველა რელსზე ტევადობის მაქსიმალური ბალანსით.'
                    : 'Distributes devices evenly across available DIN rails for optimal packing.'}
                </p>
              </button>
            </div>

            {/* Safety Constraint Toggles */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={lockMainsInfeed}
                  onChange={(e) => setLockMainsInfeed(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                />
                <span>{t.optConstraintLockInfeed}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={enforceThermalClearance}
                  onChange={(e) => setEnforceThermalClearance(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                />
                <span>{t.optConstraintThermal}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={preserveRcdClusters}
                  onChange={(e) => setPreserveRcdClusters(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                />
                <span>{t.optConstraintRcdCluster}</span>
              </label>

              <div className="flex items-center gap-2 text-slate-300">
                <span>{t.optConstraintCapacity}:</span>
                <select
                  value={maxDinUnitsPerRail}
                  onChange={(e) => setMaxDinUnitsPerRail(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono"
                >
                  <option value={12}>12 DIN</option>
                  <option value={18}>18 DIN (Std)</option>
                  <option value={24}>24 DIN</option>
                  <option value={36}>36 DIN</option>
                </select>
              </div>
            </div>
          </div>

          {/* TAB 1: METRICS & KPI COMPARISON */}
          {activeTab === 'METRICS' && (
            <div className="space-y-4">
              {/* Primary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Wire Length */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>{t.optMetricWireLength}</span>
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-white font-mono">
                      {(metrics.afterLengthMm / 1000).toFixed(2)}m
                    </span>
                    <span className="text-xs line-through text-slate-500 font-mono">
                      {(metrics.beforeLengthMm / 1000).toFixed(2)}m
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      -{metrics.lengthSavedPercent}% ({metrics.lengthSavedMm} mm)
                    </span>
                  </div>
                </div>

                {/* Copper Conductor Mass */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>{t.optMetricCopperMass}</span>
                    <Scale className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-amber-300 font-mono">
                      {metrics.afterCopperGrams}g
                    </span>
                    <span className="text-xs line-through text-slate-500 font-mono">
                      {metrics.beforeCopperGrams}g
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {lang === 'ka'
                      ? `დაზოგილია ${metrics.copperGramsSaved}გ სუფთა სპილენძი`
                      : `Saved ${metrics.copperGramsSaved}g of copper`}
                  </div>
                </div>

                {/* Wire Crossings */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>{t.optMetricCrossings}</span>
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-cyan-300 font-mono">
                      {metrics.afterCrossings}
                    </span>
                    <span className="text-xs line-through text-slate-500 font-mono">
                      {metrics.beforeCrossings}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {metrics.crossingsReduced > 0
                      ? lang === 'ka'
                        ? `შემცირდა ${metrics.crossingsReduced}-ით`
                        : `Reduced by ${metrics.crossingsReduced}`
                      : '0 Overlaps'}
                  </div>
                </div>

                {/* Thermal Safety Index */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>{t.optMetricThermalScore}</span>
                    <Flame className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-rose-300 font-mono">
                      {metrics.thermalSafetyScoreAfter}%
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      / 100
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-emerald-400 font-medium">
                    {metrics.thermalSafetyScoreAfter >= 85 ? 'IEC 61439 Pass' : 'Acceptable'}
                  </div>
                </div>
              </div>

              {/* Technical Value Proposition Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 p-4 rounded-xl border border-indigo-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {lang === 'ka' ? 'ელექტრული ეფექტიანობის გაუმჯობესება' : 'Electrical Efficiency Improvements'}
                  </span>
                  <p className="text-slate-400 max-w-xl">
                    {lang === 'ka'
                      ? `მოკლე შეერთებები ამცირებს კარადის შიდა წინაღობას, ძაბვის ვარდნას ~${metrics.voltageDropImprovementPercent}%-ით და ხელს უშლის საკაბელო არხებში სითბოს აკუმულაციას.`
                      : `Shorter runs reduce internal panel loop resistance and voltage drop by ~${metrics.voltageDropImprovementPercent}%, preventing thermal buildup in wiring ducts.`}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-mono font-bold">
                  {repositionedCount} {lang === 'ka' ? 'მოწყობილობა ოპტიმიზირებულია' : 'Devices Repositioned'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIN RAIL LAYOUT PREVIEW (Before vs After) */}
          {activeTab === 'LAYOUT_PREVIEW' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Initial Layout */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="uppercase tracking-wider">
                      {lang === 'ka' ? 'საწყისი განლაგება' : 'Initial Layout'}
                    </span>
                    <span className="font-mono text-slate-500">
                      {(metrics.beforeLengthMm / 1000).toFixed(2)}m Wires
                    </span>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(initialRails).map(([railId, railComps]) => (
                      <div key={railId} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                          <span>{railId}</span>
                          <span>
                            {railComps.reduce((sum, c) => sum + getComponentDinUnits(c.typeId), 0)} / {maxDinUnitsPerRail} DIN
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {railComps.map((c) => (
                            <span
                              key={c.id}
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-medium truncate max-w-[140px] ${getComponentBadgeColor(c.typeId)}`}
                              title={`${c.customLabel} (${c.typeId})`}
                            >
                              {c.customLabel || c.typeId}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimized Layout */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/30 shadow-inner space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span className="uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === 'ka' ? 'ოპტიმიზებული განლაგება' : 'Optimized Layout'}
                    </span>
                    <span className="font-mono text-emerald-300">
                      {(metrics.afterLengthMm / 1000).toFixed(2)}m (-{metrics.lengthSavedPercent}%)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(optimizedRails).map(([railId, railComps]) => (
                      <div key={railId} className="bg-slate-900/90 p-2.5 rounded-lg border border-emerald-500/20">
                        <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                          <span className="text-emerald-300 font-bold">{railId}</span>
                          <span>
                            {railComps.reduce((sum, c) => sum + getComponentDinUnits(c.typeId), 0)} / {maxDinUnitsPerRail} DIN
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {railComps.map((c) => {
                            const orig = components.find((o) => o.id === c.id);
                            const isMoved = orig && (orig.railId !== c.railId || orig.positionIndex !== c.positionIndex);
                            return (
                              <span
                                key={c.id}
                                className={`text-[11px] px-2 py-0.5 rounded-md border font-medium truncate max-w-[140px] flex items-center gap-1 ${getComponentBadgeColor(c.typeId)} ${
                                  isMoved ? 'ring-1 ring-emerald-400/60 font-semibold' : ''
                                }`}
                                title={`${c.customLabel} (${c.typeId})${isMoved ? ' [Repositioned]' : ''}`}
                              >
                                {isMoved && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                {c.customLabel || c.typeId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAFETY CLEARANCE AUDIT */}
          {activeTab === 'SAFETY_AUDIT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{lang === 'ka' ? 'უსაფრთხოების სტანდარტების შემოწმების ანგარიში' : 'Standard Compliance Verification Report'}</span>
                <span className="text-emerald-400 font-bold">IEC 61439-1 / DIN EN 60715</span>
              </div>

              <div className="space-y-2.5">
                {safetyAudit.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      item.status === 'PASS'
                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                        : item.status === 'WARNING'
                        ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                        : 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                    }`}
                  >
                    {item.status === 'PASS' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                    {item.status === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                    {item.status === 'FAIL' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                    <div>
                      <div className="text-xs font-bold text-white mb-0.5">
                        {lang === 'ka' ? item.titleKa : item.titleEn}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {lang === 'ka' ? item.descriptionKa : item.descriptionEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono font-bold text-amber-400">
              {t.optRepositionedCount}: {repositionedCount}
            </span>
            <span>•</span>
            <span className="font-mono text-emerald-400">
              {lang === 'ka' ? `დაზოგილია: ${(metrics.lengthSavedMm / 1000).toFixed(2)}მ` : `Saved: ${(metrics.lengthSavedMm / 1000).toFixed(2)}m`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              {lang === 'ka' ? 'გაუქმება' : 'Cancel'}
            </button>

            <button
              id="btn-apply-wire-optimization"
              onClick={handleApply}
              disabled={isApplying || repositionedCount === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-lg ${
                repositionedCount > 0
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{t.optApplyBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
