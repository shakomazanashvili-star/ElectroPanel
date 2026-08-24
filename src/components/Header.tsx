import React from 'react';
import {
  Zap,
  RotateCcw,
  Download,
  Upload,
  LayoutGrid,
  FileText,
  Sliders,
  Sparkles,
  Layers,
  Trash2,
  CheckCircle2,
  Globe,
  SlidersHorizontal,
  Monitor,
} from 'lucide-react';
import { Language, PanelConfig } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { PRESETS } from '../data/presets';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  activeView: 'PANEL' | 'SCHEMATIC' | 'BOM';
  onChangeView: (view: 'PANEL' | 'SCHEMATIC' | 'BOM') => void;
  gridPowerOn: boolean;
  onTogglePower: () => void;
  gridVoltage: number;
  onChangeGridVoltage: (v: number) => void;
  onSelectPreset: (preset: PanelConfig) => void;
  onClearAll: () => void;
  onAutoWire: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPdfReport?: () => void;
  onOpenWindowsModal?: () => void;
  totalPowerW: number;
  totalCurrentA: number;
  hasAlerts: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  activeView,
  onChangeView,
  gridPowerOn,
  onTogglePower,
  gridVoltage,
  onChangeGridVoltage,
  onSelectPreset,
  onClearAll,
  onAutoWire,
  onExportJson,
  onImportJson,
  onOpenPdfReport,
  onOpenWindowsModal,
  totalPowerW,
  totalCurrentA,
  hasAlerts,
}) => {
  const t = TRANSLATIONS[lang];
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 shadow-lg select-none">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-black text-xl">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                ElectroPanel
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-400/10 text-amber-300 border border-amber-400/30">
                  {lang === 'ka' ? 'ფარის კონსტრუქტორი' : 'Workbench v2.5'}
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
          <button
            id="view-btn-panel"
            onClick={() => onChangeView('PANEL')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'PANEL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{t.buildMode}</span>
          </button>
          <button
            id="view-btn-schematic"
            onClick={() => onChangeView('SCHEMATIC')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'SCHEMATIC'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.schematicMode}</span>
          </button>
          <button
            id="view-btn-bom"
            onClick={() => onChangeView('BOM')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'BOM'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.specificationMode}</span>
          </button>
        </div>

        {/* Right: Master Power Toggle, Preset selector, Language & Actions */}
        <div className="flex items-center gap-2">
          {/* Master Grid Switch */}
          <button
            id="master-grid-power-toggle"
            onClick={onTogglePower}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md active:scale-95 ${
              gridPowerOn
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                : 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900/80 shadow-rose-950/50'
            }`}
            title={gridPowerOn ? t.turnOffPower : t.turnOnPower}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                gridPowerOn
                  ? 'bg-white animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span>
              {gridPowerOn ? `${gridVoltage}V ⚡ ${t.turnOffPower}` : `0V ❌ ${t.turnOnPower}`}
            </span>
          </button>

          {/* Preset Selector Dropdown */}
          <div className="relative group">
            <button
              id="presets-dropdown-button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">{t.presets}</span>
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                {t.presets}
              </div>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPreset(p)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/70 hover:text-amber-300 transition flex flex-col gap-0.5"
                >
                  <span className="font-medium">{lang === 'ka' ? p.name : p.name}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">
                    {lang === 'ka' ? p.descriptionKa : p.descriptionEn}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Auto Wire Helper */}
          <button
            id="btn-auto-wire"
            onClick={onAutoWire}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            title={t.autoRoute}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">{t.autoRoute}</span>
          </button>

          {/* PDF Report Export */}
          {onOpenPdfReport && (
            <button
              id="btn-pdf-report"
              onClick={onOpenPdfReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-yellow-300/20 hover:from-amber-500/30 hover:to-yellow-300/30 text-amber-300 border border-amber-400/40 text-xs font-semibold transition cursor-pointer shadow-sm"
              title={t.exportPdfReport}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-bold">{lang === 'ka' ? 'PDF რეპორტი' : 'PDF Report'}</span>
            </button>
          )}

          {/* Windows Desktop & Auto-Update */}
          {onOpenWindowsModal && (
            <button
              id="btn-windows-app"
              onClick={onOpenWindowsModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-400/30 text-xs font-semibold transition cursor-pointer shadow-sm"
              title={t.windowsApp}
            >
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline font-bold">{lang === 'ka' ? 'Windows (.EXE)' : 'Windows App'}</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            id="btn-export-json"
            onClick={onExportJson}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={t.exportProject}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Import JSON */}
          <button
            id="btn-import-json"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title={t.importProject}
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onImportJson}
            className="hidden"
          />

          {/* Clear All */}
          <button
            id="btn-clear-panel"
            onClick={onClearAll}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
            title={t.clearAll}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Language Switch */}
          <button
            id="btn-language-toggle"
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
            title="Switch Language (ქართული / English)"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang === 'ka' ? 'GEO' : 'ENG'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Header: Live Voltage & Diagnostics Quick Bar */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Voltage Tester Slider (To test under/over voltage cutoffs of Voltage Relay!) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.gridVoltage}:</span>
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                gridVoltage < 175 || gridVoltage > 260
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {gridVoltage} V
            </span>
          </div>
          <input
            id="grid-voltage-slider"
            type="range"
            min="140"
            max="290"
            step="1"
            value={gridVoltage}
            onChange={(e) => onChangeGridVoltage(Number(e.target.value))}
            className="w-32 sm:w-44 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            (140V–290V {lang === 'ka' ? 'ტესტირება' : 'Test'})
          </span>
        </div>

        {/* Live Power Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">{t.totalLoad}:</span>
            <span className="font-bold text-amber-400">
              {(totalPowerW / 1000).toFixed(2)} kW
            </span>
            <span className="text-[11px] text-slate-500">({totalPowerW} W)</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">{t.activeCurrent}:</span>
            <span className="font-bold text-emerald-400">{totalCurrentA} A</span>
          </div>

          {hasAlerts && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px]">
              <span className="animate-pulse font-bold">⚠️ {lang === 'ka' ? 'გაფრთხილება' : 'Alert'}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
