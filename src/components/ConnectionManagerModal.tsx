import React, { useState } from 'react';
import {
  X,
  Zap,
  Trash2,
  Plus,
  Cable,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Check,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  Language,
  PlacedComponent,
  WireColorType,
  WireConnection,
  WireGauge,
} from '../types';
import { TRANSLATIONS } from '../data/translations';
import { COMPONENT_CATALOG, WIRE_COLORS, WIRE_GAUGES } from '../data/componentCatalog';

interface ConnectionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  components: PlacedComponent[];
  wires: WireConnection[];
  onAddWire: (
    sourceCompId: string,
    sourceTermId: string,
    targetCompId: string,
    targetTermId: string,
    colorType: WireColorType,
    gauge: WireGauge
  ) => void;
  onDeleteWire: (wireId: string) => void;
  onBatchAutoWire: (type: 'AUTO_NEUTRAL' | 'AUTO_EARTH' | 'AUTO_PHASE') => void;
}

export const ConnectionManagerModal: React.FC<ConnectionManagerModalProps> = ({
  isOpen,
  onClose,
  lang,
  components,
  wires,
  onAddWire,
  onDeleteWire,
  onBatchAutoWire,
}) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  // Selected source & target component and terminals
  const [sourceCompId, setSourceCompId] = useState<string>(components[0]?.id || '');
  const [sourceTermId, setSourceTermId] = useState<string>('');
  const [targetCompId, setTargetCompId] = useState<string>(components[1]?.id || '');
  const [targetTermId, setTargetTermId] = useState<string>('');

  const [selectedColor, setSelectedColor] = useState<WireColorType>('PHASE_BROWN');
  const [selectedGauge, setSelectedGauge] = useState<WireGauge>(2.5);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PHASE' | 'NEUTRAL' | 'GROUND'>('ALL');

  // Source and target component metadata
  const sourceComp = components.find((c) => c.id === sourceCompId);
  const sourceMeta = sourceComp ? COMPONENT_CATALOG.find((m) => m.type === sourceComp.typeId) : null;
  const sourceTerms = sourceMeta?.terminals || [];

  const targetComp = components.find((c) => c.id === targetCompId);
  const targetMeta = targetComp ? COMPONENT_CATALOG.find((m) => m.type === targetComp.typeId) : null;
  const targetTerms = targetMeta?.terminals || [];

  // Filter wires
  const filteredWires = wires.filter((w) => {
    if (categoryFilter === 'PHASE') return w.colorType.startsWith('PHASE');
    if (categoryFilter === 'NEUTRAL') return w.colorType === 'NEUTRAL_BLUE';
    if (categoryFilter === 'GROUND') return w.colorType === 'GROUND_GREEN_YELLOW';
    return true;
  });

  const handleCreateConnection = () => {
    if (!sourceCompId || !sourceTermId || !targetCompId || !targetTermId) return;
    if (sourceCompId === targetCompId && sourceTermId === targetTermId) return;

    onAddWire(sourceCompId, sourceTermId, targetCompId, targetTermId, selectedColor, selectedGauge);
    // Reset terminal selection
    setSourceTermId('');
    setTargetTermId('');
  };

  const getCompName = (compId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return compId;
    return comp.customLabel || comp.typeId;
  };

  const getTermName = (compId: string, termId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return termId;
    const meta = COMPONENT_CATALOG.find((m) => m.type === comp.typeId);
    const term = meta?.terminals.find((t) => t.id === termId);
    return term ? `${term.name} (${term.label || term.type})` : termId;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {t.connectionManager}
                <span className="font-mono text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                  {wires.length} {lang === 'ka' ? 'შეერთება' : 'Wires'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ka'
                  ? 'ავტომატების, ნოლის შემკრებისა და დამიწების შინების შეერთებების განსაზღვრა'
                  : 'Define connections between circuit breakers, neutral bars, and grounding bars'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Batch Connect Bar */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'ka' ? 'სწრაფი შეერთების დამხმარე:' : 'Quick Wiring Actions:'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onBatchAutoWire('AUTO_NEUTRAL')}
              className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-800 hover:bg-blue-900 text-blue-300 text-xs font-medium transition flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {lang === 'ka' ? 'ნოლების შეერთება N-შინაზე' : 'Wire Neutrals to N-Bar'}
            </button>
            <button
              onClick={() => onBatchAutoWire('AUTO_EARTH')}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900 text-emerald-300 text-xs font-medium transition flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {lang === 'ka' ? 'დამიწების შეერთება PE-შინაზე' : 'Wire Earth to Ground-Bar'}
            </button>
            <button
              onClick={() => onBatchAutoWire('AUTO_PHASE')}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800 hover:bg-amber-900 text-amber-300 text-xs font-medium transition flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {lang === 'ka' ? 'ავტომატების შეერთება დატვირთვებზე' : 'Wire Breakers to Loads'}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: New Wire Definition Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4 bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              {lang === 'ka' ? 'ახალი შეერთების შექმნა' : 'Define New Connection'}
            </h3>

            {/* Source Component & Terminal */}
            <div className="space-y-2 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
              <label className="block text-[11px] font-bold text-amber-300 uppercase">
                1. {lang === 'ka' ? 'საწყისი კომპონენტი (Source)' : 'Source Component'}
              </label>
              <select
                value={sourceCompId}
                onChange={(e) => {
                  setSourceCompId(e.target.value);
                  setSourceTermId('');
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customLabel || c.typeId} ({c.typeId})
                  </option>
                ))}
              </select>

              <label className="block text-[10px] text-slate-400 font-semibold">
                {lang === 'ka' ? 'საწყისი ტერმინალი (Pin):' : 'Source Terminal (Pin):'}
              </label>
              <select
                value={sourceTermId}
                onChange={(e) => setSourceTermId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              >
                <option value="">-- {lang === 'ka' ? 'აირჩიეთ ტერმინალი' : 'Select Pin'} --</option>
                {sourceTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} [{t.type}] ({t.label || t.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow Divider */}
            <div className="flex justify-center -my-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Target Component & Terminal */}
            <div className="space-y-2 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
              <label className="block text-[11px] font-bold text-amber-300 uppercase">
                2. {lang === 'ka' ? 'საბოლოო კომპონენტი (Target)' : 'Target Component'}
              </label>
              <select
                value={targetCompId}
                onChange={(e) => {
                  setTargetCompId(e.target.value);
                  setTargetTermId('');
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customLabel || c.typeId} ({c.typeId})
                  </option>
                ))}
              </select>

              <label className="block text-[10px] text-slate-400 font-semibold">
                {lang === 'ka' ? 'საბოლოო ტერმინალი (Pin):' : 'Target Terminal (Pin):'}
              </label>
              <select
                value={targetTermId}
                onChange={(e) => setTargetTermId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              >
                <option value="">-- {lang === 'ka' ? 'აირჩიეთ ტერმინალი' : 'Select Pin'} --</option>
                {targetTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} [{t.type}] ({t.label || t.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Wire Color & Gauge */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                {t.wireColor} & {t.wireGauge}
              </label>
              {/* Color Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                {WIRE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.type)}
                    className={`px-2 py-1.5 rounded-lg border text-left flex items-center gap-1.5 transition ${
                      selectedColor === c.type
                        ? 'border-amber-400 bg-slate-800 text-white font-bold ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                    <span className="text-[10px] truncate">{lang === 'ka' ? c.nameKa : c.nameEn}</span>
                  </button>
                ))}
              </div>

              {/* Gauge Buttons */}
              <div className="flex gap-1 pt-1">
                {WIRE_GAUGES.map((g) => (
                  <button
                    key={g.gauge}
                    type="button"
                    onClick={() => setSelectedGauge(g.gauge)}
                    className={`flex-1 py-1 rounded text-xs font-mono font-bold transition ${
                      selectedGauge === g.gauge
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {g.gauge} mm²
                  </button>
                ))}
              </div>
            </div>

            {/* Connect Button */}
            <button
              type="button"
              disabled={!sourceCompId || !sourceTermId || !targetCompId || !targetTermId}
              onClick={handleCreateConnection}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              {lang === 'ka' ? 'მავთულის შეერთება' : 'Add Wire Connection'}
            </button>
          </div>

          {/* Right: Active Connections List & Filter (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {lang === 'ka' ? 'ყველა' : 'All'} ({wires.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('PHASE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'PHASE'
                      ? 'bg-amber-800 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {lang === 'ka' ? 'ფაზები (L)' : 'Phase (L)'}
                </button>
                <button
                  onClick={() => setCategoryFilter('NEUTRAL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'NEUTRAL'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {lang === 'ka' ? 'ნოლები (N)' : 'Neutral (N)'}
                </button>
                <button
                  onClick={() => setCategoryFilter('GROUND')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    categoryFilter === 'GROUND'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {lang === 'ka' ? 'დამიწება (PE)' : 'Ground (PE)'}
                </button>
              </div>
            </div>

            {/* Connections Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[480px]">
              {filteredWires.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl text-slate-500 text-xs">
                  {lang === 'ka'
                    ? 'შეერთებები ჯერ არ არის. გამოიყენეთ მარცხენა პანელი ან დააკლიკეთ ტერმინალებს ფარზე.'
                    : 'No active connections in this category. Connect components using the form or by clicking pins.'}
                </div>
              ) : (
                filteredWires.map((w) => {
                  const colorObj = WIRE_COLORS.find((c) => c.type === w.colorType);
                  return (
                    <div
                      key={w.id}
                      className="p-3 bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs transition"
                    >
                      {/* Left: Wire indicator & endpoints */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Wire pill */}
                        <div
                          className="w-3.5 h-8 rounded-full shrink-0 flex items-center justify-center border border-white/20"
                          style={{ backgroundColor: colorObj?.hex || '#888' }}
                        />

                        {/* Endpoints */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
                            <span className="text-amber-300 font-bold truncate">
                              {getCompName(w.sourceComponentId)}
                            </span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              [{getTermName(w.sourceComponentId, w.sourceTerminalId)}]
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-emerald-300 font-bold truncate">
                              {getCompName(w.targetComponentId)}
                            </span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              [{getTermName(w.targetComponentId, w.targetTerminalId)}]
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>{w.gauge} mm²</span>
                            <span>•</span>
                            <span style={{ color: colorObj?.hex }}>
                              {lang === 'ka' ? colorObj?.nameKa : colorObj?.nameEn}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete action */}
                      <button
                        type="button"
                        onClick={() => onDeleteWire(w.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition"
                        title={lang === 'ka' ? 'მავთულის წაშლა' : 'Delete Wire'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            {lang === 'ka' ? 'დახურვა' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
