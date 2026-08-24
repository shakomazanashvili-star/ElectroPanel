import React, { useRef, useState } from 'react';
import { Plus, Trash2, Layers, Cpu, Radio, Shield, Zap, Flame } from 'lucide-react';
import {
  ActiveTool,
  Language,
  PanelThermalState,
  PlacedComponent,
  SimulationState,
  Terminal,
  ThermalPalette,
  WireColorType,
  WireConnection,
  WireGauge,
} from '../types';
import { ComponentCard } from './ComponentCard';
import { WiringCanvas } from './WiringCanvas';
import { ThermalToolbar } from './ThermalToolbar';
import { ThermalOverlay } from './ThermalOverlay';
import { ThermalInspectorModal } from './ThermalInspectorModal';
import { TRANSLATIONS } from '../data/translations';

interface DinRailPanelProps {
  components: PlacedComponent[];
  wires: WireConnection[];
  numRails: number;
  onAddRail: () => void;
  onRemoveRail: (railIndex: number) => void;
  lang: Language;
  activeTool: ActiveTool;
  simulationState: SimulationState;
  wiringStartTerminal: { componentId: string; terminalId: string; type: string } | null;
  selectedColor: WireColorType;
  selectedGauge: WireGauge;
  thermalState?: PanelThermalState;
  onToggleThermalOverlay?: () => void;
  onChangeThermalPalette?: (palette: ThermalPalette) => void;
  onChangeThermalOpacity?: (opacity: number) => void;
  onToggleThermalBadges?: () => void;
  onToggleThermalPlumes?: () => void;
  onInspectThermal?: (component: PlacedComponent) => void;
  onTerminalClick: (componentId: string, terminal: Terminal) => void;
  onToggleSwitch: (componentId: string) => void;
  onTestRcd: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onDuplicateComponent: (componentId: string) => void;
  onUpdateSettings: (componentId: string, settings: Partial<PlacedComponent>) => void;
  onDeleteWire: (wireId: string) => void;
  onOpenCatalogForRail: (railId: string) => void;
  onOpenBreakerCustomizer?: (component: PlacedComponent) => void;
}

