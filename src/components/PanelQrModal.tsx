import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Download,
  Printer,
  ShieldCheck,
  Zap,
  Layers,
  FileText,
  Smartphone,
  Sparkles,
  Info,
  Calendar,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { CircuitLoad, Language, PlacedComponent, WireConnection } from '../types';
import { TRANSLATIONS } from '../data/translations';
import {
  generateFieldTechnicianUrl,
  packTechnicianPayload,
  PanelTechnicianPayload,
} from '../utils/qrPayloadHelper';

interface PanelQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: PlacedComponent[];
  wires: WireConnection[];
  loads: CircuitLoad[];
  numRails: number;
  lang: Language;
  onOpenTechnicianSummary: () => void;
}

export const PanelQrModal: React.FC<PanelQrModalProps> = ({
  isOpen,
  onClose,
  components,
  wires,
  loads,
  numRails,
  lang,
  onOpenTechnicianSummary,
}) => {
  const t = TRANSLATIONS[lang];
  const isKa = lang === 'ka';

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'QR_PORTAL' | 'DOOR_STICKER'>('QR_PORTAL');
  const [panelTag, setPanelTag] = useState<string>('DB-MAIN-01');
  const [siteReference, setSiteReference] = useState<string>('PRJ-SITE-REF-01');
  const [installerName, setInstallerName] = useState<string>(t.certifiedTechnician || 'Certified Electrical Technician');
  const [enclosureRating, setEnclosureRating] = useState<string>('IP40');

  const stickerPrintRef = useRef<HTMLDivElement>(null);

  // Generate payload & QR code on open / changes
  useEffect(() => {
    if (!isOpen) return;

    setIsGenerating(true);

    const payload: PanelTechnicianPayload = packTechnicianPayload(
      components,
      wires,
      loads,
      numRails,
      siteReference || (isKa ? 'საპროექტო ობიექტის გამანაწილებელი ფარი' : 'Project Site Reference Panel')
    );
    payload.panelId = panelTag;
    payload.projectName = siteReference || 'Project Site Reference';

    const url = generateFieldTechnicianUrl(payload);
    setShareUrl(url);

    const timer = setTimeout(() => {
      QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((dataUrl) => {
          setQrDataUrl(dataUrl);
          setIsGenerating(false);
        })
        .catch((err) => {
          console.error('QR Generation failed:', err);
          setIsGenerating(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, components, wires, loads, numRails, isKa, panelTag, siteReference]);

  const handleRefreshQr = () => {
    setIsGenerating(true);
    const payload: PanelTechnicianPayload = packTechnicianPayload(
      components,
      wires,
      loads,
      numRails,
      siteReference || (isKa ? 'საპროექტო ობიექტის გამანაწილებელი ფარი' : 'Project Site Reference Panel')
    );
    payload.panelId = panelTag;
    payload.projectName = siteReference || 'Project Site Reference';
    const url = generateFieldTechnicianUrl(payload);
    setShareUrl(url);

    setTimeout(() => {
      QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((dataUrl) => {
          setQrDataUrl(dataUrl);
          setIsGenerating(false);
        })
        .catch((err) => {
          console.error('QR Generation failed:', err);
          setIsGenerating(false);
        });
    }, 300);
  };

  if (!isOpen) return null;

  // Calculate panel quick stats for the sticker & modal
  const totalPowerW = loads.reduce((sum, l) => sum + (l.powerW || 0), 0);
  const totalPowerKw = (totalPowerW / 1000).toFixed(2);
  const mainMcb = components.find(
    (c) => c.typeId === 'MCB_2P_MAIN' || c.typeId === 'MCB_3P_MAIN' || c.typeId.includes('MAIN')
  );
  const mainRatingA = mainMcb?.breakerSettings?.ratedCurrentA || mainMcb?.customCurrentA || 40;
  const activeCircuitsCount = loads.filter((l) => l.isActive).length;
  const rcdCount = components.filter((c) => c.typeId.startsWith('RCD_') || c.typeId.startsWith('RCBO_')).length;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `ElectroPanel-QR-${panelTag}.png`;
    a.click();
  };

  const handlePrintSticker = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t.qrCodeModalTitle}
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  IEC 61439-1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t.qrCodeModalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('QR_PORTAL')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'QR_PORTAL'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{isKa ? 'საველე QR & მობილური ბმული' : 'Mobile QR & Share Link'}</span>
          </button>
          <button
            onClick={() => setActiveTab('DOOR_STICKER')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DOOR_STICKER'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{t.qrCodeDoorSticker}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* TAB 1: QR PORTAL & SCAN */}
          {activeTab === 'QR_PORTAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* QR Image Card */}
              <div className="flex flex-col items-center bg-slate-950/90 p-5 rounded-2xl border border-slate-800 shadow-inner relative">
                {/* Refresh indicator / header */}
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-400">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isGenerating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                    <span className="text-[11px]">
                      {isGenerating
                        ? isKa
                          ? 'QR გენერირდება...'
                          : 'Generating QR...'
                        : isKa
                        ? 'QR მზად არის'
                        : 'Live QR Ready'}
                    </span>
                  </span>
                  <button
                    onClick={handleRefreshQr}
                    disabled={isGenerating}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer disabled:opacity-50"
                    title={isKa ? 'QR კოდის განახლება' : 'Refresh QR Code'}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-400' : ''}`}
                    />
                  </button>
                </div>

                {/* Animated QR Container with Subtle Pulse */}
                <div className="relative flex items-center justify-center p-1">
                  {/* Subtle pulsing glow ring when generating / refreshing */}
                  <div
                    className={`absolute -inset-2 rounded-2xl transition-all duration-700 pointer-events-none ${
                      isGenerating
                        ? 'bg-amber-500/20 blur-md animate-pulse ring-2 ring-amber-400/40'
                        : 'bg-emerald-500/5 blur-sm'
                    }`}
                  />

                  <motion.div
                    animate={
                      isGenerating
                        ? {
                            scale: [1, 0.98, 1.01, 1],
                            opacity: [1, 0.7, 0.9, 1],
                          }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={{
                      duration: 1.2,
                      repeat: isGenerating ? Infinity : 0,
                      ease: 'easeInOut',
                    }}
                    className={`relative p-3 bg-white rounded-xl shadow-xl transition-all duration-300 ${
                      isGenerating ? 'ring-2 ring-amber-400/60 shadow-amber-500/20' : 'ring-1 ring-slate-200'
                    }`}
                  >
                    {qrDataUrl ? (
                      <motion.img
                        key={qrDataUrl}
                        initial={{ opacity: 0.8, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        src={qrDataUrl}
                        alt="Panel Field QR Code"
                        className="w-52 h-52 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                        <span>Generating QR...</span>
                      </div>
                    )}

                    {/* Center badge icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.div
                        animate={
                          isGenerating
                            ? { scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }
                            : { scale: 1, rotate: 0 }
                        }
                        transition={{ duration: 1, repeat: isGenerating ? Infinity : 0 }}
                        className="w-10 h-10 rounded-full bg-amber-500/90 border-2 border-white shadow-md flex items-center justify-center text-slate-950 font-black"
                      >
                        <Zap className="w-5 h-5 fill-current" />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>{t.techScanPrompt}</span>
                </div>

                <div className="mt-4 flex items-center gap-2 w-full">
                  <button
                    onClick={handleDownloadQr}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.qrCodeDownloadPng}</span>
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTechnicianSummary();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t.qrCodeOpenSummary}</span>
                  </button>
                </div>
              </div>

              {/* Panel Summary Details */}
              <div className="space-y-4">
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{isKa ? 'ფარის ტექნიკური პარამეტრები' : 'Panel Electrical Specs'}</span>
                    <span className="font-mono text-amber-400 font-bold">{panelTag}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">{t.techTotalLoad}</span>
                      <span className="font-mono font-bold text-white text-sm">{totalPowerKw} kW</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">{t.techEmergencyMains}</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">{mainRatingA}A (230V)</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">{t.techCircuitsCount}</span>
                      <span className="font-mono font-bold text-emerald-300 text-sm">{activeCircuitsCount} Circuits</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">{t.techRcdProtected}</span>
                      <span className="font-mono font-bold text-purple-300 text-sm">{rcdCount} RCD/RCBO</span>
                    </div>
                  </div>
                </div>

                {/* Shareable Link Box */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>{isKa ? 'ტექნიკოსის ვებ ბმული' : 'Direct Technician Web Link'}</span>
                    {isCopied && (
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {t.qrCodeLinkCopied}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono flex-1 select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isCopied
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? t.qrCodeLinkCopied : t.qrCodeCopyLink}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {isKa
                      ? 'QR კოდის დასკანერებისას ოსტატი მობილურზე იხილავს სრულ ერთხაზოვან სქემას, დატვირთვის ცხრილს, კაბელის კვეთებსა და ავტომატების ნომინალებს.'
                      : 'When scanned, the field electrician immediately accesses the interactive single-line schematic, load schedule table, and cable schedule.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENCLOSURE DOOR STICKER (IEC 61439 Standard Technical Label) */}
          {activeTab === 'DOOR_STICKER' && (
            <div className="space-y-4">
              {/* Sticker Customizer Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {isKa ? 'ფარის ნომერი / ID' : 'Panel ID / Tag'}
                  </label>
                  <input
                    type="text"
                    value={panelTag}
                    onChange={(e) => setPanelTag(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {t.projectSiteRef}
                  </label>
                  <input
                    type="text"
                    value={siteReference}
                    onChange={(e) => setSiteReference(e.target.value)}
                    placeholder={t.projectSiteRefPlaceholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {isKa ? 'სერტიფიცირებული ოსტატი' : 'Certified Electrician'}
                  </label>
                  <input
                    type="text"
                    value={installerName}
                    onChange={(e) => setInstallerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {isKa ? 'დაცვის კლასი (IP)' : 'Ingress Rating (IP)'}
                  </label>
                  <input
                    type="text"
                    value={enclosureRating}
                    onChange={(e) => setEnclosureRating(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>

              {/* Printable Sticker Preview Box */}
              <div className="flex justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div
                  ref={stickerPrintRef}
                  id="panel-enclosure-door-sticker"
                  className="w-full max-w-lg bg-white text-slate-950 p-5 rounded-xl shadow-2xl border-4 border-slate-900 flex flex-col gap-3 font-sans print:border-2 print:m-0"
                >
                  {/* Sticker Header */}
                  <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <h3 className="text-sm font-black tracking-wider uppercase">
                          ELECTRICAL DISTRIBUTION PANEL
                        </h3>
                      </div>
                      <p className="text-[10px] font-bold text-slate-600">
                        {isKa ? 'გამანაწილებელი ფარი • IEC 61439-1 / EN 60439' : 'Main Distribution Board • IEC 61439-1 / EN 60439'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded font-mono">
                        {panelTag}
                      </span>
                    </div>
                  </div>

                  {/* Sticker Content: Specs + QR Code */}
                  <div className="grid grid-cols-5 gap-3 items-center">
                    <div className="col-span-3 space-y-1.5 text-[11px]">
                      <div className="flex justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-semibold text-slate-600">Project Site Ref:</span>
                        <span className="font-mono font-bold text-slate-900 truncate max-w-[130px]">{siteReference}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-semibold text-slate-600">Voltage / System:</span>
                        <span className="font-mono font-bold">230V / 400V 50Hz</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-semibold text-slate-600">Main Infeed ({'In'}):</span>
                        <span className="font-mono font-bold text-red-700">{mainRatingA}A</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-semibold text-slate-600">Connected Power:</span>
                        <span className="font-mono font-bold">{totalPowerKw} kW</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-semibold text-slate-600">Active Circuits:</span>
                        <span className="font-mono font-bold">{activeCircuitsCount} Ways</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-semibold text-slate-600">Enclosure Rating:</span>
                        <span className="font-mono font-bold">{enclosureRating}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-0.5">
                        <span className="font-semibold text-slate-600">Certified Tech:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[120px]">{installerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-600">Commission Date:</span>
                        <span className="font-mono text-slate-700">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* QR Code in Sticker */}
                    <div className="col-span-2 flex flex-col items-center justify-center p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="Sticker QR"
                          className="w-28 h-28 object-contain"
                        />
                      )}
                      <span className="text-[8px] font-bold text-slate-700 mt-1 uppercase tracking-tight">
                        SCAN FOR SCHEMATIC
                      </span>
                    </div>
                  </div>

                  {/* Sticker Footer Notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded p-1.5 text-[9px] text-amber-950 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {isKa
                        ? 'გაფრთხილება: ძაბვის ქვეშ მუშაობა აკრძალულია. სქემის სანახავად დაასკანერეთ QR.'
                        : 'WARNING: Disconnect power before servicing. Scan QR for circuit schematic & schedule.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Print Action */}
              <div className="flex justify-end">
                <button
                  id="btn-print-door-sticker"
                  onClick={handlePrintSticker}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.qrCodePrintSticker}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isKa ? 'საველე პორტალი მზადაა' : 'Field portal active & synchronized'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              {isKa ? 'დახურვა' : 'Close'}
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenTechnicianSummary();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-bold transition cursor-pointer hover:brightness-110 shadow-lg shadow-amber-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t.qrCodeOpenSummary}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
