import React, { useRef } from 'react';
import { Download, Printer, Zap, Layers, Shield, Cpu, FileText } from 'lucide-react';
import { Language, PlacedComponent, SimulationState, WireConnection } from '../types';
import { COMPONENT_CATALOG } from '../data/componentCatalog';

interface SchematicViewProps {
  components: PlacedComponent[];
  wires: WireConnection[];
  lang: Language;
  simulationState: SimulationState;
  onOpenPdfReport?: () => void;
}

export const SchematicView: React.FC<SchematicViewProps> = ({
  components,
  wires,
  lang,
  simulationState,
  onOpenPdfReport,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const catalogMap = new Map(COMPONENT_CATALOG.map((c) => [c.type, c]));

  // Categorize components for schematic layout
  const infeed = components.find((c) => c.typeId.startsWith('MAIN_INCOMING'));
  const mainMcb = components.find((c) => c.typeId === 'MCB_2P_MAIN' || c.typeId === 'MCB_3P_MAIN');
  const vrelay = components.find((c) => c.typeId === 'VOLTAGE_RELAY');
  const rcds = components.filter((c) => c.typeId.startsWith('RCD_') || c.typeId.startsWith('RCBO_'));
  const branchBreakers = components.filter(
    (c) =>
      c.typeId.startsWith('MCB_1P_') ||
      (c.typeId.startsWith('MCB_') && c.id !== mainMcb?.id)
  );
  const nBusbars = components.filter((c) => c.typeId.includes('NEUTRAL_BUSBAR'));
  const peBusbars = components.filter((c) => c.typeId.includes('GROUND_BUSBAR'));
  const loads = components.filter((c) => c.typeId.startsWith('LOAD_'));

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-auto flex flex-col items-center select-none text-slate-100">
      {/* Blueprint Container */}
      <div
        ref={printRef}
        className="w-full max-w-5xl bg-slate-900 border-2 border-slate-700 rounded-3xl p-8 shadow-2xl relative flex flex-col gap-6"
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold tracking-tight">
                {lang === 'ka'
                  ? 'ფარის ერთხაზოვანი პრინციპიალური სქემა'
                  : 'Electrical Single-Line Schematic Diagram'}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              IEC 60617 / EN 61439-1 {lang === 'ka' ? 'სტანდარტების შესაბამისად' : 'Standard Compliance'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPdfReport && (
              <button
                onClick={onOpenPdfReport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{lang === 'ka' ? 'PDF რეპორტი' : 'PDF Report'}</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'ka' ? 'ამობეჭდვა' : 'Print Blueprint'}</span>
            </button>
          </div>
        </div>

        {/* Schematic Circuit Graph Box (SVG Diagram) */}
        <div className="w-full min-h-[420px] bg-slate-950/80 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between font-mono overflow-x-auto">
          {/* 1. Main Infeed & Protection Section */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-6">
            {/* Grid Infeed */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[120px]">
              <Zap className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-xs font-bold text-slate-200">GRID 230V~</span>
              <span className="text-[10px] text-slate-500">1P+N+PE 50Hz</span>
            </div>

            <div className="h-0.5 w-12 bg-amber-500" />

            {/* Main Breaker */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[130px]">
              <span className="text-[10px] text-slate-400">MAIN MCB</span>
              <span className="text-xs font-black text-amber-300">
                {mainMcb ? `${mainMcb.curve || 'C'}${mainMcb.customCurrentA || 40}A 2P` : 'C40A 2P'}
              </span>
              <span className="text-[9px] text-emerald-400">6000A Icu</span>
            </div>

            <div className="h-0.5 w-12 bg-amber-500" />

            {/* Voltage Relay */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[130px]">
              <Shield className="w-4 h-4 text-blue-400 mb-0.5" />
              <span className="text-[10px] text-slate-400">VOLTAGE RELAY</span>
              <span className="text-xs font-black text-blue-300">
                {vrelay ? `175V - 260V` : 'V-Relay 63A'}
              </span>
              <span className="text-[9px] text-slate-500">Auto Reconnect</span>
            </div>

            <div className="h-0.5 w-12 bg-amber-500" />

            {/* RCD (УЗО) */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[130px]">
              <span className="text-[10px] text-rose-400">RCD / УЗО</span>
              <span className="text-xs font-black text-rose-300">
                {rcds.length > 0 ? `${rcds[0].customCurrentA || 40}A / 30mA` : '40A 30mA'}
              </span>
              <span className="text-[9px] text-slate-500">Differential 2P</span>
            </div>
          </div>

          {/* 2. Neutral (N) & Ground (PE) Busbars */}
          <div className="py-4 flex flex-col gap-2">
            {/* Neutral Busbar Rail Line */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-blue-400 w-24">N-BUSBAR:</span>
              <div className="flex-1 h-2 rounded bg-blue-600/60 border border-blue-500 flex items-center justify-around">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
                ))}
              </div>
            </div>

            {/* Ground PE Busbar Rail Line */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-emerald-400 w-24">PE-BUSBAR:</span>
              <div
                className="flex-1 h-2 rounded border border-emerald-500 flex items-center justify-around"
                style={{
                  background: 'linear-gradient(90deg, #10b981 50%, #facc15 50%)',
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                ))}
              </div>
            </div>
          </div>

          {/* 3. Branch Breakers & Connected Consumer Loads */}
          <div className="border-t border-slate-800 pt-6">
            <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
              {lang === 'ka' ? 'განშტოებები და მომხმარებლები' : 'Branch Circuits & Loads'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {branchBreakers.length === 0 ? (
                <div className="col-span-4 text-center py-4 text-slate-500 text-xs">
                  {lang === 'ka' ? 'ავტომატები არ არის დამატებული' : 'No branch breakers added'}
                </div>
              ) : (
                branchBreakers.map((mcb, index) => {
                  const mcbMeta = catalogMap.get(mcb.typeId);
                  const mcbStatus = simulationState.componentStatuses[mcb.id];
                  return (
                    <div
                      key={mcb.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">
                          {`QF${index + 1}`}
                        </span>
                        <span className="text-xs font-black text-amber-300">
                          {mcb.curve || 'C'}
                          {mcb.customCurrentA || mcbMeta?.ratedCurrentA || 16}A
                        </span>
                      </div>

                      <div className="text-xs font-medium text-slate-200 truncate">
                        {mcb.customLabel}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                        <span>
                          {mcbMeta?.ratedCurrentA && mcbMeta.ratedCurrentA <= 10
                            ? '1.5 mm²'
                            : '2.5 mm²'}
                        </span>
                        {mcbStatus?.activePowerW ? (
                          <span className="text-emerald-400 font-bold">
                            {mcbStatus.activePowerW}W
                          </span>
                        ) : (
                          <span className="text-slate-500">Standby</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Blueprint Title Block (ISO Stamp) */}
        <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-700 rounded-xl p-3 bg-slate-950/60 text-xs font-mono gap-2 text-slate-400">
          <div>
            <span className="text-slate-500 block">PROJECT:</span>
            <span className="font-bold text-slate-200">
              ElectroPanel Residential Board
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">SYSTEM:</span>
            <span className="font-bold text-slate-200">
              TN-S / TN-C-S 230V 50Hz Single-Phase
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">RATED CAPACITY:</span>
            <span className="font-bold text-amber-400">
              {(simulationState.totalPowerW / 1000).toFixed(2)} kW | {simulationState.totalCurrentA} A
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
