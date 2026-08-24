import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  Activity,
  Gauge,
  Cpu,
  Power,
} from 'lucide-react';
import { Language, SimulationState } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface DiagnosticsPanelProps {
  lang: Language;
  simulationState: SimulationState;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  lang,
  simulationState,
}) => {
  const t = TRANSLATIONS[lang];
  const { safetyAlerts, totalPowerW, totalCurrentA, gridVoltageL1, gridPowerOn } =
    simulationState;

  const criticalAlerts = safetyAlerts.filter((a) => a.level === 'CRITICAL');
  const warningAlerts = safetyAlerts.filter((a) => a.level === 'WARNING');
  const infoAlerts = safetyAlerts.filter((a) => a.level === 'INFO');

  const hasCritical = criticalAlerts.length > 0;
  const hasWarning = warningAlerts.length > 0;

  return (
    <div className="w-full lg:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-auto lg:h-[calc(100vh-108px)] shrink-0 select-none overflow-hidden">
      {/* Diagnostics Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {lang === 'ka' ? 'დიაგნოსტიკა და უსაფრთხოება' : 'Diagnostics & Safety'}
          </h2>
        </div>
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            !gridPowerOn
              ? 'bg-slate-500'
              : hasCritical
              ? 'bg-rose-500 animate-ping'
              : hasWarning
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}
        />
      </div>

      {/* Main Meters & Status Card */}
      <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/50">
        {/* Status Banner */}
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            !gridPowerOn
              ? 'bg-slate-800/80 border-slate-700 text-slate-400'
              : hasCritical
              ? 'bg-rose-950/70 border-rose-700 text-rose-200'
              : hasWarning
              ? 'bg-amber-950/70 border-amber-700 text-amber-200'
              : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
          }`}
        >
          {!gridPowerOn ? (
            <Power className="w-5 h-5 text-slate-500 shrink-0" />
          ) : hasCritical ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
          ) : hasWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}

          <div>
            <div className="font-bold">
              {!gridPowerOn
                ? t.masterSwitch + ' OFF'
                : hasCritical
                ? t.statusDanger
                : hasWarning
                ? t.statusWarning
                : t.statusSafe}
            </div>
            <div className="text-[10px] opacity-80 font-mono">
              {gridVoltageL1}V | {(totalPowerW / 1000).toFixed(2)} kW | {totalCurrentA} A
            </div>
          </div>
        </div>

        {/* 3-Gauge Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {t.totalLoad}
            </span>
            <span className="font-black text-amber-400 text-sm">
              {(totalPowerW / 1000).toFixed(2)}{' '}
              <span className="text-[10px] font-normal text-slate-500">kW</span>
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              {t.activeCurrent}
            </span>
            <span className="font-black text-emerald-400 text-sm">
              {totalCurrentA}{' '}
              <span className="text-[10px] font-normal text-slate-500">A</span>
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Safety Alerts Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>{lang === 'ka' ? 'შეტყობინებები' : 'Safety Alerts'}</span>
          <span className="text-slate-500 font-mono text-[10px]">
            {safetyAlerts.length}
          </span>
        </div>

        {safetyAlerts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <p>{lang === 'ka' ? 'ყველა პარამეტრი ნორმაშია' : 'All parameters are normal'}</p>
          </div>
        ) : (
          safetyAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                alert.level === 'CRITICAL'
                  ? 'bg-rose-950/60 border-rose-700/80 text-rose-200'
                  : alert.level === 'WARNING'
                  ? 'bg-amber-950/60 border-amber-700/80 text-amber-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {alert.level === 'CRITICAL' ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : alert.level === 'WARNING' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span>{lang === 'ka' ? alert.titleKa : alert.titleEn}</span>
              </div>
              <p className="text-[11px] text-slate-300/90 leading-snug">
                {lang === 'ka' ? alert.descriptionKa : alert.descriptionEn}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Electrical Code & Safety Standards Reference */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
        <div className="font-bold text-slate-300 uppercase tracking-wider">
          {lang === 'ka' ? 'უსაფრთხოების სტანდარტები:' : 'Safety Reference:'}
        </div>
        <ul className="space-y-0.5 list-disc list-inside text-slate-400">
          <li>{lang === 'ka' ? 'განათება: 10A (1.5 მმ²)' : 'Lighting: 10A (1.5 mm²)'}</li>
          <li>{lang === 'ka' ? 'როზეტები: 16A (2.5 მმ²)' : 'Sockets: 16A (2.5 mm²)'}</li>
          <li>{lang === 'ka' ? 'სველი წერტილები: RCD 10/30mA' : 'Wet zones: RCD 10/30mA'}</li>
          <li>{lang === 'ka' ? 'მთავარი კაბელი: 40-63A (10 მმ²)' : 'Main Infeed: 40-63A (10 mm²)'}</li>
        </ul>
      </div>
    </div>
  );
};
