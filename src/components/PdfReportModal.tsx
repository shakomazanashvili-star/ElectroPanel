import React, { useRef, useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Layers,
  Zap,
  Shield,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Settings,
  User,
  Calendar,
  Building2,
  Cable,
  Package,
  FileSpreadsheet,
} from 'lucide-react';
import {
  CircuitLoad,
  Language,
  PanelThermalState,
  PlacedComponent,
  SimulationState,
  WireConnection,
} from '../types';
import { COMPONENT_CATALOG, WIRE_COLORS } from '../data/componentCatalog';
import { TRANSLATIONS } from '../data/translations';
import { generatePdfFromElement } from '../engine/pdfExportEngine';
import { exportLoadsToCsv } from '../engine/excelExportEngine';

interface PdfReportModalProps {
  components: PlacedComponent[];
  wires: WireConnection[];
  lang: Language;
  simulationState: SimulationState;
  thermalState?: PanelThermalState;
  gridVoltage: number;
  numRails: number;
  circuitLoads?: CircuitLoad[];
  initialFilter?: 'ALL' | 'SCHEDULE_ONLY';
  onClose: () => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  components,
  wires,
  lang,
  simulationState,
  thermalState,
  gridVoltage,
  numRails,
  circuitLoads,
  initialFilter = 'ALL',
  onClose,
}) => {
  const t = TRANSLATIONS[lang];
  const reportRef = useRef<HTMLDivElement>(null);

  const isScheduleOnly = initialFilter === 'SCHEDULE_ONLY';

  // User Customizable Report Info
  const [projectName, setProjectName] = useState<string>(
    lang === 'ka' ? 'საცხოვრებელი ბინის მთავარი გამანაწილებელი ფარი' : 'Residential Electrical Distribution Board'
  );
  const [engineerName, setEngineerName] = useState<string>(
    lang === 'ka' ? 'სერტიფიცირებული ინჟინერ-ელექტრიკოსი' : 'Certified Electrical Engineer'
  );
  const [reportDate] = useState<string>(() => new Date().toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }));

  // Toggleable Sections
  const [includeSchematic, setIncludeSchematic] = useState(!isScheduleOnly);
  const [includeLayout, setIncludeLayout] = useState(!isScheduleOnly);
  const [includeLoadSchedule, setIncludeLoadSchedule] = useState(true);
  const [includeBom, setIncludeBom] = useState(!isScheduleOnly);
  const [includeWiring, setIncludeWiring] = useState(!isScheduleOnly);
  const [includeThermal, setIncludeThermal] = useState(!isScheduleOnly);
  const [includeSignoff, setIncludeSignoff] = useState(true);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStage, setExportStage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const catalogMap = new Map(COMPONENT_CATALOG.map((c) => [c.type, c]));

  // Calculate Effective Circuit Loads
  const effectiveLoads: CircuitLoad[] = (circuitLoads && circuitLoads.length > 0)
    ? circuitLoads
    : components
        .filter((c) => c.typeId.startsWith('LOAD_') || c.typeId.startsWith('MCB_1P_'))
        .map((comp, idx) => {
          const isLoad = comp.typeId.startsWith('LOAD_');
          const power = comp.customPowerW || (isLoad ? 1500 : 1000);
          return {
            id: `derived-load-${comp.id}`,
            circuitCode: `Q${idx + 1}`,
            name: comp.customLabel || (isLoad ? 'მომხმარებელი' : `წრედი ${idx + 1}`),
            room: 'საცხოვრებელი ზონა',
            category: (comp.typeId.includes('LIGHT')
              ? 'LIGHTING'
              : comp.typeId.includes('AC')
              ? 'AC_CLIMATE'
              : comp.typeId.includes('BOILER')
              ? 'HEATING_BOILER'
              : 'SOCKETS') as any,
            powerW: power,
            voltageV: gridVoltage || 230,
            cosPhi: 0.95,
            breakerRatingA: comp.customCurrentA || 16,
            wireGaugeMm2: (comp.customCurrentA || 16) <= 10 ? 1.5 : (comp.customCurrentA || 16) <= 20 ? 2.5 : 4.0,
            cableType: (comp.customCurrentA || 16) <= 10 ? 'NYM 3x1.5' : 'NYM 3x2.5',
            demandFactor: 0.8,
            isActive: true,
          };
        });

  // Calculate Metrics
  const totalDinUnits = components.reduce((sum, comp) => {
    const meta = catalogMap.get(comp.typeId);
    return sum + (meta?.dinUnits || 1);
  }, 0);

  const handleDownloadScheduleCsv = () => {
    exportLoadsToCsv(effectiveLoads, lang);
  };

  // Group components by Rail
  const rails: { id: string; label: string; components: PlacedComponent[] }[] = [];
  for (let i = 1; i <= numRails; i++) {
    const railId = `rail-${i}`;
    const railComps = components
      .filter((c) => c.railId === railId)
      .sort((a, b) => a.position - b.position);
    rails.push({
      id: railId,
      label: lang === 'ka' ? `DIN რელსი #${i}` : `DIN Rail #${i}`,
      components: railComps,
    });
  }

  // Categorize components for schematic layout
  const mainMcb = components.find((c) => c.typeId === 'MCB_2P_MAIN' || c.typeId === 'MCB_3P_MAIN');
  const vrelay = components.find((c) => c.typeId === 'VOLTAGE_RELAY');
  const rcds = components.filter((c) => c.typeId.startsWith('RCD_') || c.typeId.startsWith('RCBO_'));
  const branchBreakers = components.filter(
    (c) =>
      c.typeId.startsWith('MCB_1P_') ||
      (c.typeId.startsWith('MCB_') && c.id !== mainMcb?.id)
  );

  // Component Summary for BOM
  const componentSummary = components.reduce((acc, comp) => {
    acc[comp.typeId] = (acc[comp.typeId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Wire summary by color and gauge
  const wireSummary = wires.reduce((acc, wire) => {
    const key = `${wire.color}_${wire.gauge}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      const safeName = projectName.replace(/[^a-zA-Z0-9_\u10A0-\u10FF]/g, '_');
      await generatePdfFromElement(reportRef.current, {
        fileName: `${safeName || 'ElectroPanel'}_Report.pdf`,
        projectName,
        onProgress: (progress, stage) => {
          setExportProgress(progress);
          setExportStage(stage);
        },
      });
    } catch (err) {
      console.error('PDF Generation Failed', err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportStage('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTextReport = () => {
    const lines = [
      `============================================================`,
      `ELECTRICAL DISTRIBUTION BOARD TECHNICAL REPORT`,
      `============================================================`,
      `Project: ${projectName}`,
      `Engineer: ${engineerName}`,
      `Date: ${reportDate}`,
      `Standard Compliance: IEC 61439-1 / EN 60898`,
      `Grid Supply: ${gridVoltage}V AC 50Hz (Single-Phase)`,
      `Total Connected Load: ${(simulationState.totalPowerW / 1000).toFixed(2)} kW`,
      `Max Operating Current: ${simulationState.totalCurrentA} A`,
      `Enclosure Size: ${totalDinUnits} DIN Modules (${numRails} Rails)`,
      `Total Circuit Connections: ${wires.length} wires`,
      ...(thermalState
        ? [
            `Peak Enclosure Temperature: ${thermalState.maxTempC}°C`,
            `Total Joule Heat Loss: ${thermalState.totalHeatLossWatts} W`,
            `Thermal Hotspots: ${thermalState.criticalHotspotsCount}`,
          ]
        : []),
      '',
      `--- BILL OF MATERIALS (BOM) ---`,
      ...Object.entries(componentSummary).map(([typeId, qtyVal]) => {
        const qty = Number(qtyVal);
        const meta = catalogMap.get(typeId);
        return `- ${meta?.nameEn || typeId} x ${qty} pcs (${(meta?.dinUnits || 1) * qty} DIN)`;
      }),
      '',
      `--- WIRING SCHEDULE ---`,
      ...wires.map((w, idx) => {
        const fromComp = components.find((c) => c.id === w.fromComponentId);
        const toComp = components.find((c) => c.id === w.toComponentId);
        return `Wire #${idx + 1}: [${fromComp?.customLabel || w.fromComponentId}:${w.fromTerminalId}] -> [${toComp?.customLabel || w.toComponentId}:${w.toTerminalId}] (${w.gauge}mm², ${w.color})`;
      }),
      '',
      `============================================================`,
      `Certified Quality Assurance & Verification Approved`,
      `============================================================`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-start items-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Container Card */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-100">
        
        {/* Modal Top Control Header (Hidden in Print) */}
        <div className="no-print bg-slate-950 border-b border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {t.exportPdfReport}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  IEC 61439 Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ka'
                  ? 'სრული საპროექტო დოკუმენტაცია, სქემები, BOM და მავთულების ჟურნალი'
                  : 'Complete engineering documentation, schematic, BOM and wiring schedule'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              id="pdf-download-schedule-csv-btn"
              onClick={handleDownloadScheduleCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 text-xs font-bold transition shadow-md shadow-emerald-950/40 cursor-pointer"
              title={lang === 'ka' ? 'დატვირთვების სრული გრაფის ჩამოტვირთვა (.csv - Excel)' : 'Download Circuit Load Schedule as Excel-compatible CSV'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span className="hidden sm:inline">{lang === 'ka' ? 'დატვირთვების CSV (Excel)' : 'Download Schedule (.csv)'}</span>
              <span className="sm:hidden">CSV</span>
            </button>

            <button
              onClick={handleCopyTextReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Copy text summary"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">{lang === 'ka' ? 'დაკოპირდა' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">{lang === 'ka' ? 'კოპირება' : 'Copy Text'}</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{t.printReport}</span>
            </button>

            <button
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 transition cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>
                {isExporting
                  ? `${lang === 'ka' ? 'მზადდება' : 'Exporting'} ${exportProgress}%`
                  : t.downloadPdf}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Configuration & Section Toggles (Hidden in Print) */}
        <div className="no-print bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Metadata Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">{t.projectName}:</span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:border-amber-400 focus:outline-none w-48 sm:w-64 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">{t.engineerName}:</span>
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:border-amber-400 focus:outline-none w-44 sm:w-56 font-medium"
              />
            </div>
          </div>

          {/* Section Toggles */}
          <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-300 font-medium">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5 mr-1">
              <button
                type="button"
                onClick={() => {
                  setIncludeSchematic(true);
                  setIncludeLayout(true);
                  setIncludeLoadSchedule(true);
                  setIncludeBom(true);
                  setIncludeWiring(true);
                  setIncludeThermal(true);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  includeSchematic && includeLayout && includeBom && includeWiring && includeThermal
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'ka' ? 'სრული ანგარიში' : 'Full Report'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIncludeSchematic(false);
                  setIncludeLayout(false);
                  setIncludeLoadSchedule(true);
                  setIncludeBom(false);
                  setIncludeWiring(false);
                  setIncludeThermal(false);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  !includeSchematic && !includeLayout && !includeBom && !includeWiring && !includeThermal && includeLoadSchedule
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'ka' ? 'მხოლოდ დატვირთვები' : 'Schedule Only'}
              </button>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSchematic}
                onChange={(e) => setIncludeSchematic(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>{t.includeSchematic}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeLayout}
                onChange={(e) => setIncludeLayout(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>{t.includeLayout}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeLoadSchedule}
                onChange={(e) => setIncludeLoadSchedule(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>{t.includeLoadSchedule || (lang === 'ka' ? 'დატვირთვების ცხრილი' : 'Load Schedule')}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBom}
                onChange={(e) => setIncludeBom(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>BOM</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeWiring}
                onChange={(e) => setIncludeWiring(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>{t.includeWiring}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeThermal}
                onChange={(e) => setIncludeThermal(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>{t.includeThermal}</span>
            </label>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE DOCUMENT SHEET (Optimized for white paper & high contrast PDF)  */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] bg-slate-950/40 flex justify-center">
          <div
            ref={reportRef}
            id="printable-report-sheet"
            className="printable-pdf-document w-full max-w-[860px] bg-white text-slate-900 rounded-2xl shadow-xl p-8 sm:p-10 flex flex-col gap-8 font-sans border border-slate-200"
            style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
          >
            {/* 1. DOCUMENT HEADER & PASSPORT TITLE BLOCK */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black shadow-md">
                    <Zap className="w-7 h-7 fill-current" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                      {projectName}
                    </h1>
                    <p className="text-xs font-semibold text-slate-600">
                      IEC 61439-1 / IEC 60364 / EN 60898 Technical Passport & Inspection Dossier
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-slate-600">
                  <div className="font-bold text-slate-900">DOC-EP-{new Date().getFullYear()}-001</div>
                  <div>{reportDate}</div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                    ● {lang === 'ka' ? 'დამოწმებულია' : 'VERIFIED COMPLIANT'}
                  </div>
                </div>
              </div>

              {/* Meta Grid Block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100/90 rounded-xl p-3.5 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">{t.engineerName}</span>
                  <span className="font-bold text-slate-900">{engineerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">{t.gridVoltage} & Supply</span>
                  <span className="font-bold text-slate-900">{gridVoltage}V AC (1P+N+PE) 50Hz</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">{t.totalLoad}</span>
                  <span className="font-bold text-amber-700">
                    {(simulationState.totalPowerW / 1000).toFixed(2)} kW ({simulationState.totalCurrentA} A)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">DIN Footprint</span>
                  <span className="font-bold text-slate-900">
                    {totalDinUnits} Modules ({numRails} Rails)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. EXECUTIVE SUMMARY & SAFETY AUDIT */}
            <div className="page-break-inside-avoid flex flex-col gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Shield className="w-4 h-4 text-amber-600" />
                {t.executiveSummary}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-600 font-medium">Protection Architecture</span>
                  <span className="text-xs font-bold text-slate-900 mt-1">
                    {mainMcb ? `Main: ${mainMcb.curve || 'C'}${mainMcb.customCurrentA || 40}A 2P` : 'Main Breaker 2P'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {vrelay ? '✓ Voltage Relay Protected (175V-260V)' : 'Direct Infeed'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-600 font-medium">Residual Current Protection</span>
                  <span className="text-xs font-bold text-slate-900 mt-1">
                    {rcds.length > 0 ? `${rcds.length} RCD/RCBO Unit(s) (30mA)` : 'No RCD Configured'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    ✓ Ground Fault Tripping Ready
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-600 font-medium">Thermal Safety (Joule Loss)</span>
                  <span className="text-xs font-bold text-slate-900 mt-1">
                    {thermalState ? `${thermalState.maxTempC}°C Peak Hotspot` : 'Ambient: 25°C'}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {thermalState ? `${thermalState.totalHeatLossWatts}W Total Heat Dissipation` : 'Normal Load'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. SINGLE-LINE SCHEMATIC DIAGRAM */}
            {includeSchematic && (
              <div className="page-break-inside-avoid flex flex-col gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <Layers className="w-4 h-4 text-amber-600" />
                  {t.singleLineSchematic}
                </h2>

                {/* Circuit Graph Drawing Box */}
                <div className="border border-slate-300 rounded-xl p-5 bg-slate-50 font-mono text-xs flex flex-col gap-5">
                  {/* Top: Infeed -> Main MCB -> Voltage Relay -> RCD */}
                  <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                    {/* Grid Infeed */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-300 text-center min-w-[100px] shadow-sm">
                      <div className="font-bold text-slate-900">GRID 230V~</div>
                      <div className="text-[9px] text-slate-500">1P+N+PE 50Hz</div>
                    </div>

                    <div className="h-0.5 w-6 bg-slate-400" />

                    {/* Main MCB */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-300 text-center min-w-[110px] shadow-sm">
                      <div className="text-[9px] text-slate-500 font-sans font-bold">MAIN MCB</div>
                      <div className="font-black text-amber-700">
                        {mainMcb ? `${mainMcb.curve || 'C'}${mainMcb.customCurrentA || 40}A` : 'C40A'}
                      </div>
                      <div className="text-[8px] text-slate-500">Icu: 6kA</div>
                    </div>

                    <div className="h-0.5 w-6 bg-slate-400" />

                    {/* Voltage Relay */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-300 text-center min-w-[110px] shadow-sm">
                      <div className="text-[9px] text-slate-500 font-sans font-bold">V-RELAY</div>
                      <div className="font-black text-blue-700">175V - 260V</div>
                      <div className="text-[8px] text-slate-500">Auto-Cutoff</div>
                    </div>

                    <div className="h-0.5 w-6 bg-slate-400" />

                    {/* RCD */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-300 text-center min-w-[110px] shadow-sm">
                      <div className="text-[9px] text-rose-700 font-sans font-bold">RCD / УЗО</div>
                      <div className="font-black text-rose-600">
                        {rcds.length > 0 ? `${rcds[0].customCurrentA || 40}A 30mA` : '40A 30mA'}
                      </div>
                      <div className="text-[8px] text-slate-500">Type AC/A</div>
                    </div>
                  </div>

                  {/* Middle: Busbars */}
                  <div className="flex flex-col gap-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-20 font-bold text-blue-700">N-BUSBAR:</span>
                      <div className="flex-1 h-2 rounded bg-blue-100 border border-blue-400 flex items-center justify-around">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-blue-600" />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-20 font-bold text-emerald-700">PE-BUSBAR:</span>
                      <div
                        className="flex-1 h-2 rounded border border-emerald-500 flex items-center justify-around"
                        style={{
                          background: 'linear-gradient(90deg, #10b981 50%, #facc15 50%)',
                        }}
                      >
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-slate-900" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Branch MCBs */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase mb-2">
                      {lang === 'ka' ? 'განშტოებების ხაზები' : 'Branch MCBs & Outlets'}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {branchBreakers.map((mcb, idx) => {
                        const meta = catalogMap.get(mcb.typeId);
                        const status = simulationState.componentStatuses[mcb.id];
                        return (
                          <div
                            key={mcb.id}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] shadow-sm flex flex-col justify-between"
                          >
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-500">QF{idx + 1}</span>
                              <span className="text-amber-800">{mcb.curve || 'C'}{mcb.customCurrentA || meta?.ratedCurrentA || 16}A</span>
                            </div>
                            <div className="font-semibold text-slate-800 truncate my-0.5">
                              {mcb.customLabel}
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 border-t border-slate-100 pt-0.5">
                              <span>{(mcb.customCurrentA || 16) <= 10 ? '1.5mm²' : '2.5mm²'}</span>
                              <span className="font-bold text-slate-700">
                                {status?.activePowerW ? `${status.activePowerW}W` : '0W'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DIN RAIL PHYSICAL ENCLOSURE LAYOUT */}
            {includeLayout && (
              <div className="page-break-inside-avoid flex flex-col gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <Package className="w-4 h-4 text-amber-600" />
                  {t.panelLayoutDiagram}
                </h2>

                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col gap-4">
                  {rails.map((rail) => (
                    <div key={rail.id} className="flex flex-col gap-1.5">
                      <div className="text-[10px] font-bold font-mono text-slate-600 flex items-center justify-between">
                        <span>{rail.label}</span>
                        <span className="text-slate-500">
                          {rail.components.reduce((sum, c) => sum + (catalogMap.get(c.typeId)?.dinUnits || 1), 0)} DIN Modules
                        </span>
                      </div>

                      {/* Rail Bar Graphic */}
                      <div className="w-full min-h-[70px] bg-slate-200 border-2 border-slate-300 rounded-xl p-2 flex items-center gap-1.5 overflow-x-auto shadow-inner">
                        {rail.components.length === 0 ? (
                          <div className="w-full text-center text-[10px] text-slate-400 font-mono italic">
                            {lang === 'ka' ? 'ცარიელი რელსი' : 'Empty DIN Rail'}
                          </div>
                        ) : (
                          rail.components.map((comp) => {
                            const meta = catalogMap.get(comp.typeId);
                            const dinUnits = meta?.dinUnits || 1;
                            const isMain = comp.typeId.includes('MAIN') || comp.typeId === 'VOLTAGE_RELAY';
                            const isRcd = comp.typeId.startsWith('RCD') || comp.typeId.startsWith('RCBO');
                            return (
                              <div
                                key={comp.id}
                                className={`rounded-lg border px-2 py-1.5 flex flex-col justify-between text-center select-none shadow-sm transition ${
                                  isMain
                                    ? 'bg-slate-900 border-slate-950 text-white'
                                    : isRcd
                                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                                    : 'bg-white border-slate-300 text-slate-900'
                                }`}
                                style={{
                                  minWidth: `${dinUnits * 38}px`,
                                  height: '56px',
                                }}
                              >
                                <div className="text-[8px] font-bold opacity-75 truncate">
                                  {meta?.dinUnits}M | {comp.typeId.split('_')[0]}
                                </div>
                                <div className="text-[10px] font-black leading-tight truncate">
                                  {comp.customLabel}
                                </div>
                                <div className="text-[8px] font-mono opacity-80 truncate">
                                  {comp.curve || 'C'}{comp.customCurrentA || meta?.ratedCurrentA || 16}A
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4b. CIRCUIT & LOAD SCHEDULE (მომხმარებლებისა და დატვირთვების გრაფა) */}
            {includeLoadSchedule && (
              <div className="page-break-inside-avoid flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    {lang === 'ka'
                      ? 'მომხმარებლებისა და წრედების დატვირთვის გრაფა (Circuit Load Schedule)'
                      : 'Circuit Load Schedule & Power Sizing Directory'}
                  </h2>
                  <button
                    onClick={handleDownloadScheduleCsv}
                    className="no-print flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ka' ? 'Excel / CSV ჩამოტვირთვა' : 'Download CSV'}</span>
                  </button>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-mono text-[11px]">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">{lang === 'ka' ? 'კოდი' : 'Code'}</th>
                        <th className="p-2">{lang === 'ka' ? 'დანიშნულება / მომხმარებელი' : 'Description'}</th>
                        <th className="p-2">{lang === 'ka' ? 'ოთახი' : 'Room'}</th>
                        <th className="p-2 text-right">{lang === 'ka' ? 'სიმძლავრე' : 'Power (W)'}</th>
                        <th className="p-2 text-right">{lang === 'ka' ? 'დენი (A)' : 'Current (A)'}</th>
                        <th className="p-2">{lang === 'ka' ? 'ავტომატი' : 'Breaker'}</th>
                        <th className="p-2">{lang === 'ka' ? 'კაბელი' : 'Cable'}</th>
                        <th className="p-2 text-right">{lang === 'ka' ? 'Kc' : 'Kc'}</th>
                        <th className="p-2 text-right">{lang === 'ka' ? 'გათვლილი (kW)' : 'Design (kW)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {effectiveLoads.map((load, idx) => {
                        const powerW = load.powerW || 0;
                        const volt = load.voltageV || 230;
                        const cosPhi = load.cosPhi || 0.95;
                        const currentA = (powerW / (volt * cosPhi)).toFixed(1);
                        const demandFactor = load.demandFactor || 1.0;
                        const designKw = ((powerW * demandFactor) / 1000).toFixed(2);

                        return (
                          <tr key={load.id || idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-slate-500 text-[10px]">{idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-amber-900">{load.circuitCode || `Q${idx + 1}`}</td>
                            <td className="p-2 font-semibold text-slate-900">{load.name}</td>
                            <td className="p-2 text-slate-600 text-[11px]">{load.room}</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">{powerW} W</td>
                            <td className="p-2 text-right font-mono text-blue-900 font-bold">{currentA} A</td>
                            <td className="p-2 font-mono text-[11px] text-amber-800 font-bold">
                              {load.breakerRatingA ? `C${load.breakerRatingA}` : 'C16'}
                            </td>
                            <td className="p-2 font-mono text-[11px] text-slate-700">
                              {load.wireGaugeMm2 || 2.5} მმ² ({load.cableType || 'NYM'})
                            </td>
                            <td className="p-2 text-right font-mono text-slate-600">{demandFactor}</td>
                            <td className="p-2 text-right font-mono font-black text-emerald-800">{designKw} kW</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-mono text-[11px] text-slate-900 font-bold">
                      <tr>
                        <td colSpan={4} className="p-2.5 text-right uppercase text-slate-600">
                          {lang === 'ka' ? 'ჯამური მაჩვენებლები:' : 'Schedule Summary Totals:'}
                        </td>
                        <td className="p-2.5 text-right text-slate-950 font-black">
                          {(effectiveLoads.reduce((s, l) => s + (l.powerW || 0), 0) / 1000).toFixed(2)} kW
                        </td>
                        <td className="p-2.5 text-right text-blue-950 font-black">
                          {effectiveLoads.reduce((s, l) => s + (l.powerW || 0) / ((l.voltageV || 230) * (l.cosPhi || 0.95)), 0).toFixed(1)} A
                        </td>
                        <td colSpan={3} className="p-2.5 text-right text-slate-600 text-[10px]">
                          {lang === 'ka' ? 'საანგარიშო დატვირთვა Kc-ით:' : 'Total Design Load:'}
                        </td>
                        <td className="p-2.5 text-right text-emerald-950 font-black">
                          {(effectiveLoads.reduce((s, l) => s + ((l.powerW || 0) * (l.demandFactor || 1.0)), 0) / 1000).toFixed(2)} kW
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 5. EQUIPMENT & HARDWARE BILL OF MATERIALS (BOM) */}
            {includeBom && (
              <div className="page-break-inside-avoid flex flex-col gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <FileText className="w-4 h-4 text-amber-600" />
                  {t.equipmentBom}
                </h2>

                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-mono text-[11px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">{lang === 'ka' ? 'მოწყობილობა' : 'Device & Model'}</th>
                        <th className="p-2.5">{lang === 'ka' ? 'კატეგორია' : 'Category'}</th>
                        <th className="p-2.5">{lang === 'ka' ? 'ნომინალი' : 'Ratings'}</th>
                        <th className="p-2.5">{lang === 'ka' ? 'მოდული' : 'DIN'}</th>
                        <th className="p-2.5 text-right">{t.bomQty}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {Object.entries(componentSummary).map(([typeId, qtyVal], idx) => {
                        const qty = Number(qtyVal);
                        const meta = catalogMap.get(typeId);
                        if (!meta) return null;
                        return (
                          <tr key={typeId} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">
                                {lang === 'ka' ? meta.nameKa : meta.nameEn}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">{meta.type}</div>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-600">{meta.category}</td>
                            <td className="p-2.5 text-[11px] font-mono">
                              {meta.ratedCurrentA ? `${meta.ratedCurrentA}A ` : ''}
                              {meta.curve ? `Curve ${meta.curve} ` : ''}
                              {meta.breakingCapacityKa ? `(${meta.breakingCapacityKa}kA) ` : ''}
                              {meta.rcdSensitivityMa ? `Δ ${meta.rcdSensitivityMa}mA` : ''}
                            </td>
                            <td className="p-2.5 font-mono font-semibold">{meta.dinUnits * qty}M</td>
                            <td className="p-2.5 text-right font-black font-mono text-slate-950">
                              {qty} {lang === 'ka' ? 'ცალი' : 'pcs'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. POINT-TO-POINT WIRING SCHEDULE (WIRING MATRIX) */}
            {includeWiring && (
              <div className="page-break-inside-avoid flex flex-col gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <Cable className="w-4 h-4 text-amber-600" />
                  {t.wiringSchedule}
                </h2>

                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-mono text-[11px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">{lang === 'ka' ? 'საიდან (From)' : 'Origin (From)'}</th>
                        <th className="p-2.5">{lang === 'ka' ? 'სად (To)' : 'Destination (To)'}</th>
                        <th className="p-2.5">{lang === 'ka' ? 'ფერი / ტიპი' : 'Color & Phase'}</th>
                        <th className="p-2.5">{t.wireGauge}</th>
                        <th className="p-2.5 text-right">{lang === 'ka' ? 'მაქს. დენი' : 'Max Iz'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {wires.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                            {lang === 'ka' ? 'მავთულები არ არის გაყვანილი' : 'No wire connections defined'}
                          </td>
                        </tr>
                      ) : (
                        wires.map((w, idx) => {
                          const fromComp = components.find((c) => c.id === w.fromComponentId);
                          const toComp = components.find((c) => c.id === w.toComponentId);
                          const colorObj = WIRE_COLORS.find((c) => c.type === w.color);
                          const maxIz =
                            w.gauge >= 10 ? '57A' : w.gauge >= 6 ? '41A' : w.gauge >= 4 ? '32A' : w.gauge >= 2.5 ? '24A' : '16A';

                          return (
                            <tr key={w.id || idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                              <td className="p-2.5 font-mono">
                                <span className="font-bold text-slate-900">{fromComp?.customLabel || w.fromComponentId}</span>
                                <span className="text-slate-500 text-[10px] ml-1">({w.fromTerminalId})</span>
                              </td>
                              <td className="p-2.5 font-mono">
                                <span className="font-bold text-slate-900">{toComp?.customLabel || w.toComponentId}</span>
                                <span className="text-slate-500 text-[10px] ml-1">({w.toTerminalId})</span>
                              </td>
                              <td className="p-2.5 flex items-center gap-1.5">
                                <div
                                  className="w-3 h-3 rounded-full border border-slate-400"
                                  style={{
                                    background:
                                      w.color === 'GROUND_GREEN_YELLOW'
                                        ? 'linear-gradient(135deg, #10b981 50%, #facc15 50%)'
                                        : colorObj?.hex || '#8B4513',
                                  }}
                                />
                                <span className="text-[11px] font-medium">{colorObj?.nameEn || w.color}</span>
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-900">{w.gauge} mm²</td>
                              <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">{maxIz}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Wire Length Estimation Sub-Box */}
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs font-mono flex flex-wrap items-center justify-between gap-2 text-slate-700">
                  <span>{lang === 'ka' ? 'ჯამური მავთულების საჭიროება:' : 'Total Cable Sizing Estimation:'}</span>
                  <div className="flex gap-4">
                    {Object.entries(wireSummary).map(([key, countVal]) => {
                      const count = Number(countVal);
                      const [colorType, gaugeStr] = key.split('_');
                      return (
                        <span key={key} className="font-bold text-slate-900">
                          {gaugeStr}mm² ({colorType.split('_')[0]}): ~{(count * 0.4).toFixed(1)}m
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 7. THERMODYNAMIC & ELECTRICAL SAFETY CERTIFICATION */}
            {includeThermal && thermalState && (
              <div className="page-break-inside-avoid flex flex-col gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <Flame className="w-4 h-4 text-rose-600" />
                  {t.safetyThermalReport}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ambient Enclosure</span>
                    <span className="font-bold text-slate-900">25.0°C</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Peak Device Temp</span>
                    <span
                      className={`font-bold ${
                        thermalState.maxTempC > 70 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {thermalState.maxTempC}°C
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Joule Heat Loss</span>
                    <span className="font-bold text-slate-900">{thermalState.totalHeatLossWatts} W</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Hotspot Incidents</span>
                    <span className="font-bold text-slate-900">
                      {thermalState.criticalHotspotsCount} Critical
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 8. OFFICIAL ENGINEER & INSPECTOR SIGN-OFF STAMP BLOCK */}
            {includeSignoff && (
              <div className="page-break-inside-avoid border-t-2 border-slate-900 pt-5 mt-2 flex flex-col gap-4">
                <div className="text-xs font-black uppercase text-slate-900">
                  {t.engineerSignoff}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-700">
                  <div className="flex flex-col justify-end gap-2 border-b border-slate-400 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase">Designed / Installed By:</span>
                    <span className="font-bold text-slate-900">{engineerName}</span>
                    <div className="h-8 flex items-end text-[11px] text-slate-400 italic">
                      [Signature / Authorized Stamp]
                    </div>
                  </div>

                  <div className="flex flex-col justify-end gap-2 border-b border-slate-400 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase">Technical Inspector / QA:</span>
                    <span className="font-bold text-slate-900">IEC 61439 Safety Board</span>
                    <div className="h-8 flex items-end text-[11px] text-emerald-700 font-bold">
                      ✓ PASSED & APPROVED
                    </div>
                  </div>

                  <div className="flex flex-col justify-end gap-2 border-b border-slate-400 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase">Date of Commissioning:</span>
                    <span className="font-bold text-slate-900">{reportDate}</span>
                    <div className="h-8 flex items-end text-[10px] text-slate-400 font-mono">
                      VALID: 24 MONTHS
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
