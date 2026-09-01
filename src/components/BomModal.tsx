import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Copy,
  Download,
  Check,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Language, PlacedComponent, SimulationState, WireConnection } from '../types';
import { COMPONENT_CATALOG, WIRE_COLORS, WIRE_GAUGES } from '../data/componentCatalog';
import { TRANSLATIONS } from '../data/translations';

interface BomModalProps {
  components: PlacedComponent[];
  wires: WireConnection[];
  lang: Language;
  simulationState: SimulationState;
  onOpenPdfReport?: () => void;
}

export const BomModal: React.FC<BomModalProps> = ({
  components,
  wires,
  lang,
  simulationState,
  onOpenPdfReport,
}) => {
  const [copied, setCopied] = React.useState(false);
  const t = TRANSLATIONS[lang];
  const catalogMap = new Map(COMPONENT_CATALOG.map((c) => [c.type, c]));

  // Aggregate components by type
  const componentSummary = components.reduce((acc, comp) => {
    acc[comp.typeId] = (acc[comp.typeId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Aggregate wires by color and gauge (estimating ~0.35m per panel wire)
  const wireSummary = wires.reduce((acc, wire) => {
    const key = `${wire.color}_${wire.gauge}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalDinUnits = components.reduce((sum, comp) => {
    const meta = catalogMap.get(comp.typeId);
    return sum + (meta?.dinUnits || 1);
  }, 0);

  const handleCopy = () => {
    const lines = [
      `=== ${t.bomTitle} ===`,
      `Total DIN Modules: ${totalDinUnits} Modules`,
      `Total Capacity: ${(simulationState.totalPowerW / 1000).toFixed(2)} kW / ${simulationState.totalCurrentA} A`,
      '',
      '--- Components ---',
      ...Object.entries(componentSummary).map(([typeId, qtyVal]) => {
        const qty = Number(qtyVal);
        const meta = catalogMap.get(typeId);
        return `- ${lang === 'ka' ? meta?.nameKa : meta?.nameEn} x ${qty} pcs (${(meta?.dinUnits || 1) * qty} DIN)`;
      }),
      '',
      '--- Wiring ---',
      ...Object.entries(wireSummary).map(([key, countVal]) => {
        const count = Number(countVal);
        const [color, gauge] = key.split('_');
        return `- Wire ${gauge} mm² (${color}): ~${(count * 0.4).toFixed(1)} meters (${count} connections)`;
      }),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportBomExcel = () => {
    const isKa = lang === 'ka';
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      [isKa ? 'ElectroPanel - ფარის სპეციფიკაცია და ხარჯთაღრიცხვა (BOM)' : 'ElectroPanel - Bill of Materials (BOM)'],
      [isKa ? `დადგმული სიმძლავრე: ${(simulationState.totalPowerW / 1000).toFixed(2)} kW` : `Total Capacity: ${(simulationState.totalPowerW / 1000).toFixed(2)} kW`],
      [isKa ? `მაქსიმალური დენი: ${simulationState.totalCurrentA} A` : `Max Current: ${simulationState.totalCurrentA} A`],
      [isKa ? `DIN მოდულების ჯამი: ${totalDinUnits} მოდული` : `Total DIN Units: ${totalDinUnits} Modules`],
      [],
      [isKa ? '1. აღჭურვილობის სპეციფიკაცია' : '1. Equipment & Components'],
      [
        isKa ? '№' : 'No.',
        isKa ? 'დასახელება' : 'Device Name',
        isKa ? 'კატეგორია' : 'Category',
        isKa ? 'DIN მოდული' : 'DIN Units',
        isKa ? 'რაოდენობა (ცალი)' : 'Quantity (pcs)',
        isKa ? 'სავარაუდო ფასი ($)' : 'Est. Price ($)',
      ],
    ];

    let itemIdx = 1;
    Object.entries(componentSummary).forEach(([typeId, qtyVal]) => {
      const qty = Number(qtyVal);
      const meta = catalogMap.get(typeId);
      if (!meta) return;
      const basePrice = meta.category === 'RCD_DEVICE' || meta.category === 'RCBO_DEVICE' ? 45 : meta.category === 'VOLTAGE_RELAY' ? 55 : 18;
      rows.push([
        itemIdx++,
        isKa ? meta.nameKa : meta.nameEn,
        meta.category,
        meta.dinUnits * qty,
        qty,
        basePrice * qty,
      ]);
    });

    rows.push([]);
    rows.push([isKa ? '2. სამონტაჟო მავთულების გაანგარიშება' : '2. Wiring Materials & Sizing']);
    rows.push([
      isKa ? 'სადენის ტიპი / ფერი' : 'Wire Type / Color',
      isKa ? 'კვეთა (მმ²)' : 'Gauge (mm²)',
      isKa ? 'შეერთებების რაოდენობა' : 'Connections Count',
      isKa ? 'სავარაუდო მეტრაჟი (მეტრი)' : 'Est. Length (meters)',
    ]);

    Object.entries(wireSummary).forEach(([key, countVal]) => {
      const count = Number(countVal);
      const [colorType, gaugeStr] = key.split('_');
      const colorObj = WIRE_COLORS.find((c) => c.type === colorType);
      rows.push([
        isKa ? colorObj?.nameKa || colorType : colorObj?.nameEn || colorType,
        `${gaugeStr} mm²`,
        count,
        Number((count * 0.4).toFixed(1)),
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 36 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, isKa ? 'BOM სპეციფიკაცია' : 'BOM Specification');
    XLSX.writeFile(wb, `ElectroPanel_BOM_Specification_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-auto flex flex-col items-center select-none text-slate-100">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-slate-700 rounded-3xl p-8 shadow-2xl relative flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {t.bomTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ka'
                  ? 'ფარის სრული სპეციფიკაცია, მოდულების ჯამი და კაბელების ხარჯი'
                  : 'Complete Bill of Materials, DIN module capacity and cable sizing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBomExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
              title="Download Microsoft Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{lang === 'ka' ? 'Excel-ში ექსპორტი (.xlsx)' : 'Export Excel'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">{lang === 'ka' ? 'დაკოპირდა' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t.bomCopySummary}</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (onOpenPdfReport) {
                  onOpenPdfReport();
                } else {
                  window.print();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{t.bomExportPdf}</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">
              {lang === 'ka' ? 'ფარის ზომა (DIN მოდულები)' : 'Enclosure DIN Capacity'}
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono">
              {totalDinUnits}{' '}
              <span className="text-xs text-slate-500 font-normal">
                {lang === 'ka' ? 'მოდული (18მმ)' : 'Modules'}
              </span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {lang === 'ka' ? `რეკომენდებული ყუთი: ${Math.ceil(totalDinUnits * 1.3)} მოდულიანი` : `Recommended box: ${Math.ceil(totalDinUnits * 1.3)} modules`}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">
              {lang === 'ka' ? 'ჯამური სიმძლავრე (kW)' : 'Connected Load (kW)'}
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {(simulationState.totalPowerW / 1000).toFixed(2)}{' '}
              <span className="text-xs text-slate-500 font-normal">kW</span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {lang === 'ka' ? `მაქს. დენი: ${simulationState.totalCurrentA} A` : `Max Current: ${simulationState.totalCurrentA} A`}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">
              {lang === 'ka' ? 'შეერთებების რაოდენობა' : 'Total Wire Links'}
            </span>
            <span className="text-2xl font-black text-blue-400 font-mono">
              {wires.length}{' '}
              <span className="text-xs text-slate-500 font-normal">
                {lang === 'ka' ? 'მავთული' : 'wires'}
              </span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              ~{(wires.length * 0.35).toFixed(1)} m {lang === 'ka' ? 'ფარის შიდა მონტაჟი' : 'internal jumper wire'}
            </span>
          </div>
        </div>

        {/* 1. Component Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            {lang === 'ka' ? '1. აღჭურვილობისა და მოწყობილობების სია' : '1. Equipment & Device List'}
          </h3>

          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{lang === 'ka' ? 'მოწყობილობა' : 'Device'}</th>
                  <th className="p-3">{lang === 'ka' ? 'კატეგორია' : 'Category'}</th>
                  <th className="p-3">{lang === 'ka' ? 'მოდული' : 'DIN'}</th>
                  <th className="p-3 text-right">{t.bomQty}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {Object.entries(componentSummary).map(([typeId, qtyVal], idx) => {
                  const qty = Number(qtyVal);
                  const meta = catalogMap.get(typeId);
                  if (!meta) return null;
                  return (
                    <tr key={typeId} className="hover:bg-slate-900/50">
                      <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-100">
                          {lang === 'ka' ? meta.nameKa : meta.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {meta.ratedCurrentA ? `${meta.ratedCurrentA}A ` : ''}
                          {meta.curve ? `Curve ${meta.curve} ` : ''}
                          {meta.rcdSensitivityMa ? `Δ ${meta.rcdSensitivityMa}mA` : ''}
                        </div>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {meta.category}
                      </td>
                      <td className="p-3 font-mono">{meta.dinUnits * qty}M</td>
                      <td className="p-3 text-right font-bold text-amber-400 font-mono">
                        {qty} {lang === 'ka' ? 'ცალი' : 'pcs'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Wire Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            {lang === 'ka' ? '2. სამონტაჟო მავთულების გაანგარიშება' : '2. Wiring Material Sizing'}
          </h3>

          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3">{lang === 'ka' ? 'ტიპი / დანიშნულება' : 'Type / Function'}</th>
                  <th className="p-3">{t.wireGauge}</th>
                  <th className="p-3">{lang === 'ka' ? 'შეერთებები' : 'Connections'}</th>
                  <th className="p-3 text-right">{lang === 'ka' ? 'სავარაუდო მეტრაჟი' : 'Est. Length'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {Object.entries(wireSummary).map(([key, countVal]) => {
                  const count = Number(countVal);
                  const [colorType, gaugeStr] = key.split('_');
                  const colorObj = WIRE_COLORS.find((c) => c.type === colorType);
                  return (
                    <tr key={key} className="hover:bg-slate-900/50">
                      <td className="p-3 flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-slate-700"
                          style={{
                            background:
                              colorType === 'GROUND_GREEN_YELLOW'
                                ? 'linear-gradient(135deg, #10b981 50%, #facc15 50%)'
                                : colorObj?.hex || '#8B4513',
                          }}
                        />
                        <span>
                          {lang === 'ka' ? colorObj?.nameKa : colorObj?.nameEn}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">{gaugeStr} mm²</td>
                      <td className="p-3 font-mono">{count} {lang === 'ka' ? 'ხაზი' : 'lines'}</td>
                      <td className="p-3 text-right font-bold text-amber-400 font-mono">
                        ~{(count * 0.4).toFixed(1)} m
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