export const DinRailPanel: React.FC<DinRailPanelProps> = ({
  components,
  wires,
  numRails,
  onAddRail,
  onRemoveRail,
  lang,
  activeTool,
  simulationState,
  wiringStartTerminal,
  selectedColor,
  selectedGauge,
  thermalState,
  onToggleThermalOverlay,
  onChangeThermalPalette,
  onChangeThermalOpacity,
  onToggleThermalBadges,
  onToggleThermalPlumes,
  onInspectThermal,
  onTerminalClick,
  onToggleSwitch,
  onTestRcd,
  onDeleteComponent,
  onDuplicateComponent,
  onUpdateSettings,
  onDeleteWire,
  onOpenCatalogForRail,
  onOpenBreakerCustomizer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalInspectingComp, setInternalInspectingComp] = useState<PlacedComponent | null>(null);
  const t = TRANSLATIONS[lang];

  const inspectingComp = internalInspectingComp;
  const isThermalActive = thermalState?.isThermalOverlayActive ?? false;

  const handleInspect = (comp: PlacedComponent) => {
    if (onInspectThermal) {
      onInspectThermal(comp);
    } else {
      setInternalInspectingComp(comp);
    }
  };

  // Group components by rail
  const rails: { id: string; label: string; components: PlacedComponent[] }[] = [];
  for (let i = 1; i <= numRails; i++) {
    const railId = `rail-${i}`;
    rails.push({
      id: railId,
      label: `${t.rail} #${i}`,
      components: components.filter((c) => c.railId === railId),
    });
  }

  return (
    <div className="flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto flex flex-col items-center relative select-none">
      {/* Outer Distribution Board Enclosure Chassis */}
      <div
        ref={containerRef}
        className="w-full max-w-6xl min-w-[720px] bg-slate-900/90 border-2 border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col gap-8 backdrop-blur-md"
      >
        {/* Thermal Toolbar Overlay Controls */}
        {thermalState && onToggleThermalOverlay && onChangeThermalPalette && onChangeThermalOpacity && onToggleThermalBadges && onToggleThermalPlumes && (
          <div className="z-30 w-full flex justify-center -mb-2">
            <ThermalToolbar
              lang={lang}
              thermalState={thermalState}
              onToggleOverlay={onToggleThermalOverlay}
              onChangePalette={onChangeThermalPalette}
              onChangeOpacity={onChangeThermalOpacity}
              onToggleBadges={onToggleThermalBadges}
              onTogglePlumes={onToggleThermalPlumes}
            />
          </div>
        )}

        {/* Wiring SVG Overlay */}
        <WiringCanvas
          wires={wires}
          activeTool={activeTool}
          simulationState={simulationState}
          wiringStartTerminal={wiringStartTerminal}
          selectedColor={selectedColor}
          selectedGauge={selectedGauge}
          onDeleteWire={onDeleteWire}
          containerRef={containerRef}
        />

        {/* Thermodynamic Heat Plume & Radiation SVG Overlay */}
        {thermalState && isThermalActive && (
          <ThermalOverlay
            components={components}
            thermalState={thermalState}
            containerRef={containerRef}
            palette={thermalState.palette}
            opacity={thermalState.opacity}
            showPlumes={thermalState.showHeatPlumes}
            showBadges={thermalState.showTemperatureBadges}
            onSelectComponent={handleInspect}
          />
        )}

        {/* Board Enclosure Header with Screw Rivets */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400">
                DISTRIBUTION ENCLOSURE IP40 / IEC 60947 & 60898
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono border border-slate-700">
                {components.length} {lang === 'ka' ? 'მოწყობილობა' : 'Devices'} | {wires.length} {lang === 'ka' ? 'მავთული' : 'Wires'}
              </span>
              {thermalState && isThermalActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 font-mono border border-rose-700/80 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  FLIR MAX: {thermalState.maxTempC}°C
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddRail}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addRail}</span>
            </button>
            <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
          </div>
        </div>

        {/* RENDER EACH DIN RAIL */}
        {rails.map((rail, idx) => (
          <div key={rail.id} className="relative flex flex-col gap-2 z-10">
            {/* Rail Label & Actions */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                {rail.label}
              </span>

              {numRails > 1 && (
                <button
                  onClick={() => onRemoveRail(idx + 1)}
                  className="text-slate-500 hover:text-rose-400 text-[11px] flex items-center gap-1 transition cursor-pointer"
                  title={t.removeRail}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t.removeRail}</span>
                </button>
              )}
            </div>

            {/* Physical Metallic DIN Rail Backplate & Slots */}
            <div className="relative min-h-[200px] bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center shadow-inner overflow-x-auto">
              {/* Metallic Perforated DIN Rail Track (35mm Standard) */}
              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-9 bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 rounded border border-slate-500 shadow-inner flex items-center justify-between px-4 opacity-30 pointer-events-none">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="w-3 h-4 bg-slate-800/80 rounded-xs border border-slate-600/60" />
                ))}
              </div>

              {/* Placed Components on this DIN Rail */}
              <div className="relative z-10 flex items-center gap-2 min-w-full">
                {rail.components.length === 0 ? (
                  <div className="w-full flex flex-col items-center justify-center py-6 text-slate-500 text-xs border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="mb-2">{t.emptyRail}</p>
                    <button
                      onClick={() => onOpenCatalogForRail(rail.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addComponent}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {rail.components.map((comp) => (
                      <ComponentCard
                        key={comp.id}
                        component={comp}
                        lang={lang}
                        activeTool={activeTool}
                        simulationState={simulationState}
                        wiringStartTerminal={wiringStartTerminal}
                        thermalData={thermalState?.componentsThermal[comp.id]}
                        isThermalMode={isThermalActive}
                        thermalPalette={thermalState?.palette}
                        onInspectThermal={handleInspect}
                        onTerminalClick={onTerminalClick}
                        onToggleSwitch={onToggleSwitch}
                        onTestRcd={onTestRcd}
                        onDeleteComponent={onDeleteComponent}
                        onDuplicateComponent={onDuplicateComponent}
                        onUpdateSettings={onUpdateSettings}
                        onOpenBreakerCustomizer={onOpenBreakerCustomizer}
                      />
                    ))}

                    {/* Quick Add Button at end of rail */}
                    <button
                      onClick={() => onOpenCatalogForRail(rail.id)}
                      className="shrink-0 w-12 h-36 rounded-xl border-2 border-dashed border-slate-700/80 hover:border-amber-400/80 text-slate-500 hover:text-amber-300 flex flex-col items-center justify-center gap-1 transition-colors group cursor-pointer bg-slate-900/40"
                      title={t.addComponent}
                    >
                      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">
                        {lang === 'ka' ? '+ დამატება' : '+ Add'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Bottom Corner Screw Rivets & Helpful wiring tip */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 z-10 text-[11px] text-slate-500">
          <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
          <div className="font-mono">
            {lang === 'ka'
              ? '💡 რჩევა: დააკლიკეთ ტერმინალებს მავთულის გასაყვანად (L: ყავისფერი, N: ლურჯი, PE: მწვანე-ყვითელი)'
              : '💡 Tip: Click terminals to draw wires (L: Brown, N: Blue, PE: Green-Yellow)'}
          </div>
          <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
        </div>
      </div>

      {/* Internal Thermal Inspector Modal */}
      {inspectingComp && thermalState && (
        <ThermalInspectorModal
          component={inspectingComp}
          thermalData={thermalState.componentsThermal[inspectingComp.id]}
          lang={lang}
          palette={thermalState.palette}
          onClose={() => setInternalInspectingComp(null)}
        />
      )}
    </div>
  );
};

