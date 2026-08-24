import React, { useState } from 'react';
import {
  Zap,
  Shield,
  Layers,
  Cpu,
  Tv,
  Power,
  Flame,
  Radio,
  Plus,
  Info,
  ChevronRight,
  Sliders,
  Filter,
  Sparkles,
} from 'lucide-react';
import { ComponentCategory, ComponentMetadata, Language } from '../types';
import { COMPONENT_CATALOG } from '../data/componentCatalog';
import { TRANSLATIONS } from '../data/translations';

interface ComponentPaletteProps {
  lang: Language;
  onAddComponent: (meta: ComponentMetadata) => void;
  onOpenNewBreakerCustomizer?: () => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  lang,
  onAddComponent,
  onOpenNewBreakerCustomizer,
}) => {
  const t = TRANSLATIONS[lang];
  const [selectedCat, setSelectedCat] = useState<ComponentCategory>('CIRCUIT_BREAKER');
  const [searchQuery, setSearchQuery] = useState('');
  const [poleFilter, setPoleFilter] = useState<'ALL' | 1 | 2 | 3 | 4>('ALL');

  const categories: { id: ComponentCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'CIRCUIT_BREAKER', label: t.catMcb, icon: <Power className="w-4 h-4" /> },
    { id: 'BUSBAR', label: t.catBusbar, icon: <Radio className="w-4 h-4" /> },
    { id: 'VOLTAGE_RELAY', label: t.catRelay, icon: <Shield className="w-4 h-4" /> },
    { id: 'RCD_DEVICE', label: t.catRcd, icon: <Layers className="w-4 h-4" /> },
    { id: 'RCBO_DEVICE', label: t.catRcbo, icon: <Cpu className="w-4 h-4" /> },
    { id: 'MAINS_INFEED', label: t.catMains, icon: <Zap className="w-4 h-4" /> },
    { id: 'SURGE_PROTECTOR', label: t.catSurge, icon: <Flame className="w-4 h-4" /> },
    { id: 'SMART_DEVICE', label: t.catSmart, icon: <Cpu className="w-4 h-4" /> },
    { id: 'CONSUMER_LOAD', label: t.catLoads, icon: <Tv className="w-4 h-4" /> },
  ];

  const filteredComponents = COMPONENT_CATALOG.filter((comp) => {
    const matchesCategory = comp.category === selectedCat;
    if (poleFilter !== 'ALL' && comp.poles && comp.poles !== poleFilter) {
      return false;
    }
    if (!searchQuery.trim()) return matchesCategory;
    const q = searchQuery.toLowerCase();
    const matchesText =
      comp.nameKa.toLowerCase().includes(q) ||
      comp.nameEn.toLowerCase().includes(q) ||
      comp.descriptionKa.toLowerCase().includes(q) ||
      comp.descriptionEn.toLowerCase().includes(q) ||
      comp.type.toLowerCase().includes(q);
    return matchesText;
  });

  return (
    <aside className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-auto lg:h-[calc(100vh-108px)] shrink-0 select-none overflow-hidden">
      {/* Catalog Search & Category Header */}
      <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-950/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'ka' ? 'კომპონენტების ბიბლიოთეკა' : 'Component Library'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {COMPONENT_CATALOG.length} {lang === 'ka' ? 'მოწყობილობა' : 'items'}
          </span>
        </div>

        {/* Custom Breaker Creator Button */}
        {onOpenNewBreakerCustomizer && (
          <button
            onClick={onOpenNewBreakerCustomizer}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.customBreakerNew}</span>
          </button>
        )}

        {/* Quick Search */}
        <input
          type="text"
          placeholder={lang === 'ka' ? 'ძიება (ავტომატი, შინა, რელე, უზო...)' : 'Search breaker, busbar, relay, RCD...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/80"
        />

        {/* Category Horizontal Scroll / Badges */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCat(cat.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                selectedCat === cat.id && !searchQuery
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Pole Filter Chips for Breakers */}
        {selectedCat === 'CIRCUIT_BREAKER' && (
          <div className="flex items-center gap-1 pt-1 border-t border-slate-800/60">
            <span className="text-[10px] text-slate-500 font-semibold mr-1">
              {lang === 'ka' ? 'პოლუსი:' : 'Poles:'}
            </span>
            {(['ALL', 1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPoleFilter(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  poleFilter === p
                    ? 'bg-slate-700 text-amber-300 border border-amber-400/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'ALL' ? (lang === 'ka' ? 'ყველა' : 'All') : `${p}P`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Component Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            {lang === 'ka' ? 'კომპონენტი ვერ მოიძებნა' : 'No components found'}
          </div>
        ) : (
          filteredComponents.map((comp) => (
            <div
              key={comp.type}
              onClick={() => onAddComponent(comp)}
              className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 rounded-xl p-3 cursor-pointer transition-all shadow-sm hover:shadow-md hover:shadow-amber-500/5 flex flex-col gap-1.5 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform font-bold text-xs">
                    {comp.dinUnits}M
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {lang === 'ka' ? comp.nameKa : comp.nameEn}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      {comp.voltageRatingV && (
                        <span className="font-mono bg-slate-900 px-1 py-0.2 rounded text-slate-300 border border-slate-700 font-semibold">
                          {comp.voltageRatingV}V
                        </span>
                      )}
                      {comp.ratedCurrentA && (
                        <span className="font-mono bg-slate-900 px-1 py-0.2 rounded text-amber-300 border border-slate-700 font-bold">
                          {comp.ratedCurrentA}A
                        </span>
                      )}
                      {comp.poles && (
                        <span className="font-mono bg-slate-900 px-1 py-0.2 rounded text-slate-400 border border-slate-800">
                          {comp.poles}P
                        </span>
                      )}
                      {comp.curve && (
                        <span className="font-mono bg-amber-400/10 text-amber-300 px-1 py-0.2 rounded border border-amber-400/20 font-bold">
                          {comp.curve}
                        </span>
                      )}
                      {comp.breakingCapacityKa && (
                        <span className="font-mono text-slate-500 text-[9px]">
                          {comp.breakingCapacityKa}kA
                        </span>
                      )}
                      {comp.rcdSensitivityMa && (
                        <span className="font-mono bg-emerald-400/10 text-emerald-300 px-1 py-0.2 rounded border border-emerald-400/20 font-bold">
                          Δ {comp.rcdSensitivityMa}mA
                        </span>
                      )}
                      {comp.ratedPowerW && (
                        <span className="font-mono bg-blue-400/10 text-blue-300 px-1 py-0.2 rounded border border-blue-400/20">
                          {comp.ratedPowerW}W
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add button indicator */}
                <button
                  className="w-7 h-7 rounded-lg bg-slate-700/60 group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-300 flex items-center justify-center transition shrink-0"
                  title={lang === 'ka' ? 'ფარზე დამატება' : 'Add to Panel'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                {lang === 'ka' ? comp.descriptionKa : comp.descriptionEn}
              </p>

              {/* Terminal count badge */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-700/40">
                <span>
                  {lang === 'ka' ? 'ტერმინალები:' : 'Terminals:'}{' '}
                  <span className="text-slate-300 font-mono">
                    {comp.terminals.map((t) => t.label || t.id).join(', ')}
                  </span>
                </span>
                <span className="text-amber-400/80 group-hover:text-amber-400 flex items-center gap-0.5">
                  {lang === 'ka' ? 'დამატება' : 'Add'} <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Helpful wiring standard tip footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-300">
            {lang === 'ka' ? 'სტანდარტული მიმდევრობა:' : 'Standard sequence:'}
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">
            {lang === 'ka'
              ? 'შემოსვლა -> მთავარი ავტომატი -> ძაბვის რელე -> უზო -> ნოლის შინა და ჯგუფური ავტომატები.'
              : 'Infeed -> Main Breaker -> Voltage Relay -> RCD -> Neutral Bar & MCBs.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
