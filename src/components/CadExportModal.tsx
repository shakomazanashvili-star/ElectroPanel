import React, { useState } from 'react';
import {
  Download,
  FileCode2,
  Box,
  FileText,
  FileJson,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { FloorPlanData, Language } from '../types';
import { generateAutoCadDXF } from '../utils/dxfExporter';
import { generateSketchUpOBJ } from '../utils/obj3DExporter';
import { exportFloorPlanToPDF } from '../utils/pdfBlueprintExporter';

interface CadExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  planData: FloorPlanData;
  svgElement: SVGSVGElement | null;
  lang: Language;
}

export const CadExportModal: React.FC<CadExportModalProps> = ({
  isOpen,
  onClose,
  planData,
  svgElement,
  lang,
}) => {
  const isKa = lang === 'ka';
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen) return null;

  // Trigger AutoCAD DXF download
  const handleExportDXF = () => {
    setDownloadingFormat('dxf');
    try {
      const dxfContent = generateAutoCadDXF(planData);
      const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${planData.name.replace(/\s+/g, '_')}_AutoCAD.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('DXF export error', e);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 1000);
    }
  };

  // Trigger SketchUp 3D OBJ download
  const handleExportOBJ = () => {
    setDownloadingFormat('obj');
    try {
      const objContent = generateSketchUpOBJ(planData);
      const blob = new Blob([objContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${planData.name.replace(/\s+/g, '_')}_SketchUp3D.obj`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('OBJ export error', e);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 1000);
    }
  };

  // Trigger Engineering PDF Blueprint export
  const handleExportPDF = async () => {
    setDownloadingFormat('pdf');
    try {
      await exportFloorPlanToPDF(planData, svgElement, lang);
    } catch (e) {
      console.error('PDF export error', e);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 1200);
    }
  };

  // Trigger Project JSON Export
  const handleExportJSON = () => {
    setDownloadingFormat('json');
    try {
      const jsonStr = JSON.stringify(planData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${planData.name.replace(/\s+/g, '_')}_Project.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('JSON export error', e);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 800);
    }
  };

  // Trigger SVG Download
  const handleExportSVG = () => {
    if (!svgElement) return;
    setDownloadingFormat('svg');
    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${planData.name.replace(/\s+/g, '_')}_Vector.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('SVG export error', e);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="cad-export-modal-dialog"
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 rounded-xl text-sky-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isKa ? 'CAD / BIM / PDF ექსპორტის ცენტრი' : 'CAD / BIM / PDF Export Center'}
              </h2>
              <p className="text-xs text-slate-400">
                {isKa
                  ? 'გადაიტანეთ ნახაზი AutoCAD, ArchiCAD, SketchUp, Revit ან PDF ფორმატში'
                  : 'Export your architectural plan directly into AutoCAD, ArchiCAD, SketchUp or PDF'}
              </p>
            </div>
          </div>
          <button
            id="close-cad-export-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Project Summary Banner */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/70 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  {isKa ? 'პროექტის დასახელება' : 'Project Name'}
                </span>
                {planData.cadastralCode && (
                  <span className="px-2 py-0.5 text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800 rounded-full">
                    {planData.cadastralCode}
                  </span>
                )}
              </div>
              <p className="font-semibold text-slate-200">{planData.name}</p>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block">{isKa ? 'კედლები' : 'Walls'}</span>
                <span className="font-bold text-slate-100">{planData.walls?.length || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isKa ? 'წერტილები' : 'Devices'}</span>
                <span className="font-bold text-amber-400">{planData.devices.length}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isKa ? 'ოთახები' : 'Rooms'}</span>
                <span className="font-bold text-emerald-400">{planData.rooms.length}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isKa ? 'მასშტაბი' : 'Scale'}</span>
                <span className="font-bold text-slate-200">1:50</span>
              </div>
            </div>
          </div>

          {/* Export Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. AutoCAD / ArchiCAD DXF */}
            <div className="p-5 bg-gradient-to-br from-slate-800/70 to-slate-800/30 border border-red-500/20 hover:border-red-500/50 rounded-2xl transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                      <FileCode2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">AutoCAD / ArchiCAD (.DXF)</h3>
                      <span className="text-[11px] text-red-400 font-medium">AutoCAD R12 / 2000 ASCII Standard</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800/60 rounded">
                    CAD 2D/3D
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {isKa
                    ? 'ნახაზის ექსპორტი ფენებად (Layers): კედლები, კარები, ფანჯრები, როზეტები, ჩამრთველები, ფარი და საკაბელო ტრასები. იხსნება პირდაპირ AutoCAD, ArchiCAD, Revit, LibreCAD-ში.'
                    : 'Layered DXF vector drawing with dedicated layers for walls, doors, windows, lighting, sockets, DB board and wiring. Direct CAD import.'}
                </p>
              </div>
              <button
                id="btn-export-dxf"
                onClick={handleExportDXF}
                disabled={downloadingFormat === 'dxf'}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all"
              >
                {downloadingFormat === 'dxf' ? (
                  <>
                    <Check className="w-4 h-4 text-white animate-pulse" />
                    {isKa ? 'იწერება .DXF...' : 'Generating DXF...'}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {isKa ? 'AutoCAD (.DXF) ჩამოტვირთვა' : 'Download AutoCAD (.DXF)'}
                  </>
                )}
              </button>
            </div>

            {/* 2. SketchUp 3D OBJ */}
            <div className="p-5 bg-gradient-to-br from-slate-800/70 to-slate-800/30 border border-amber-500/20 hover:border-amber-500/50 rounded-2xl transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">SketchUp 3D (.OBJ)</h3>
                      <span className="text-[11px] text-amber-400 font-medium">Wavefront 3D Mesh (Meters)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded">
                    3D BIM
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {isKa
                    ? '3D მოცულობითი მოდელი: 3D კედლები (სიმაღლე 2.7მ), იატაკის ფილები და ელექტრო წერტილების 3D კოლოფები ზუსტი მონტაჟის სიმაღლეებით (30სმ, 90სმ, 270სმ). იხსნება SketchUp, Blender, 3ds Max-ში.'
                    : '3D Extruded wall boxes (2.7m), floor slabs and 3D electrical device boxes placed at true vertical mounting heights. Direct SketchUp import.'}
                </p>
              </div>
              <button
                id="btn-export-obj"
                onClick={handleExportOBJ}
                disabled={downloadingFormat === 'obj'}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-900 text-xs font-bold rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all"
              >
                {downloadingFormat === 'obj' ? (
                  <>
                    <Check className="w-4 h-4 text-slate-900 animate-pulse" />
                    {isKa ? 'იწერება .OBJ...' : 'Generating 3D OBJ...'}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {isKa ? 'SketchUp 3D (.OBJ) ჩამოტვირთვა' : 'Download SketchUp 3D (.OBJ)'}
                  </>
                )}
              </button>
            </div>

            {/* 3. Architectural Engineering PDF */}
            <div className="p-5 bg-gradient-to-br from-slate-800/70 to-slate-800/30 border border-sky-500/20 hover:border-sky-500/50 rounded-2xl transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">
                        {isKa ? 'საპროექტო PDF ბლანკი' : 'Architectural PDF Sheet'}
                      </h3>
                      <span className="text-[11px] text-sky-400 font-medium">A3 Landscape / ISO 216</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60 rounded">
                    PRINT READY
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {isKa
                    ? 'საინჟინრო საპროექტო ფურცელი ოფიციალური შტამპით (Title Block), საკადასტრო კოდით, პირობითი აღნიშვნების ცხრილით, კაბელის მეტრაჟითა და ოთახების ექსპლიკაციით.'
                    : 'Engineering drawing sheet featuring formal Title Block stamp, Cadastral code, IEC electrical symbols legend, cable bill of materials, and room schedule.'}
                </p>
              </div>
              <button
                id="btn-export-pdf"
                onClick={handleExportPDF}
                disabled={downloadingFormat === 'pdf'}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2 transition-all"
              >
                {downloadingFormat === 'pdf' ? (
                  <>
                    <Check className="w-4 h-4 text-white animate-pulse" />
                    {isKa ? 'იწერება PDF...' : 'Generating PDF...'}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {isKa ? 'საინჟინრო PDF ჩამოტვირთვა' : 'Download Blueprint PDF'}
                  </>
                )}
              </button>
            </div>

            {/* 4. Vector SVG & Project JSON */}
            <div className="p-5 bg-gradient-to-br from-slate-800/70 to-slate-800/30 border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">
                        {isKa ? 'პროექტი (.JSON) & ვექტორი (.SVG)' : 'Project JSON & Vector SVG'}
                      </h3>
                      <span className="text-[11px] text-emerald-400 font-medium">Backup & Graphic Assets</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded">
                    DATA & VECTOR
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {isKa
                    ? 'სრული პროექტის ფაილის შენახვა შემდგომი გახსნისთვის ან ვექტორული SVG ნახაზის ჩამოტვირთვა Illustrator-ისთვის და ბეჭდვისთვის.'
                    : 'Save complete project state file to reopen anytime, or export crisp scalable vector SVG graphic for documentation and editing.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-export-json"
                  onClick={handleExportJSON}
                  disabled={downloadingFormat === 'json'}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileJson className="w-3.5 h-3.5 text-emerald-400" />
                  {isKa ? 'პროექტი (.JSON)' : 'Save (.JSON)'}
                </button>
                <button
                  id="btn-export-svg"
                  onClick={handleExportSVG}
                  disabled={downloadingFormat === 'svg'}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 flex items-center justify-center gap-1.5 transition-all"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  {isKa ? 'ვექტორი (.SVG)' : 'Vector (.SVG)'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guide on How to Open in AutoCAD & SketchUp */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Info className="w-4 h-4 text-sky-400" />
              <span>{isKa ? 'როგორ გავხსნათ პროგრამებში:' : 'How to open in software:'}</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 pl-5 list-disc">
              <li>
                <strong className="text-slate-300">AutoCAD & ArchiCAD:</strong>{' '}
                {isKa ? 'გახსენით პირდაპირ `File -> Open -> .DXF` ან ჩასვით როგორც XREF.' : 'Directly `File -> Open -> .DXF` or attach as XREF.'}
              </li>
              <li>
                <strong className="text-slate-300">SketchUp:</strong>{' '}
                {isKa
                  ? 'გახსენით `File -> Import...` და აირჩიეთ `.OBJ` (3D მოდელი) ან `.DXF`.'
                  : 'Open `File -> Import...` and select `.OBJ` (Wavefront 3D) or `.DXF`.'}
              </li>
              <li>
                <strong className="text-slate-300">Revit & Blender:</strong>{' '}
                {isKa ? 'იმპორტირება `Import CAD` ან `Import Wavefront OBJ` ბრძანებით.' : 'Import via `Import CAD` or `Import Wavefront (.obj)`.'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            id="btn-close-cad-modal"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            {isKa ? 'დახურვა' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
