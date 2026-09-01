import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Printer,
  ArrowLeft,
  Activity,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Plug,
  Wind,
  Flame,
  Droplets,
  Tv,
  Cpu,
  CheckCircle2,
  PhoneCall,
  Download,
  Sliders,
  Copy,
  Check,
  Edit3,
  Save,
  Clock,
  Trash2,
  FileCheck2,
  Sparkles,
  ClipboardList,
  Camera,
  Image as ImageIcon,
  Maximize2,
  Eye,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { CircuitLoad, Language, PanelPhoto, PlacedComponent, SimulationState, WireConnection } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { COMPONENT_CATALOG } from '../data/componentCatalog';
import { TechnicianCameraModal } from './TechnicianCameraModal';
import { TechnicianPhotoCarousel } from './TechnicianPhotoCarousel';

interface TechnicianSummaryViewProps {
  components: PlacedComponent[];
  wires: WireConnection[];
  loads: CircuitLoad[];
  numRails: number;
  lang: Language;
  onSetLang: (lang: Language) => void;
  onBackToEditor: () => void;
  panelTag?: string;
  projectName?: string;
  projectSiteRef?: string;
  initialObservations?: string;
  onSaveObservations?: (observations: string) => void;
  initialPhotos?: PanelPhoto[];
  onSavePhotos?: (photos: PanelPhoto[]) => void;
}

