import React from 'react';
import {
  X,
  Flame,
  Thermometer,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  ComponentMetadata,
  ComponentThermalData,
  Language,
  PlacedComponent,
  ThermalPalette,
} from '../types';
import { COMPONENT_CATALOG } from '../data/componentCatalog';
import { getThermalColor } from '../engine/thermalEngine';

interface ThermalInspectorModalProps {
  component: PlacedComponent | null;
  thermalData: ComponentThermalData | null;
  palette: ThermalPalette;
  lang: Language;
  onClose: () => void;
}

export const ThermalInspectorModal: React.FC<ThermalInspectorModalProps> = ({
  component,
  thermalData,
  palette,
  lang,
  onClose,
}) => {
  if (!component || !thermalData) return null;

  const meta = COMPONENT_CATALOG.find((c) => c.type === component.typeId) as ComponentMetadata;
  const temp = thermalData.effectiveTempC;
  const minTemp = 20;
  const maxTemp = 110;
  const tempColorHex = getThermalColor(temp, minTemp, maxTemp, palette);

  const ratedA = component.customCurrentA || meta?.ratedCurrentA || 16;
  const loadPercentage = Math.round(thermalData.loadRatio * 100);
  const effectiveCapacityA = Number((ratedA * thermalData.deratingFactor).toFixed(1));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md border border-white/20"
              style={{ backgroundColor: tempColorHex }}
            >
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {component.customLabel}
                </h2>
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded-full font-bold text-white shadow-sm border border-white/20"
                  style={{ backgroundColor: tempColorHex }}
                >
                  {temp}°C
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'ka'
                  ? 'თერმოგრაფიული ანალიზი, ჯოულის დანაკარგი და დერეიტინგი'
                  : 'Thermographic inspection, dissipation breakdown & derating'}
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

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Temperature & Risk Alert Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              thermalData.riskLevel === 'CRITICAL_HOTSPOT'
                ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                : thermalData.riskLevel === 'OVERHEATING'
                ? 'bg-amber-950/80 border-amber-600 text-amber-200'
                : thermalData.riskLevel === 'ELEVATED'
                ? 'bg-yellow-950/60 border-yellow-600 text-yellow-200'
                : 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
            }`}
          >
            {thermalData.riskLevel === 'CRITICAL_HOTSPOT' || thermalData.riskLevel === 'OVERHEATING' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-sm">
                {thermalData.riskLevel === 'CRITICAL_HOTSPOT'
                  ? (lang === 'ka' ? 'კრიტიკული თერმული გადახურება!' : 'Critical Thermal Hotspot Detected!')
                  : thermalData.riskLevel === 'OVERHEATING'
                  ? (lang === 'ka' ? 'თერმული გაფრთხილება: მაღალი ტემპერატურა' : 'Thermal Overheating Risk')
                  : thermalData.riskLevel === 'ELEVATED'
                  ? (lang === 'ka' ? 'მომატებული სამუშაო ტემპერატურა' : 'Elevated Operating Temperature')
                  : (lang === 'ka' ? 'ნორმალური უსაფრთხო თერმული რეჟიმი' : 'Normal Safe Thermal State')}
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {lang === 'ka'
                  ? thermalData.hotspotWarningKa || 'მოწყობილობის ტემპერატურა დასაშვებ ნორმაშია და სრულად შეესაბამება IEC 60898 სტანდარტს.'
                  : thermalData.hotspotWarningEn || 'Component operating well within safe continuous temperature thresholds according to IEC 60898.'}
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500">{lang === 'ka' ? 'ჯამური ტემპერატურა' : 'Effective Temp'}</div>
              <div className="text-lg font-black text-amber-300 mt-1">{temp}°C</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500">{lang === 'ka' ? 'დატვირთვის დონე' : 'Current Load'}</div>
              <div className="text-lg font-black text-slate-100 mt-1">{loadPercentage}%</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500">{lang === 'ka' ? 'სითბოს გამოყოფა' : 'Heat Dissipation'}</div>
              <div className="text-lg font-black text-rose-300 mt-1">{thermalData.heatDissipationWatts} W</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500">{lang === 'ka' ? 'დერეიტინგის კოეფ.' : 'Derated In'}</div>
              <div className="text-lg font-black text-cyan-300 mt-1">{effectiveCapacityA} A</div>
            </div>
          </div>

          {/* Detailed Thermal Breakdown (Physics & Standards) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ka' ? 'ტემპერატურის კომპონენტური დაშლა' : 'Thermal Rise Breakdown'}</span>
            </div>

            <div className="space-y-2 text-slate-300 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{lang === 'ka' ? 'გარემო / რელსის ტემპერატურა (Tambient):' : 'Enclosure Ambient Base:'}</span>
                <span className="font-bold">{thermalData.ambientTempC}°C</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{lang === 'ka' ? 'ჯოულის თვითგახურება (ΔT self = I²·R):' : 'Joule Self-Heating (ΔT self):'}</span>
                <span className="font-bold text-amber-400">+{thermalData.temperatureRiseDeltaC}°C</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{lang === 'ka' ? 'მეზობელი ავტომატებისგან გადაცემა (ΔT mutual):' : 'Mutual Neighbor Heating (ΔT mutual):'}</span>
                <span className="font-bold text-rose-400">+{thermalData.mutualHeatingDeltaC}°C</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-sm">
                <span className="text-slate-200">{lang === 'ka' ? 'საბოლოო სამუშაო ტემპერატურა:' : 'Total Operating Temperature:'}</span>
                <span style={{ color: tempColorHex }}>{temp}°C</span>
              </div>
            </div>
          </div>

          {/* IEC 60898 Derating Explanation */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ka' ? 'IEC 60898 / IEC 61439 დერეიტინგის წესი' : 'IEC 60898 & 61439 Thermal Derating Standard'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {lang === 'ka'
                ? `ავტომატური ამომრთველების ნომინალი კალიბრირებულია 30°C ტემპერატურაზე. 
                   ფარში ტემპერატურის მატებასთან ერთად ბიმეტალური ფირფიტა უფრო ადრე იხრება, რის გამოც ${ratedA}A ნომინალი რეალურად მცირდება ${effectiveCapacityA}A-მდე (${(thermalData.deratingFactor * 100).toFixed(0)}%).`
                : `Circuit breakers are calibrated at 30°C ambient. In enclosed distribution panels, higher internal temperatures reduce continuous capacity from ${ratedA}A down to ${effectiveCapacityA}A (${(thermalData.deratingFactor * 100).toFixed(0)}%).`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            {lang === 'ka' ? 'დახურვა' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
