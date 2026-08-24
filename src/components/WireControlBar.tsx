import React from 'react';
import {
  MousePointer,
  Cable,
  Scissors,
  HelpCircle,
  ShieldAlert,
  Info,
  Sliders,
  Sparkles,
  Flame,
} from 'lucide-react';
import {
  ActiveTool,
  Language,
  WireColorType,
  WireGauge,
} from '../types';
import { WIRE_COLORS, WIRE_GAUGES } from '../data/componentCatalog';
import { TRANSLATIONS } from '../data/translations';

interface WireControlBarProps {
  lang: Language;
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  selectedColor: WireColorType;
  onSelectColor: (color: WireColorType) => void;
  selectedGauge: WireGauge;
  onSelectGauge: (gauge: WireGauge) => void;
  wiringStartTerminal: { componentId: string; terminalId: string; type: string } | null;
  onCancelWiring: () => void;
  wireCount: number;
  onOpenConnectionManager?: () => void;
  isThermalActive?: boolean;
  onToggleThermal?: () => void;
}

export const WireControlBar: React.FC<WireControlBarProps> = ({
  lang,
  activeTool,
  onSelectTool,
  selectedColor,
  onSelectColor,
  selectedGauge,
  onSelectGauge,
  wiringStartTerminal,
  onCancelWiring,
  wireCount,
  onOpenConnectionManager,
  isThermalActive,
  onToggleThermal,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-200 shadow-md">
      {/* 1. Left: Main Interactive Tools */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          id="tool-select"
          onClick={() => {
            onCancelWiring();
            onSelectTool('SELECT');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTool === 'SELECT'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="ჩართვა/გამორთვა, გადართვა და მართვა"
        >
          <MousePointer className="w-4 h-4" />
          <span>{t.toolSelect}</span>
        </button>

        <button
          id="tool-wire"
          onClick={() => onSelectTool('WIRE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTool === 'WIRE'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="მავთულის გაყვანა ტერმინალებს შორის"
        >
          <Cable className="w-4 h-4" />
          <span>{t.toolWire}</span>
        </button>

        <button
          id="tool-delete-wire"
          onClick={() => {
            onCancelWiring();
            onSelectTool('DELETE_WIRE');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTool === 'DELETE_WIRE'
              ? 'bg-rose-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
          }`}
          title="მავთულზე დაკლიკებით წაშლა"
        >
          <Scissors className="w-4 h-4" />
          <span>{t.toolDeleteWire}</span>
        </button>
      </div>

      {/* 2. Middle: Wire Colors & Gauge */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Wire Color Palette */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium mr-1">
            {t.wireColor}:
          </span>
          <div className="flex items-center gap-1">
            {WIRE_COLORS.map((wc) => (
              <button
                key={wc.id}
                onClick={() => onSelectColor(wc.type)}
                className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center border cursor-pointer ${
                  selectedColor === wc.type
                    ? 'scale-110 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 border-white'
                    : 'border-slate-700 hover:scale-105 opacity-85 hover:opacity-100'
                }`}
                style={{
                  background:
                    wc.type === 'GROUND_GREEN_YELLOW'
                      ? 'linear-gradient(135deg, #10b981 50%, #facc15 50%)'
                      : wc.hex,
                }}
                title={lang === 'ka' ? `${wc.nameKa} (${wc.recommendedFor})` : `${wc.nameEn} (${wc.recommendedFor})`}
              />
            ))}
          </div>
        </div>

        {/* Wire Gauge Selector (მმ²) */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium mr-1">
            {t.wireGauge}:
          </span>
          <div className="flex items-center gap-1">
            {WIRE_GAUGES.map((g) => (
              <button
                key={g.gauge}
                onClick={() => onSelectGauge(g.gauge)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  selectedGauge === g.gauge
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={lang === 'ka' ? `${g.gauge} მმ² - ${g.recommendedForKa} (მაქს ${g.maxCurrentA}A)` : `${g.gauge} mm² - ${g.recommendedForEn} (Max ${g.maxCurrentA}A)`}
              >
                {g.gauge}
              </button>
            ))}
          </div>
        </div>

        {/* Connection Manager Button */}
        {onOpenConnectionManager && (
          <button
            onClick={onOpenConnectionManager}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-400/50 text-xs font-semibold transition cursor-pointer"
          >
            <Cable className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.connectionManager}</span>
          </button>
        )}

        {/* FLIR Thermal Map Quick Toggle Button */}
        {onToggleThermal && (
          <button
            onClick={onToggleThermal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isThermalActive
                ? 'bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 text-white border-rose-400 shadow-md shadow-rose-900/40 ring-2 ring-rose-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border-slate-700 hover:border-rose-500/40'
            }`}
            title={lang === 'ka' ? 'თერმოგრაფიული ინფრაწითელი რუკის ჩართვა' : 'Toggle FLIR Thermal Map'}
          >
            <Flame className={`w-3.5 h-3.5 ${isThermalActive ? 'text-amber-200 animate-bounce' : 'text-rose-400'}`} />
            <span>{lang === 'ka' ? 'თერმული რუკა' : 'Thermal Map'}</span>
            {isThermalActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* 3. Right: Wire connection status or prompt */}
      <div className="flex items-center gap-2">
        {wiringStartTerminal ? (
          <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg text-xs animate-pulse">
            <Info className="w-3.5 h-3.5" />
            <span>
              {lang === 'ka'
                ? `საწყისი: ${wiringStartTerminal.terminalId} -> დააკლიკეთ მეორე ტერმინალს`
                : `Source: ${wiringStartTerminal.terminalId} -> Click target terminal`}
            </span>
            <button
              onClick={onCancelWiring}
              className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px] cursor-pointer"
            >
              {lang === 'ka' ? 'გაუქმება' : 'Cancel'}
            </button>
          </div>
        ) : activeTool === 'DELETE_WIRE' ? (
          <div className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-lg text-xs">
            <Scissors className="w-3.5 h-3.5" />
            <span>
              {lang === 'ka' ? 'დააკლიკეთ მავთულს მის წასაშლელად' : 'Click any wire to remove it'}
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono hidden md:block">
            {lang === 'ka' ? `გაყვანილია: ${wireCount} მავთული` : `Total Wires: ${wireCount}`}
          </div>
        )}
      </div>
    </div>
  );
};