export const TechnicianSummaryView: React.FC<TechnicianSummaryViewProps> = ({
  components,
  wires,
  loads,
  numRails,
  lang,
  onSetLang,
  onBackToEditor,
  panelTag = 'DB-MAIN-01',
  projectName = 'Main Distribution Board',
  projectSiteRef = 'PRJ-SITE-REF-01',
  initialObservations = '',
  onSaveObservations,
  initialPhotos = [],
  onSavePhotos,
}) => {
  const t = TRANSLATIONS[lang];
  const isKa = lang === 'ka';

  const [activeTab, setActiveTab] = useState<'SCHEMATIC' | 'SCHEDULE' | 'DIAGNOSTICS' | 'OBSERVATIONS'>('SCHEMATIC');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [highlightedCircuitId, setHighlightedCircuitId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [selectedPhotoIndexForPreview, setSelectedPhotoIndexForPreview] = useState<number | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState<boolean>(false);

  // Photos state (persisted to localStorage & project metadata)
  const [panelPhotos, setPanelPhotos] = useState<PanelPhoto[]>(() => {
    if (initialPhotos && initialPhotos.length > 0) return initialPhotos;
    try {
      const saved = localStorage.getItem(`electropanel_tech_photos_${panelTag}`);
      if (saved) return JSON.parse(saved);
      const globalSaved = localStorage.getItem('electropanel_site_photos');
      return globalSaved ? JSON.parse(globalSaved) : [];
    } catch {
      return [];
    }
  });

  const handleSavePhoto = (newPhoto: PanelPhoto) => {
    const updated = [newPhoto, ...panelPhotos];
    setPanelPhotos(updated);
    try {
      localStorage.setItem(`electropanel_tech_photos_${panelTag}`, JSON.stringify(updated));
      localStorage.setItem('electropanel_site_photos', JSON.stringify(updated));
      if (onSavePhotos) {
        onSavePhotos(updated);
      }
    } catch (err) {
      console.error('Error saving photo:', err);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    const updated = panelPhotos.filter((p) => p.id !== photoId);
    setPanelPhotos(updated);
    try {
      localStorage.setItem(`electropanel_tech_photos_${panelTag}`, JSON.stringify(updated));
      localStorage.setItem('electropanel_site_photos', JSON.stringify(updated));
      if (onSavePhotos) {
        onSavePhotos(updated);
      }
      if (selectedPhotoIndexForPreview !== null) {
        if (updated.length === 0) {
          setSelectedPhotoIndexForPreview(null);
        } else if (selectedPhotoIndexForPreview >= updated.length) {
          setSelectedPhotoIndexForPreview(updated.length - 1);
        }
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  // Keyboard navigation for Fullscreen Lightbox Carousel
  useEffect(() => {
    if (selectedPhotoIndexForPreview === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhotoIndexForPreview(null);
        setLightboxZoomed(false);
      } else if (e.key === 'ArrowLeft') {
        setSelectedPhotoIndexForPreview((prev) =>
          prev !== null ? (prev === 0 ? panelPhotos.length - 1 : prev - 1) : null
        );
        setLightboxZoomed(false);
      } else if (e.key === 'ArrowRight') {
        setSelectedPhotoIndexForPreview((prev) =>
          prev !== null ? (prev === panelPhotos.length - 1 ? 0 : prev + 1) : null
        );
        setLightboxZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndexForPreview, panelPhotos.length]);

  // Observations / Notes state (persisted to localStorage & synced with project metadata)
  const [observations, setObservations] = useState<string>(() => {
    if (initialObservations) return initialObservations;
    try {
      const saved = localStorage.getItem(`electropanel_tech_notes_${panelTag}`);
      return saved || localStorage.getItem('electropanel_site_observations') || '';
    } catch {
      return '';
    }
  });

  const [isNotesSaved, setIsNotesSaved] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`electropanel_tech_notes_time_${panelTag}`) || null;
    } catch {
      return null;
    }
  });

  // Save observations directly to project metadata & storage
  const handleSaveObservations = (textToSave?: string) => {
    const content = textToSave !== undefined ? textToSave : observations;
    try {
      localStorage.setItem(`electropanel_tech_notes_${panelTag}`, content);
      localStorage.setItem('electropanel_site_observations', content);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(nowStr);
      localStorage.setItem(`electropanel_tech_notes_time_${panelTag}`, nowStr);
      if (onSaveObservations) {
        onSaveObservations(content);
      }
      setIsNotesSaved(true);
      setTimeout(() => setIsNotesSaved(false), 2500);
    } catch (err) {
      console.error('Error saving observations:', err);
    }
  };

  const handleInsertTimestamp = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    const stamp = `\n[${dateStr} ${timeStr} - ${isKa ? 'საველე ინსპექცია' : 'Field Inspection'} (${panelTag})]:\n`;
    const newText = observations ? `${observations.trimEnd()}${stamp}` : stamp.trimStart();
    setObservations(newText);
    handleSaveObservations(newText);
  };

  const handleAppendPresetNote = (presetText: string) => {
    const newText = observations ? `${observations.trimEnd()}\n• ${presetText}` : `• ${presetText}`;
    setObservations(newText);
    handleSaveObservations(newText);
  };

  const handleCopyNotes = () => {
    if (!observations) return;
    navigator.clipboard.writeText(
      `--- ${projectName} (${projectSiteRef}) / Panel: ${panelTag} ---\n` +
      `Date: ${new Date().toLocaleDateString()}\n` +
      `Field Observations:\n${observations}`
    ).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {});
  };

  const handleClearNotes = () => {
    if (window.confirm(isKa ? 'დარწმუნებული ხართ, რომ გსურთ შენიშვნების გასუფთავება?' : 'Are you sure you want to clear all observations?')) {
      setObservations('');
      handleSaveObservations('');
    }
  };

  // Electrical computations
  const totalPowerW = useMemo(() => {
    return loads.reduce((sum, l) => sum + (l.powerW || 0), 0);
  }, [loads]);

  const factoredPowerW = useMemo(() => {
    return loads.reduce((sum, l) => sum + (l.powerW || 0) * (l.demandFactor || 1), 0);
  }, [loads]);

  const totalCurrentA = useMemo(() => {
    return (factoredPowerW / 230).toFixed(1);
  }, [factoredPowerW]);

  const mainMcb = useMemo(() => {
    return components.find(
      (c) => c.typeId === 'MCB_2P_MAIN' || c.typeId === 'MCB_3P_MAIN' || c.typeId.includes('MAIN')
    );
  }, [components]);

  const mainRatingA = mainMcb?.breakerSettings?.ratedCurrentA || mainMcb?.customCurrentA || 40;
  const vrelay = components.find((c) => c.typeId === 'VOLTAGE_RELAY');
  const rcds = components.filter((c) => c.typeId.startsWith('RCD_') || c.typeId.startsWith('RCBO_'));
  const branchBreakers = components.filter(
    (c) => c.typeId.startsWith('MCB_1P_') || (c.typeId.startsWith('MCB_') && c.id !== mainMcb?.id)
  );

  // Filtered loads for schedule tab
  const filteredLoads = useMemo(() => {
    return loads.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.circuitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${l.breakerRatingA}A`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || l.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [loads, searchQuery, selectedCategory]);

  const handlePrint = () => {
    window.print();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'LIGHTING':
        return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'SOCKETS':
        return <Plug className="w-4 h-4 text-blue-400" />;
      case 'AC_CLIMATE':
        return <Wind className="w-4 h-4 text-cyan-400" />;
      case 'HEATING_BOILER':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'WET_ROOM':
        return <Droplets className="w-4 h-4 text-indigo-400" />;
      case 'KITCHEN':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      default:
        return <Tv className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none print:bg-white print:text-black">
      {/* Top Field Technician Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-lg shadow-black/40 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title={t.techBackToEditor}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.techBackToEditor}</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>{t.techPortalTitle}</span>
                  <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/30">
                    {panelTag}
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {t.techPortalSubtitle} • IEC 61439-1
              </p>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Camera Capture Button */}
          <button
            onClick={() => setIsCameraModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
            title={t.techCameraCapture}
          >
            <Camera className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">{t.techCameraCapture}</span>
            {panelPhotos.length > 0 && (
              <span className="bg-slate-950/90 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black">
                {panelPhotos.length}
              </span>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => onSetLang(lang === 'ka' ? 'en' : 'ka')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            {lang === 'ka' ? '🇬🇪 KA' : '🇬🇧 EN'}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ka' ? 'ბეჭდვა' : 'Print'}</span>
          </button>
        </div>
      </header>

      {/* Project Site Metadata Strip */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 py-2 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">{t.projectSiteRef}:</span>
            <span className="font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {projectSiteRef || projectName}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>IEC 61439-1 / EN 60439</span>
            </span>
            <span className="text-slate-400 hidden md:inline">
              {t.certifiedTechnician}
            </span>
          </div>
        </div>
      </div>

      {/* Main KPI Summary Ribbon */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-6 py-3.5 print:border-b-2 print:border-black">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.techTotalLoad}</span>
            <span className="font-mono font-bold text-white text-base">{(totalPowerW / 1000).toFixed(2)} kW</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.techDesignLoad}</span>
            <span className="font-mono font-bold text-amber-300 text-base">{(factoredPowerW / 1000).toFixed(2)} kW</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.techOperatingCurrent}</span>
            <span className="font-mono font-bold text-emerald-300 text-base">{totalCurrentA} A</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.techEmergencyMains}</span>
            <span className="font-mono font-bold text-rose-300 text-base">{mainRatingA}A (230V)</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.techCircuitsCount}</span>
            <span className="font-mono font-bold text-cyan-300 text-base">{loads.length} Circuits ({rcds.length} RCD)</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('SCHEMATIC')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'SCHEMATIC'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.techSchematicTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('SCHEDULE')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'SCHEDULE'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.techScheduleTab} ({loads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'DIAGNOSTICS'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{t.techDiagnosticsTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('OBSERVATIONS')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer relative ${
              activeTab === 'OBSERVATIONS'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <span>{t.techObservationsTab}</span>
            {observations.trim().length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* ======================================================== */}
        {/* TAB 1: INTERACTIVE SINGLE-LINE SCHEMATIC FOR TECHNICIANS */}
        {/* ======================================================== */}
        {activeTab === 'SCHEMATIC' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>{isKa ? 'ერთხაზოვანი პრინციპიალური სქემა' : 'Single-Line Electrical Topology'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    IEC 60617 / EN 61439-1 • Infeed 230V 1P+N+PE
                  </p>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ⚡ Live Field Ready
                </span>
              </div>

              {/* Schematic Flow Graph */}
              <div className="bg-slate-950 p-4 sm:p-6 rounded-xl border border-slate-800/90 overflow-x-auto">
                <div className="min-w-[700px] flex flex-col gap-6">
                  {/* Stage 1: Mains Infeed -> Voltage Relay */}
                  <div className="flex items-center justify-start gap-4">
                    {/* Infeed */}
                    <div className="p-3 bg-slate-900 border-2 border-amber-500/60 rounded-xl text-center min-w-[130px] shadow-lg">
                      <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <div className="text-xs font-bold text-white">MAINS SUPPLY</div>
                      <div className="text-[10px] text-slate-400 font-mono">230V AC 50Hz</div>
                    </div>

                    <div className="h-0.5 w-8 bg-amber-500" />

                    {/* Main Breaker */}
                    <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-center min-w-[140px]">
                      <Shield className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                      <div className="text-xs font-bold text-white">MAIN MCB</div>
                      <div className="text-[10px] text-rose-300 font-mono font-bold">{mainRatingA}A (2P C-Curve)</div>
                    </div>

                    <div className="h-0.5 w-8 bg-amber-500" />

                    {/* Voltage Relay */}
                    <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-center min-w-[140px]">
                      <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <div className="text-xs font-bold text-white">VOLTAGE RELAY</div>
                      <div className="text-[10px] text-emerald-400 font-mono">170V - 260V OVP/UVP</div>
                    </div>
                  </div>

                  {/* Stage 2: RCD Protection Sub-clusters */}
                  <div className="border-t border-slate-800 pt-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isKa ? 'დიფერენციალური დაცვის ჯგუფები (RCD 30mA)' : 'Residual Current Groups (RCD 30mA)'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rcds.map((rcd, idx) => {
                        const rcdRating = rcd.breakerSettings?.ratedCurrentA || 40;
                        return (
                          <div
                            key={rcd.id}
                            className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3.5 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-purple-400" />
                                <span className="text-xs font-bold text-purple-300">
                                  {rcd.customLabel || `RCD Group #${idx + 1}`}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                                {rcdRating}A / 30mA
                              </span>
                            </div>

                            {/* Branch Breakers inside this group */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {loads.slice(idx * 3, idx * 3 + 3).map((load) => (
                                <div
                                  key={load.id}
                                  onClick={() => setHighlightedCircuitId(load.id)}
                                  className={`p-2 rounded-lg border text-xs cursor-pointer transition ${
                                    highlightedCircuitId === load.id
                                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-mono font-bold text-[11px] mb-1">
                                    <span className="text-amber-400">{load.circuitCode}</span>
                                    <span className="text-slate-400">{load.breakerRatingA}A</span>
                                  </div>
                                  <div className="text-[10px] truncate text-slate-200 font-medium">
                                    {load.name}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                    {load.wireGaugeMm2}mm² • {load.powerW}W
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage 3: Direct Circuits */}
                  <div className="border-t border-slate-800 pt-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      {isKa ? 'ყველა განშტოებითი წრედი & კაბელების კვეთა' : 'Branch Circuits & Cable Gauge Summary'}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {loads.map((load) => (
                        <div
                          key={load.id}
                          onClick={() => setHighlightedCircuitId(load.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            highlightedCircuitId === load.id
                              ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold text-xs border border-amber-400/30">
                              {load.circuitCode}
                            </span>
                            <span className="text-xs font-bold text-slate-300">
                              {load.breakerRatingA}A
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-white line-clamp-1 mb-1">
                            {load.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mb-2">
                            📍 {load.room}
                          </div>

                          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span className="text-emerald-400 font-bold">{load.wireGaugeMm2} mm²</span>
                            <span>{load.powerW} W</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: INTERACTIVE CIRCUIT LOAD SCHEDULE TABLE */}
        {/* ======================================================== */}
        {activeTab === 'SCHEDULE' && (
          <div className="space-y-4">
            {/* Search & Category Filter Bar */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.techSearchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'LIGHTING', 'SOCKETS', 'AC_CLIMATE', 'KITCHEN', 'WET_ROOM'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Load Schedule Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Circuit Name / Zone</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5 text-center">Breaker (In)</th>
                      <th className="p-3.5 text-center">Cable</th>
                      <th className="p-3.5 text-right">Power (W)</th>
                      <th className="p-3.5 text-right">Current (A)</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredLoads.map((load) => {
                      const currentA = ((load.powerW || 0) / (load.voltageV || 230)).toFixed(1);
                      return (
                        <tr
                          key={load.id}
                          className="hover:bg-slate-800/40 transition"
                        >
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            {load.circuitCode}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-white text-xs">{load.name}</div>
                            <div className="text-[11px] text-slate-400">📍 {load.room}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              {getCategoryIcon(load.category)}
                              <span>{load.category}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                              {load.breakerRatingA}A (C)
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="font-mono font-bold text-emerald-400">
                              {load.wireGaugeMm2} mm²
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {load.cableType || 'NYM 3x...'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">
                            {load.powerW} W
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-cyan-300">
                            {currentA} A
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              OK
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: FIELD DIAGNOSTICS & TRIPPING TROUBLESHOOTING */}
        {/* ======================================================== */}
        {activeTab === 'DIAGNOSTICS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>{t.techTripTroubleshoot}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {isKa
                    ? 'საველე გაიდლაინი გათიშული ავტომატების და RCD რელეების დიაგნოსტიკისთვის'
                    : 'Field troubleshooting guide for tripped circuit breakers & RCD devices'}
                </p>
              </div>

              {/* Troubleshooting Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Thermal Overload */}
                <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Flame className="w-4 h-4" />
                    <span>1. {isKa ? 'თერმული გადატვირთვა' : 'Thermal Overload'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isKa
                      ? 'ავტომატი ითიშება ჩართვიდან რამდენიმე წუთში. კაბელი ან ავტომატი თბება.'
                      : 'Breaker trips several minutes after turning on. Cable or breaker feels warm.'}
                  </p>
                  <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                    <span className="font-bold text-amber-300 block">{isKa ? 'ქმედება:' : 'Action:'}</span>
                    <span>• {isKa ? 'გაზომეთ დენი დენის მარწუხით' : 'Measure live current with clamp meter'}</span>
                    <br />
                    <span>• {isKa ? 'შეამცირეთ ერთდროული დატვირთვა' : 'Reduce simultaneous appliance load'}</span>
                  </div>
                </div>

                {/* 2. Short Circuit */}
                <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Zap className="w-4 h-4" />
                    <span>2. {isKa ? 'მოკლე ჩართვა (L-N / L-PE)' : 'Short Circuit (Instant)'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isKa
                      ? 'ავტომატი ითიშება მყისიერად ჩართვისთანავე ხმოვანი ტკაცუნით.'
                      : 'Breaker trips immediately upon switching on with audible snap.'}
                  </p>
                  <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                    <span className="font-bold text-rose-300 block">{isKa ? 'ქმედება:' : 'Action:'}</span>
                    <span>• {isKa ? 'გამორთეთ ყველა მოწყობილობა როზეტებიდან' : 'Unplug all socket loads'}</span>
                    <br />
                    <span>• {isKa ? 'შეამოწმეთ იზოლაციის წინაღობა მეგომეტრით' : 'Test insulation with Megger (>=1MΩ)'}</span>
                  </div>
                </div>

                {/* 3. Ground Fault / RCD Trip */}
                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>3. {isKa ? 'დენის გაჟონვა (RCD 30mA)' : 'Ground Leakage (RCD Trip)'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isKa
                      ? 'RCD რელე ითიშება. მიზეზი: დაზიანებული ტენი, ნესტი ან N-PE შეხება.'
                      : 'RCD trips. Cause: heater element insulation breakdown, moisture, or N-PE bridge.'}
                  </p>
                  <div className="text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                    <span className="font-bold text-purple-300 block">{isKa ? 'ქმედება:' : 'Action:'}</span>
                    <span>• {isKa ? 'გათიშეთ ჯგუფის ყველა ავტომატი და ჩართეთ სათითაოდ' : 'Switch off group MCBs and isolate branch'}</span>
                    <br />
                    <span>• {isKa ? 'შეამოწმეთ სველი წერტილის მოწყობილობები' : 'Inspect boiler & washing machine'}</span>
                  </div>
                </div>
              </div>

              {/* RCD 30mA Test Reminder */}
              <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 p-4 rounded-xl border border-purple-800/40 flex items-start gap-3 text-xs">
                <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-200 mb-1">
                    {isKa ? 'RCD ტესტირების რეგულაცია (EN 61008 / 61009)' : 'RCD Safety Testing Requirement'}
                  </h4>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {isKa
                      ? 'ტესტის ღილაკზე (TEST "T") დაჭერით რელე უნდა გაითიშოს მყისიერად (<300ms). შეამოწმეთ რელეები წელიწადში ერთხელ მაინც.'
                      : 'Pressing the "T" test button must trip the RCD immediately (<300ms). Perform manual verification at least once a year.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: FIELD TECHNICIAN OBSERVATIONS & PROJECT METADATA  */}
        {/* ======================================================== */}
        {activeTab === 'OBSERVATIONS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-400" />
                    <span>{t.techObservationsTitle}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {t.techObservationsSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {lastSavedTime && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{t.techNotesLastSaved}: {lastSavedTime}</span>
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>{isKa ? 'პროექტის მეტამონაცემები' : 'Project Metadata Synced'}</span>
                  </span>
                </div>
              </div>

              {/* Project Metadata Reference Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                    {t.projectSiteRef}
                  </span>
                  <span className="font-mono font-bold text-slate-200 truncate block">
                    {projectSiteRef || projectName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                    {isKa ? 'ფარის ნომერი / ID' : 'Panel Tag'}
                  </span>
                  <span className="font-mono font-bold text-amber-400 block">
                    {panelTag}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                    {t.certifiedTechnician}
                  </span>
                  <span className="font-medium text-slate-300 block">
                    IEC 61439 / EN 60439 Field Inspector
                  </span>
                </div>
              </div>

              {/* Quick Preset Remarks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.techQuickNotes}:</span>
                  </span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    {isKa ? 'დააწკაპუნეთ შენიშვნის დასამატებლად' : 'Click to append standardized remark'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(isKa
                    ? [
                        '✓ იზოლაციის წინაღობა: Megger >500V DC, R > 50 MΩ (ნორმა)',
                        '✓ დიფერენციალური რელე: RCD 30mA გაითიშა 26ms (ნორმა)',
                        '✓ ტერმინალების გადაჭერა: DIN შინები და ავტომატები 2.5 N·m',
                        '✓ ფაზური ძაბვები: L1-N = 231V 50Hz (დაბალანსებული)',
                        '✓ PE დამიწების კონტური: წინაღობა < 4 Ω (შემოწმებულია)',
                        '✓ კორპუსის დაცულობა: IP40 / კაბელის შემყვანები დალუქულია',
                        '⚠️ რეკომენდაცია: გათვალისწინებულია სარეზერვო ავტომატი',
                      ]
                    : [
                        '✓ Insulation Resistance: Megger >500V DC, R > 50 MΩ (Pass)',
                        '✓ RCD Trip Test: 30mA device tripped in 26ms (Pass)',
                        '✓ Terminal Torques: Main busbars & MCBs torqued to 2.5 N·m',
                        '✓ Operating Voltages: L1-N = 231V 50Hz (Balanced)',
                        '✓ PE Grounding Continuity: Loop impedance < 4 Ω (Pass)',
                        '✓ Enclosure Integrity: IP40 glands & knockouts sealed',
                        '⚠️ Recommendation: Spare 16A MCB reserved for future loads',
                      ]
                  ).map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAppendPresetNote(preset)}
                      className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center gap-1 text-left"
                    >
                      <span>+ {preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Textarea Area */}
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    value={observations}
                    onChange={(e) => {
                      setObservations(e.target.value);
                      handleSaveObservations(e.target.value);
                    }}
                    placeholder={t.techObservationsPlaceholder}
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-amber-400 rounded-xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition resize-y shadow-inner"
                  />
                  {isNotesSaved && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-200">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{t.techObservationsSaved}</span>
                    </div>
                  )}
                </div>

                {/* Textarea Bottom Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-mono font-medium">
                      {observations.length} {isKa ? 'სიმბოლო' : 'chars'}
                    </span>
                    <span>•</span>
                    <span className="font-mono font-medium">
                      {observations.trim() ? observations.trim().split(/\s+/).length : 0}{' '}
                      {isKa ? 'სიტყვა' : 'words'}
                    </span>
                    <span>•</span>
                    <span className="font-mono font-medium">
                      {observations ? observations.split('\n').length : 0}{' '}
                      {isKa ? 'ხაზი' : 'lines'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleInsertTimestamp}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                      title={t.techAddTimestamp}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.techAddTimestamp}</span>
                    </button>

                    <button
                      onClick={handleCopyNotes}
                      disabled={!observations.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-40"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{isKa ? 'კოპირებულია!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isKa ? 'კოპირება' : 'Copy'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleClearNotes}
                      disabled={!observations.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-700/50 transition cursor-pointer disabled:opacity-40"
                      title={t.techClearNotes}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.techClearNotes}</span>
                    </button>

                    <button
                      onClick={() => handleSaveObservations()}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition cursor-pointer"
                    >
                      {isNotesSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.techObservationsSaved}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>{t.techSaveObservations}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Attached Panel Photos Section in TAB 4 with Photo Carousel & Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>{t.techCameraAttachedPhotos}</span>
                    {panelPhotos.length > 0 && (
                      <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20">
                        {panelPhotos.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isKa
                      ? 'ფარის საველე ფოტოები ინსპექციის, გადაჭერისა და მონტაჟის დოკუმენტირებისთვის'
                      : 'On-site photographic evidence of panel assembly, wiring, and breaker torques'}
                  </p>
                </div>

                <button
                  onClick={() => setIsCameraModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 fill-current" />
                  <span>{t.techCameraCapture}</span>
                </button>
              </div>

              {panelPhotos.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3 bg-slate-950/40">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-300">
                      {t.techCameraNoPhotos}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      {isKa
                        ? 'გადაიღეთ ფარის ფოტო კამერით ან ატვირთეთ მოწყობილობიდან მეტამონაცემებში დასამაგრებლად.'
                        : 'Take a photo of the panel using device camera or upload from gallery to attach to project metadata.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCameraModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 hover:border-amber-400/40 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>{t.techCameraCapture}</span>
                  </button>
                </div>
              ) : (
                <TechnicianPhotoCarousel
                  photos={panelPhotos}
                  lang={lang}
                  panelTag={panelTag}
                  projectSiteRef={projectSiteRef}
                  onOpenCapture={() => setIsCameraModalOpen(true)}
                  onDeletePhoto={handleDeletePhoto}
                  onOpenFullscreen={(_photo, index) => {
                    setSelectedPhotoIndexForPreview(index);
                    setLightboxZoomed(false);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Printable Field Inspection Observations Section (Rendered on Print) */}
        <div className="hidden print:block mt-6 border-t-2 border-black pt-4 text-xs font-sans text-black">
          <div className="flex justify-between items-center border-b border-black pb-2 mb-3">
            <h3 className="font-bold uppercase tracking-wider text-sm">
              {isKa ? 'საველე ინსპექციის ჩანაწერები & ტექნიკური დაკვირვებები' : 'Field Inspection Remarks & On-Site Observations'}
            </h3>
            <span className="font-mono text-[11px]">
              Ref: {projectSiteRef} | Panel: {panelTag}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-300 rounded min-h-[80px] whitespace-pre-wrap font-sans text-[11px] leading-relaxed mb-4">
            {observations || (isKa ? 'საველე ინსპექციის შენიშვნები არ არის შეყვანილი.' : 'No field inspection remarks recorded.')}
          </div>

          {/* Printable Attached Photos */}
          {panelPhotos.length > 0 && (
            <div className="mb-4">
              <div className="font-bold uppercase text-[10px] text-slate-600 mb-2 border-b border-slate-200 pb-1">
                {isKa ? 'თანდართული საველე ფოტომასალა' : 'Attached Photographic Evidence'} ({panelPhotos.length})
              </div>
              <div className="grid grid-cols-2 gap-3">
                {panelPhotos.map((p, idx) => (
                  <div key={idx} className="border border-slate-300 p-2 rounded bg-slate-50 space-y-1">
                    <img src={p.url} alt={p.title || 'Photo'} className="w-full h-32 object-contain bg-white border border-slate-200" />
                    <div className="text-[10px] font-bold text-slate-800 truncate">{p.title}</div>
                    {p.notes && <div className="text-[9px] text-slate-600 truncate">{p.notes}</div>}
                    <div className="text-[9px] text-slate-500 font-mono">{new Date(p.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 text-[11px]">
            <div>
              <div className="font-semibold text-slate-700">Inspecting Electrical Technician:</div>
              <div className="mt-4 border-b border-black w-48 pb-1 font-mono">__________________________</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Signature & Authority</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-700">Date of Inspection:</div>
              <div className="mt-4 font-mono font-bold">{new Date().toLocaleDateString()}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">IEC 61439 Compliance Verification</div>
            </div>
          </div>
        </div>
      </main>

      {/* Camera Capture Modal */}
      <TechnicianCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        lang={lang}
        panelTag={panelTag}
        projectName={projectName}
        projectSiteRef={projectSiteRef}
        onSavePhoto={handleSavePhoto}
        existingPhotos={panelPhotos}
        onDeletePhoto={handleDeletePhoto}
      />

      {/* Fullscreen Interactive Photo Carousel Lightbox Modal */}
      {selectedPhotoIndexForPreview !== null && panelPhotos[selectedPhotoIndexForPreview] && (() => {
        const currentModalPhoto = panelPhotos[selectedPhotoIndexForPreview];
        const totalPhotos = panelPhotos.length;

        const handleModalPrev = () => {
          setSelectedPhotoIndexForPreview((prev) =>
            prev !== null ? (prev === 0 ? totalPhotos - 1 : prev - 1) : null
          );
          setLightboxZoomed(false);
        };

        const handleModalNext = () => {
          setSelectedPhotoIndexForPreview((prev) =>
            prev !== null ? (prev === totalPhotos - 1 ? 0 : prev + 1) : null
          );
          setLightboxZoomed(false);
        };

        const handleDownloadCurrent = () => {
          const link = document.createElement('a');
          link.href = currentModalPhoto.url;
          link.download = `${panelTag}_${currentModalPhoto.title?.replace(/\s+/g, '_') || 'photo'}_${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
          <div
            onClick={() => {
              setSelectedPhotoIndexForPreview(null);
              setLightboxZoomed(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
            >
              {/* Modal Top Header Bar */}
              <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0">
                    {panelTag}
                  </span>
                  <span className="text-sm font-bold text-white truncate">
                    {currentModalPhoto.title || (isKa ? 'ფარის საველე ფოტო' : 'Panel Inspection Photo')}
                  </span>
                  <span className="hidden sm:inline-block text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded shrink-0">
                    {selectedPhotoIndexForPreview + 1} / {totalPhotos}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Zoom Toggle */}
                  <button
                    onClick={() => setLightboxZoomed(!lightboxZoomed)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      lightboxZoomed
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title={lightboxZoomed ? (isKa ? 'ზომის მორგება' : 'Fit to Screen') : (isKa ? 'გადიდება 100%' : 'Zoom In 100%')}
                  >
                    {lightboxZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>

                  {/* Download button */}
                  <button
                    onClick={handleDownloadCurrent}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    title={t.techPhotoDownload}
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Close button */}
                  <button
                    onClick={() => {
                      setSelectedPhotoIndexForPreview(null);
                      setLightboxZoomed(false);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Image Stage with Side Navigation Controls */}
              <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[62vh] overflow-auto select-none p-2">
                <img
                  src={currentModalPhoto.url}
                  alt={currentModalPhoto.title || 'Panel inspection preview'}
                  className={`transition duration-300 ${
                    lightboxZoomed
                      ? 'max-w-none w-auto cursor-zoom-out scale-125'
                      : 'max-h-[58vh] max-w-full object-contain rounded-lg cursor-zoom-in'
                  }`}
                  onClick={() => setLightboxZoomed(!lightboxZoomed)}
                />

                {/* Left Navigation Arrow */}
                {totalPhotos > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModalPrev();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-950/80 hover:bg-amber-500 text-white hover:text-slate-950 border border-slate-700 hover:border-amber-400 flex items-center justify-center transition cursor-pointer shadow-2xl backdrop-blur-md hover:scale-105 active:scale-95"
                    title={t.techCarouselPrev}
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                  </button>
                )}

                {/* Right Navigation Arrow */}
                {totalPhotos > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModalNext();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-950/80 hover:bg-amber-500 text-white hover:text-slate-950 border border-slate-700 hover:border-amber-400 flex items-center justify-center transition cursor-pointer shadow-2xl backdrop-blur-md hover:scale-105 active:scale-95"
                    title={t.techCarouselNext}
                  >
                    <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                  </button>
                )}
              </div>

              {/* Bottom Thumbnail Carousel Strip inside Modal */}
              {totalPhotos > 1 && (
                <div className="bg-slate-950 border-t border-slate-800/80 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
                  {panelPhotos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setSelectedPhotoIndexForPreview(idx);
                        setLightboxZoomed(false);
                      }}
                      className={`relative shrink-0 w-16 sm:w-20 aspect-video rounded-md overflow-hidden border-2 transition duration-150 cursor-pointer bg-black ${
                        idx === selectedPhotoIndexForPreview
                          ? 'border-amber-400 ring-2 ring-amber-400/40 opacity-100 scale-105'
                          : 'border-slate-800 opacity-50 hover:opacity-90 hover:border-slate-600'
                      }`}
                    >
                      <img src={photo.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-mono text-center text-white">
                        #{idx + 1}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Modal Footer with Notes, Timestamp, and Actions */}
              <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1 max-w-xl">
                  {currentModalPhoto.notes ? (
                    <p className="text-slate-200 leading-relaxed font-sans">{currentModalPhoto.notes}</p>
                  ) : (
                    <p className="text-slate-500 italic">
                      {isKa ? 'დამატებითი შენიშვნა არ არის მითითებული.' : 'No additional caption notes entered.'}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>{new Date(currentModalPhoto.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span>{projectSiteRef}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden md:inline-block text-[11px] text-slate-500 mr-2">
                    {isKa ? 'ნავიგაცია: ← / → • Esc დახურვა' : 'Nav: ← / → • Esc to close'}
                  </span>
                  <button
                    onClick={() => handleDeletePhoto(currentModalPhoto.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.techCameraDeletePhoto}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500 print:hidden">
        ElectroPanel Field Technician Portal • IEC 61439-1 / DIN EN 60715
      </footer>
    </div>
  );
};
