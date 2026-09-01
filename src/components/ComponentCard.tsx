import React, { useState } from 'react';
import {
  Settings,
  Trash2,
  Sliders,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Radio,
  Power,
  Flame,
  Tv,
  Shield,
  Cable,
  Check,
  CheckSquare,
  Square,
  Copy,
} from 'lucide-react';
import {
  ActiveTool,
  ComponentMetadata,
  ComponentThermalData,
  Language,
  PlacedComponent,
  SimulationState,
  Terminal,
  ThermalPalette,
} from '../types';
import { COMPONENT_CATALOG } from '../data/componentCatalog';
import { getThermalColor } from '../engine/thermalEngine';

interface ComponentCardProps {
  component: PlacedComponent;
  lang: Language;
  activeTool: ActiveTool;
  simulationState: SimulationState;
  wiringStartTerminal: { componentId: string; terminalId: string; type: string } | null;
  thermalData?: ComponentThermalData;
  isThermalMode?: boolean;
  thermalPalette?: ThermalPalette;
  isSelected?: boolean;
  isMultiSelectMode?: boolean;
  onToggleSelect?: (componentId: string, event: React.MouseEvent) => void;
  onInspectThermal?: (component: PlacedComponent) => void;
  onTerminalClick: (componentId: string, terminal: Terminal) => void;
  onToggleSwitch: (componentId: string) => void;
  onTestRcd: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onDuplicateComponent: (componentId: string) => void;
  onCopyComponent?: (componentId: string) => void;
  onUpdateSettings: (componentId: string, settings: Partial<PlacedComponent>) => void;
  onOpenBreakerCustomizer?: (component: PlacedComponent) => void;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({
  component,
  lang,
  activeTool,
  simulationState,
  wiringStartTerminal,
  thermalData,
  isThermalMode = false,
  thermalPalette = 'FLIR_IRONBOW',
  isSelected = false,
  isMultiSelectMode = false,
  onToggleSelect,
  onInspectThermal,
  onTerminalClick,
  onToggleSwitch,
  onTestRcd,
  onDeleteComponent,
  onDuplicateComponent,
  onCopyComponent,
  onUpdateSettings,
  onOpenBreakerCustomizer,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [customLabelInput, setCustomLabelInput] = useState(component.customLabel);

  const meta = COMPONENT_CATALOG.find((c) => c.type === component.typeId) as ComponentMetadata;
  if (!meta) return null;

  const status = simulationState.componentStatuses[component.id] || {
    isEnergized: false,
    activePowerW: 0,
    currentA: 0,
    voltageV: 0,
    isTripped: component.isTripped,
  };

  const isEnergized = status.isEnergized;
  const isTripped = component.isTripped || status.isTripped;

  // Split terminals into top and bottom
  const topTerminals = meta.terminals.filter((t) => t.position === 'TOP');
  const bottomTerminals = meta.terminals.filter((t) => t.position === 'BOTTOM');

  // DIN unit width calculation (1 DIN ~ 58px in our UI)
  const cardWidthPx = Math.max(82, meta.dinUnits * 56);

  const isConsumerLoad = meta.category === 'CONSUMER_LOAD';
  const isBusbar = meta.category === 'BUSBAR';
  const isRelay = meta.category === 'VOLTAGE_RELAY';
  const isRcd = meta.category === 'RCD_DEVICE' || meta.category === 'RCBO_DEVICE';
  const isBreaker = meta.category === 'CIRCUIT_BREAKER';

  const breakerSettings = component.breakerSettings;
  const displayCurve = component.curve || breakerSettings?.curve || meta.curve || 'C';
  const displayCurrentA = component.customCurrentA || breakerSettings?.ratedCurrentA || meta.ratedCurrentA || 16;
  const displayVoltage = breakerSettings?.voltageRatingV || meta.voltageRatingV || 230;
  const displayBreakingKa = breakerSettings?.breakingCapacityKa || meta.breakingCapacityKa || 6;
  const displayPoles = breakerSettings?.poles || meta.poles || 1;

  // Thermal metrics
  const effectiveTemp = thermalData?.effectiveTempC ?? 25;
  const safePalette: ThermalPalette = (thermalPalette as ThermalPalette) || 'FLIR_IRONBOW';
  const thermalColor = getThermalColor(effectiveTemp, 20, 110, safePalette, 0.85);
  const thermalTintBg = getThermalColor(effectiveTemp, 20, 110, safePalette, 0.35);
  const isHotspot = thermalData?.riskLevel === 'CRITICAL_HOTSPOT' || thermalData?.riskLevel === 'OVERHEATING';

  return (
    <div
      id={`comp-${component.id}`}
      style={{ width: `${cardWidthPx}px` }}
      className="relative shrink-0 flex flex-col items-center justify-between group transition-all duration-150"
    >
      {/* 1. TOP SCREW TERMINALS ROW */}
      <div className="w-full flex items-center justify-around px-1 py-1 z-20">
        {topTerminals.map((term) => {
          const terminalKey = `${component.id}:${term.id}`;
          const termState = simulationState.terminalStates[terminalKey];
          const isSelectedForWiring =
            wiringStartTerminal?.componentId === component.id &&
            wiringStartTerminal?.terminalId === term.id;
          const isTerminalEnergized = termState?.isEnergized;

          return (
            <button
              key={term.id}
              id={`term-${component.id}-${term.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onTerminalClick(component.id, term);
              }}
              className={`relative flex flex-col items-center group/term transition-transform cursor-pointer ${
                isSelectedForWiring
                  ? 'scale-125 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 rounded-full'
                  : 'hover:scale-115'
              }`}
              title={`${term.label || term.name} (${term.type}) - ${
                isTerminalEnergized ? `${termState?.voltageV || 230}V ⚡` : '0V'
              }`}
            >
              {/* Terminal Label */}
              <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-tighter mb-0.5">
                {term.label || term.name}
              </span>

              {/* Screw Head Terminal */}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-inner relative transition-colors ${
                  isTerminalEnergized
                    ? term.type === 'NEUTRAL'
                      ? 'bg-blue-600 border-blue-300 shadow-blue-500/50'
                      : term.type === 'GROUND'
                      ? 'bg-emerald-600 border-emerald-300 shadow-emerald-500/50'
                      : 'bg-amber-600 border-amber-300 shadow-amber-500/50'
                    : 'bg-slate-700 border-slate-500 hover:border-slate-300'
                }`}
              >
                {/* Screw Slot */}
                <div className="w-3 h-0.5 bg-slate-900/80 rounded rotate-45" />

                {/* Live glow dot */}
                {isTerminalEnergized && (
                  <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-amber-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. MAIN DIN DEVICE BODY */}
      <div
        onClick={(e) => {
          if (isMultiSelectMode || activeTool === 'MULTI_SELECT' || e.shiftKey || e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            onToggleSelect?.(component.id, e);
          }
        }}
        className={`w-full rounded-xl border flex flex-col justify-between p-2 shadow-md relative select-none overflow-hidden transition-all ${
          isSelected
            ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-xl shadow-indigo-600/30 border-indigo-400 scale-[1.02] bg-indigo-950/20'
            : isHotspot
            ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950 animate-pulse'
            : ''
        } ${
          isBusbar
            ? meta.type.includes('NEUTRAL')
              ? 'bg-gradient-to-b from-blue-950/90 to-blue-900/70 border-blue-700 text-blue-200'
              : 'bg-gradient-to-b from-emerald-950/90 to-emerald-900/70 border-emerald-700 text-emerald-200'
            : isConsumerLoad
            ? 'bg-slate-800 border-slate-700 text-slate-100'
            : 'bg-slate-100 border-slate-300 text-slate-900 shadow-slate-900/20'
        } ${isMultiSelectMode || activeTool === 'MULTI_SELECT' ? 'cursor-pointer hover:border-indigo-400 hover:shadow-indigo-500/20' : ''}`}
        style={{
          minHeight: isConsumerLoad ? '140px' : '160px',
          ...(isThermalMode
            ? {
                background: `linear-gradient(180deg, ${thermalTintBg} 0%, rgba(15, 23, 42, 0.92) 100%)`,
                borderColor: isSelected ? '#818cf8' : thermalColor,
                color: '#f8fafc',
              }
            : {}),
        }}
      >
        {/* Thermal Glow Light Effect */}
        {isThermalMode && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen transition-opacity"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${thermalColor} 0%, transparent 75%)`,
            }}
          />
        )}
        {/* Device Brand / Model Top Bar */}
        <div className="flex items-center justify-between border-b pb-1 mb-1 border-black/10">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {/* Multi-Select Checkbox Indicator */}
            {(isMultiSelectMode || activeTool === 'MULTI_SELECT' || isSelected) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(component.id, e);
                }}
                className={`p-0.5 rounded transition-transform cursor-pointer flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm scale-110 ring-1 ring-indigo-300'
                    : 'bg-slate-900/60 text-slate-400 hover:text-indigo-300 hover:bg-slate-900 border border-slate-600/60'
                }`}
                title={isSelected ? (lang === 'ka' ? 'მონიშვნის მოხსნა' : 'Deselect') : (lang === 'ka' ? 'მონიშვნა' : 'Select')}
              >
                {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : <Square className="w-3 h-3" />}
              </button>
            )}

            <span
              className={`text-[9px] font-black tracking-wider uppercase truncate ${
                isSelected
                  ? 'text-indigo-400 font-bold'
                  : isBusbar || isConsumerLoad
                  ? 'text-slate-300'
                  : 'text-slate-700'
              }`}
            >
              {meta.category === 'CIRCUIT_BREAKER'
                ? `MCB ${displayPoles}P`
                : meta.category === 'RCD_DEVICE'
                ? `RCD ${displayPoles}P`
                : meta.category === 'RCBO_DEVICE'
                ? 'RCBO'
                : meta.category === 'VOLTAGE_RELAY'
                ? 'V-RELAY'
                : meta.category === 'BUSBAR'
                ? 'BUSBAR'
                : 'LOAD'}
            </span>
          </div>

          {/* Action buttons on hover */}
          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {isThermalMode && onInspectThermal && (
              <button
                type="button"
                onClick={() => onInspectThermal(component)}
                className="p-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                title={lang === 'ka' ? 'თერმოგრაფიული ინსპექცია' : 'Thermal Inspector'}
              >
                <Flame className="w-3 h-3" />
              </button>
            )}

            {isBreaker && onOpenBreakerCustomizer ? (
              <button
                onClick={() => onOpenBreakerCustomizer(component)}
                className="p-0.5 rounded bg-amber-500/20 text-amber-800 hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer"
                title={lang === 'ka' ? 'ავტომატის მორგება (Customizer)' : 'Customize Breaker'}
              >
                <Sliders className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-0.5 rounded hover:bg-black/10 text-slate-600 hover:text-slate-950 cursor-pointer"
                title={lang === 'ka' ? 'პარამეტრები' : 'Settings'}
              >
                <Settings className="w-3 h-3" />
              </button>
            )}

            {onCopyComponent && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyComponent(component.id);
                }}
                className="p-0.5 rounded hover:bg-indigo-500/30 text-indigo-400 hover:text-indigo-200 transition cursor-pointer"
                title={lang === 'ka' ? 'კოპირება (Cmd+C)' : 'Copy (Cmd+C)'}
              >
                <Copy className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => onDeleteComponent(component.id)}
              className="p-0.5 rounded hover:bg-rose-500 hover:text-white text-rose-600 transition"
              title={lang === 'ka' ? 'წაშლა' : 'Delete'}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Live Thermal Badge Tag when in Thermal Mode */}
        {isThermalMode && thermalData && (
          <div
            onClick={() => onInspectThermal && onInspectThermal(component)}
            className="my-1 py-0.5 px-1.5 rounded-md font-mono text-[10px] font-black flex items-center justify-between shadow-sm cursor-pointer border border-white/20 transition-transform hover:scale-105 z-10"
            style={{
              backgroundColor: thermalColor,
              color: effectiveTemp > 75 ? '#ffffff' : '#0f172a',
            }}
            title={lang === 'ka' ? 'დააკლიკეთ თერმული ანალიზისთვის' : 'Click for thermal breakdown'}
          >
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {effectiveTemp}°C
            </span>
            <span className="text-[8px] font-bold">
              {Math.round(thermalData.loadRatio * 100)}% Iₙ
            </span>
          </div>
        )}

        {/* Device Centerpiece based on category */}
        {isRelay ? (
          /* DIGITAL VOLTAGE RELAY DISPLAY */
          <div className="my-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col items-center justify-center font-mono shadow-inner">
            <div className="text-[9px] text-slate-500 flex justify-between w-full px-0.5">
              <span>VOLT</span>
              <span>AMP</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-base font-black tracking-wider ${
                  status.voltageV === 0
                    ? 'text-slate-600'
                    : status.voltageV < (component.voltageRelaySettings?.minVoltage ?? 175) ||
                      status.voltageV > (component.voltageRelaySettings?.maxVoltage ?? 260)
                    ? 'text-rose-500 animate-pulse'
                    : 'text-emerald-400'
                }`}
              >
                {status.voltageV > 0 ? `${status.voltageV}` : '---'}
                <span className="text-[8px] font-normal text-slate-500 ml-0.5">V</span>
              </span>
              <span className="text-xs font-bold text-amber-400">
                {status.currentA > 0 ? `${status.currentA}` : '0.0'}
                <span className="text-[8px] font-normal text-slate-500 ml-0.5">A</span>
              </span>
            </div>
            <div className="text-[8px] text-slate-400 flex justify-between w-full px-0.5 mt-0.5 pt-0.5 border-t border-slate-800">
              <span>U&lt; {component.voltageRelaySettings?.minVoltage ?? 175}V</span>
              <span>U&gt; {component.voltageRelaySettings?.maxVoltage ?? 260}V</span>
            </div>
          </div>
        ) : isRcd ? (
          /* RCD / УЗО WITH TEST BUTTON & TRIP FLAG */
          <div className="my-1 flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[10px] font-black text-slate-800 font-mono">
                {component.customCurrentA || meta.ratedCurrentA}A
              </span>
              <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1 rounded">
                Δ {meta.rcdSensitivityMa}mA
              </span>
            </div>

            {/* Test Button & Toggle Lever */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTestRcd(component.id)}
                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] shadow active:scale-95 transition"
                title="RCD Test Button (სიმულაციური გაჟონვის ტესტი)"
              >
                TEST
              </button>

              <button
                onClick={() => onToggleSwitch(component.id)}
                className={`w-7 h-10 rounded border flex flex-col items-center justify-between p-0.5 transition-all shadow-inner ${
                  component.isOn && !isTripped
                    ? 'bg-emerald-600 border-emerald-800'
                    : 'bg-slate-700 border-slate-900'
                }`}
                title={component.isOn ? 'ჩართულია (Click to toggle)' : 'გათიშულია'}
              >
                <div
                  className={`w-5 h-4 rounded shadow-md transition-transform flex items-center justify-center text-[8px] font-black text-white ${
                    component.isOn && !isTripped
                      ? 'bg-slate-900 -translate-y-0.5'
                      : 'bg-rose-600 translate-y-3.5'
                  }`}
                >
                  {component.isOn && !isTripped ? 'I' : '0'}
                </div>
              </button>
            </div>
          </div>
        ) : isBreaker ? (
          /* STANDARD / CUSTOM MCB BREAKER SWITCH & RATINGS */
          <div className="my-1 flex flex-col items-center justify-center gap-1">
            <div
              onClick={() => onOpenBreakerCustomizer && onOpenBreakerCustomizer(component)}
              className="text-center font-mono cursor-pointer group/badge hover:bg-amber-400/10 p-0.5 rounded transition"
              title={lang === 'ka' ? 'დააკლიკეთ პარამეტრების მორგებისთვის' : 'Click to customize breaker'}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-base font-black text-slate-900 tracking-tight">
                  {displayCurve}
                  {displayCurrentA}
                </span>
                <Sliders className="w-2.5 h-2.5 text-amber-600 opacity-0 group-hover/badge:opacity-100 transition" />
              </div>
              <div className="text-[8px] text-slate-600 font-bold">
                {displayBreakingKa}kA • {displayVoltage}V~
              </div>
            </div>

            {/* Breaker Physical Toggle Handle */}
            <button
              onClick={() => onToggleSwitch(component.id)}
              className={`w-7 h-11 rounded border flex flex-col items-center justify-between p-0.5 transition-all shadow-inner cursor-pointer ${
                component.isOn && !isTripped
                  ? 'bg-slate-800 border-slate-900'
                  : 'bg-slate-300 border-slate-400'
              }`}
              title={component.isOn ? 'Breaker ON (Click to turn OFF)' : 'Breaker OFF (Click to turn ON)'}
            >
              {/* Trip Indicator Flag Window */}
              <div
                className={`w-4 h-1.5 rounded-xs transition-colors ${
                  component.isOn && !isTripped ? 'bg-emerald-500' : 'bg-rose-600'
                }`}
              />

              {/* Lever Handle */}
              <div
                className={`w-5 h-5 rounded shadow-md transition-all flex items-center justify-center text-[9px] font-black text-white ${
                  component.isOn && !isTripped
                    ? 'bg-amber-600 -translate-y-1'
                    : 'bg-slate-700 translate-y-1'
                }`}
              >
                {component.isOn && !isTripped ? 'I' : '0'}
              </div>
            </button>
          </div>
        ) : isBusbar ? (
          /* BRASS BUSBAR TERMINAL STRIP */
          <div className="my-2 flex flex-col items-center justify-center py-2 px-1">
            <div className="w-full h-3.5 rounded bg-amber-500/90 border border-amber-600 shadow-inner flex items-center justify-around px-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              ))}
            </div>
            <span className="text-[10px] font-mono font-bold mt-1.5 text-center">
              {meta.type.includes('NEUTRAL') ? 'N-DISTRIBUTION' : 'PE-GROUNDING'}
            </span>
          </div>
        ) : isConsumerLoad ? (
          /* CONSUMER LOAD / APPLIANCE TERMINAL (CLEAN INDUSTRIAL DESIGN) */
          <div className="my-2 flex flex-col items-center justify-center gap-1.5 text-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isEnergized
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40 ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 animate-pulse'
                  : 'bg-slate-700/80 text-slate-400 border border-slate-600'
              }`}
            >
              <Tv className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  isEnergized ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                isEnergized ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {isEnergized ? 'ACTIVE' : 'READY'}
              </span>
            </div>
          </div>
        ) : null}

        {/* Bottom Label Tag */}
        <div className="w-full text-center border-t border-black/10 pt-1 mt-auto">
          {isEditingLabel ? (
            <input
              type="text"
              value={customLabelInput}
              autoFocus
              onBlur={() => {
                onUpdateSettings(component.id, { customLabel: customLabelInput });
                setIsEditingLabel(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateSettings(component.id, { customLabel: customLabelInput });
                  setIsEditingLabel(false);
                }
              }}
              onChange={(e) => setCustomLabelInput(e.target.value)}
              className="w-full text-[10px] text-center bg-white text-slate-900 border rounded px-0.5"
            />
          ) : (
            <p
              onClick={() => setIsEditingLabel(true)}
              className={`text-[10px] font-medium truncate cursor-pointer hover:underline ${
                isBusbar || isConsumerLoad ? 'text-slate-300' : 'text-slate-700'
              }`}
              title={lang === 'ka' ? 'დააკლიკეთ სახელის შესაცვლელად' : 'Click to rename'}
            >
              {component.customLabel || (lang === 'ka' ? meta.nameKa : meta.nameEn)}
            </p>
          )}
        </div>
      </div>

      {/* 3. BOTTOM SCREW TERMINALS ROW */}
      <div className="w-full flex items-center justify-around px-1 py-1 z-20">
        {bottomTerminals.map((term) => {
          const terminalKey = `${component.id}:${term.id}`;
          const termState = simulationState.terminalStates[terminalKey];
          const isSelectedForWiring =
            wiringStartTerminal?.componentId === component.id &&
            wiringStartTerminal?.terminalId === term.id;
          const isTerminalEnergized = termState?.isEnergized;

          return (
            <button
              key={term.id}
              id={`term-${component.id}-${term.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onTerminalClick(component.id, term);
              }}
              className={`relative flex flex-col items-center group/term transition-transform cursor-pointer ${
                isSelectedForWiring
                  ? 'scale-125 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 rounded-full'
                  : 'hover:scale-115'
              }`}
              title={`${term.label || term.name} (${term.type}) - ${
                isTerminalEnergized ? `${termState?.voltageV || 230}V ⚡` : '0V'
              }`}
            >
              {/* Screw Head */}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-inner relative transition-colors ${
                  isTerminalEnergized
                    ? term.type === 'NEUTRAL'
                      ? 'bg-blue-600 border-blue-300 shadow-blue-500/50'
                      : term.type === 'GROUND'
                      ? 'bg-emerald-600 border-emerald-300 shadow-emerald-500/50'
                      : 'bg-amber-600 border-amber-300 shadow-amber-500/50'
                    : 'bg-slate-700 border-slate-500 hover:border-slate-300'
                }`}
              >
                {/* Screw Slot */}
                <div className="w-3 h-0.5 bg-slate-900/80 rounded -rotate-45" />

                {isTerminalEnergized && (
                  <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-amber-400" />
                )}
              </div>

              {/* Terminal Label */}
              <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-tighter mt-0.5">
                {term.label || term.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fallback Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                {lang === 'ka' ? 'მოწყობილობის პარამეტრები' : 'Device Settings'}
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Label input */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">
                {lang === 'ka' ? 'დასახელება / იარლიყი' : 'Label Name'}
              </label>
              <input
                type="text"
                value={component.customLabel}
                onChange={(e) =>
                  onUpdateSettings(component.id, { customLabel: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100"
              />
            </div>

            {/* Voltage Relay Cutoff Thresholds */}
            {isRelay && (
              <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  {lang === 'ka' ? 'ძაბვის რელეს დაცვის ზღვრები' : 'Voltage Relay Thresholds'}
                </h4>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">
                      {lang === 'ka' ? 'დაბალი ძაბვის ზღვარი (Min V):' : 'Min Cutoff:'}
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      {component.voltageRelaySettings?.minVoltage ?? 175} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="210"
                    value={component.voltageRelaySettings?.minVoltage ?? 175}
                    onChange={(e) =>
                      onUpdateSettings(component.id, {
                        voltageRelaySettings: {
                          ...(component.voltageRelaySettings || {
                            maxVoltage: 260,
                            delaySeconds: 5,
                          }),
                          minVoltage: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">
                      {lang === 'ka' ? 'მაღალი ძაბვის ზღვარი (Max V):' : 'Max Cutoff:'}
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      {component.voltageRelaySettings?.maxVoltage ?? 260} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="230"
                    max="280"
                    value={component.voltageRelaySettings?.maxVoltage ?? 260}
                    onChange={(e) =>
                      onUpdateSettings(component.id, {
                        voltageRelaySettings: {
                          ...(component.voltageRelaySettings || {
                            minVoltage: 175,
                            delaySeconds: 5,
                          }),
                          maxVoltage: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
                  />
                </div>
              </div>
            )}

            {/* Consumer load power rating */}
            {isConsumerLoad && (
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">
                  {lang === 'ka' ? 'სიმძლავრე (Watts):' : 'Power Rating (Watts):'}
                </label>
                <input
                  type="number"
                  step="50"
                  value={component.customPowerW || meta.ratedPowerW || 1000}
                  onChange={(e) =>
                    onUpdateSettings(component.id, { customPowerW: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300"
              >
                {lang === 'ka' ? 'შენახვა' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
