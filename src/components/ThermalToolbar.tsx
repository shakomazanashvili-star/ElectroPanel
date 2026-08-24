import React from 'react';
import {
  Flame,
  Activity,
  Sliders,
  Eye,
  EyeOff,
  Layers,
  Thermometer,
  AlertTriangle,
  Zap,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  ComponentThermalData,
  Language,
  PanelThermalState,
  ThermalPalette,
  ThermalRiskLevel,
} from '../types';
import { getThermalColor } from '../engine/thermalEngine';
import { TRANSLATIONS } from '../data/translations';

interface ThermalToolbarProps {
  lang: Language;
  thermalState: PanelThermalState;
  onToggleThermalOverlay: () => void;
  onChangePalette: (palette: ThermalPalette) => void;
  onChangeOpacity: (opacity: number) => void;
  onToggleBadges: () => void;
  onTogglePlumes: () => void;
  onFocusHotspot?: (componentId: string) => void;
}

export const ThermalToolbar: React.FC<ThermalToolbarProps> = ({
  lang,
  thermalState,
  onToggleThermalOverlay,
  onChangePalette,
  onChangeOpacity,
  onToggleBadges,
  onTogglePlumes,
  onFocusHotspot,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const t = TRANSLATIONS[lang];

  const maxTemp = Math.max(85, Math.min(125, thermalState.maxBoardTempC + 10));
  const minTemp = 20;

  // Temperature gradient stops for the legend bar
  const gradientStops = [
    getThermalColor(20, minTemp, maxTemp, thermalState.palette),
    getThermalColor(35, minTemp, maxTemp, thermalState.palette),
    getThermalColor(50, minTemp, maxTemp, thermalState.palette),
    getThermalColor(65, minTemp, maxTemp, thermalState.palette),
    getThermalColor(80, minTemp, maxTemp, thermalState.palette),
    getThermalColor(95, minTemp, maxTemp, thermalState.palette),
    getThermalColor(110, minTemp, maxTemp, thermalState.palette),
  ].join(', ');

  const thermalValues = Object.values(thermalState.componentsThermal) as ComponentThermalData[];
  const criticalCount = thermalValues.filter((c) => c.riskLevel === 'CRITICAL_HOTSPOT').length;
  const warningCount = thermalValues.filter((c) => c.riskLevel === 'OVERHEATING').length;

  return (
    <div className="w-full bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              thermalState.isThermalOverlayActive
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-md shadow-rose-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Flame className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                {lang === 'ka' ? 'თერმული რუკა (FLIR Thermography)' : 'Thermal Intensity Overlay'}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  thermalState.isThermalOverlayActive
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {thermalState.isThermalOverlayActive
                  ? (lang === 'ka' ? 'აქტიური' : 'ACTIVE')
                  : (lang === 'ka' ? 'გათიშული' : 'STANDBY')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {lang === 'ka'
                ? 'ავტომატების ჯოულ-ლენცის გათბობა, ურთიერთგახურება და გადახურების რისკი'
                : 'Joule heating dissipation, mutual thermal coupling & overload risk'}
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Main Thermal Overlay Toggle */}
          <button
            id="toggle-thermal-overlay-btn"
            type="button"
            onClick={onToggleThermalOverlay}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              thermalState.isThermalOverlayActive
                ? 'bg-gradient-to-r from-rose-600 via-amber-500 to-yellow-500 text-slate-950 shadow-rose-500/30 font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-400/40'
            }`}
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>
              {thermalState.isThermalOverlayActive
                ? (lang === 'ka' ? 'თერმული ხედვის გათიშვა' : 'Hide Thermal Map')
                : (lang === 'ka' ? 'თერმული ხედვის ჩართვა' : 'Show Thermal Map')}
            </span>
          </button>

          {/* Expand/Collapse details */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Expand/Collapse settings"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls & Live Thermographic Scale */}
      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-3">
          {/* Top Row: Palette Picker, Opacity, Badges, Heat Plumes */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Palette selection (5 cols) */}
            <div className="md:col-span-5 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                {lang === 'ka' ? 'პალიტრა:' : 'Palette:'}
              </span>
              <div className="grid grid-cols-4 gap-1 flex-1">
                {[
                  { id: 'FLIR_IRONBOW', label: 'FLIR Iron', desc: 'Ironbow' },
                  { id: 'RAINBOW_JET', label: 'Rainbow', desc: 'Jet Spectrum' },
                  { id: 'HEAT_GLOW', label: 'Radiance', desc: 'Heat Glow' },
                  { id: 'HIGH_CONTRAST', label: 'Alert HUD', desc: 'Contrast' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChangePalette(p.id as ThermalPalette)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer text-center truncate ${
                      thermalState.palette === p.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-750 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Slider (3 cols) */}
            <div className="md:col-span-3 flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 shrink-0">
                {lang === 'ka' ? 'გამჭვირვალობა:' : 'Opacity:'}
              </span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={thermalState.opacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono text-amber-300 w-8 text-right">
                {Math.round(thermalState.opacity * 100)}%
              </span>
            </div>

            {/* Badges & Plume Toggles (4 cols) */}
            <div className="md:col-span-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onToggleBadges}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                  thermalState.showTemperatureBadges
                    ? 'bg-slate-800 text-amber-300 border-amber-500/30'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>{lang === 'ka' ? 'ტემპერატურის იარლიყები' : 'Temp Tags'}</span>
              </button>

              <button
                type="button"
                onClick={onTogglePlumes}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                  thermalState.showHeatPlumes
                    ? 'bg-slate-800 text-amber-300 border-amber-500/30'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{lang === 'ka' ? 'რელსის სითბური ველი' : 'Heat Field'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: FLIR Continuous Temperature Gradient Scale & Live Hotspot Stats */}
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            {/* Color Gradient Legend Bar */}
            <div className="flex-1 w-full space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>{minTemp}°C (Ambient)</span>
                <span className="text-yellow-400">55°C (Nominal Continuous)</span>
                <span className="text-orange-400">75°C (Derating Zone)</span>
                <span className="text-rose-400 font-bold">{maxTemp}°C (Hotspot Peak)</span>
              </div>

              {/* The Thermographic Bar */}
              <div
                className="w-full h-3.5 rounded-md shadow-inner border border-slate-700 relative overflow-hidden"
                style={{
                  background: `linear-gradient(to right, ${gradientStops})`,
                }}
              >
                {/* Pointer for Max Board Temperature */}
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-white shadow-md rounded-full -translate-x-1/2 border border-black animate-pulse"
                  style={{
                    left: `${Math.max(
                      5,
                      Math.min(
                        95,
                        ((thermalState.maxBoardTempC - minTemp) / (maxTemp - minTemp)) * 100
                      )
                    )}%`,
                  }}
                  title={`Max board temperature: ${thermalState.maxBoardTempC}°C`}
                />
              </div>
            </div>

            {/* Quick Live Board Summary Metrics */}
            <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
              <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500">{lang === 'ka' ? 'მაქს. ტემპ' : 'Peak Temp'}</div>
                <div
                  className={`font-black ${
                    thermalState.maxBoardTempC >= 85
                      ? 'text-rose-400 animate-pulse'
                      : thermalState.maxBoardTempC >= 65
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {thermalState.maxBoardTempC}°C
                </div>
              </div>

              <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500">{lang === 'ka' ? 'ჯამური სითბო' : 'Heat Loss'}</div>
                <div className="font-bold text-amber-300">
                  {thermalState.totalHeatLossWatts} W
                </div>
              </div>

              {criticalCount > 0 && (
                <div className="bg-rose-950/80 border border-rose-600 px-2.5 py-1.5 rounded-lg text-rose-200 flex items-center gap-1.5 animate-bounce">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="text-[9px] font-bold uppercase">{lang === 'ka' ? 'კრიტიკული' : 'Hotspots'}</div>
                    <div className="text-xs font-black">{criticalCount} {lang === 'ka' ? 'ავტომატი' : 'Breakers'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
