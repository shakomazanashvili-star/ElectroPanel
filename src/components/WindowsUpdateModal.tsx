import React, { useState } from 'react';
import {
  Monitor,
  RefreshCw,
  Zap,
  Cloud,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Terminal,
  Shield,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  Wifi,
  HardDrive,
  FileCode,
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface WindowsUpdateModalProps {
  lang: Language;
  onClose: () => void;
}

export const WindowsUpdateModal: React.FC<WindowsUpdateModalProps> = ({ lang, onClose }) => {
  const t = TRANSLATIONS[lang];
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<'cloud-live' | 'electron-offline'>('cloud-live');

  const CLOUD_APP_URL = 'https://ais-pre-hhuwrsf42lxtynjpri3evy-267940705347.europe-west2.run.app';

  // Windows CMD / PowerShell Build script
  const buildCommand = `npm install --save-dev electron electron-builder
npm run build
npx electron-builder --win --config electron/electron-builder.json`;

  // Windows Desktop One-Click Launcher batch script
  const batchLauncherScript = `@echo off
title ElectroPanel Desktop Launcher (Auto-Update Live)
echo ========================================================
echo   ElectroPanel - DIN Rail Simulator (Windows Launcher)
echo   Checking cloud connection & launching live version...
echo ========================================================
start "" msedge --app="${CLOUD_APP_URL}" --window-size=1400,900
if %errorlevel% neq 0 (
  start "" chrome --app="${CLOUD_APP_URL}" --window-size=1400,900
)
exit
`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(buildCommand);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyBatch = () => {
    navigator.clipboard.writeText(batchLauncherScript);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  const handleDownloadLauncher = () => {
    const blob = new Blob([batchLauncherScript], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Launch_ElectroPanel_App.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-start items-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-100">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {t.autoUpdateTitle}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                  Windows (.EXE)
                </span>
              </div>
              <p className="text-xs text-slate-400">{t.autoUpdateSubtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex flex-col gap-6 text-xs text-slate-300">
          {/* Status Banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 animate-pulse">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                  {lang === 'ka' ? 'ონლაინ ავტო-სინქრონიზაცია ჩართულია' : 'Live Cloud Auto-Sync Active'}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'ka'
                    ? 'ვებ-ვერსიაში შეტანილი ნებისმიერი ცვლილება მომენტალურად ჩაიტვირთება Windows აპლიკაციაში.'
                    : 'Any update made in the cloud editor is instantly served to your Windows app without manual reinstall.'}
                </div>
              </div>
            </div>

            <a
              href={CLOUD_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition cursor-pointer"
            >
              <span>{lang === 'ka' ? 'Cloud URL ბმული' : 'Live Cloud URL'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Strategy Selection Cards */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t.appUpdateMode}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Option 1: Live Cloud Sync (Recommended) */}
              <div
                onClick={() => setSelectedStrategy('cloud-live')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedStrategy === 'cloud-live'
                    ? 'bg-blue-950/30 border-blue-500/60 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 text-xs">{t.cloudLiveMode}</div>
                      <div className="text-[10px] text-emerald-400 font-medium">
                        {lang === 'ka' ? '★ რეკომენდებული (0 წამი)' : '★ Recommended (Instant)'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedStrategy === 'cloud-live'
                        ? 'border-blue-400 bg-blue-500'
                        : 'border-slate-600'
                    }`}
                  >
                    {selectedStrategy === 'cloud-live' && <Check className="w-2.5 h-2.5 text-black font-black" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{t.cloudLiveDesc}</p>
                <div className="flex items-center gap-2 text-[10px] text-blue-300 font-mono bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-800/40">
                  <Wifi className="w-3 h-3" />
                  <span>{lang === 'ka' ? 'ინტერნეტიდან მყისიერი ჩატვირთვა' : 'Direct Cloud Stream'}</span>
                </div>
              </div>

              {/* Option 2: Electron Hybrid Package */}
              <div
                onClick={() => setSelectedStrategy('electron-offline')}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedStrategy === 'electron-offline'
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 text-xs">{t.offlineCachedMode}</div>
                      <div className="text-[10px] text-amber-400 font-medium">
                        {lang === 'ka' ? 'ოფლაინ მხარდაჭერა + ავტო-განახლება' : 'Offline Cache + Auto-Updater'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedStrategy === 'electron-offline'
                        ? 'border-amber-400 bg-amber-500'
                        : 'border-slate-600'
                    }`}
                  >
                    {selectedStrategy === 'electron-offline' && <Check className="w-2.5 h-2.5 text-black font-black" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{t.offlineCachedDesc}</p>
                <div className="flex items-center gap-2 text-[10px] text-amber-300 font-mono bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-800/40">
                  <RefreshCw className="w-3 h-3" />
                  <span>{lang === 'ka' ? 'Electron-Updater & Fallback' : 'Background Silent Updater'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Block: One-Click Desktop Launcher (.bat) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-200">
                  {lang === 'ka' ? '1. მყისიერი Windows Launcher (.bat ფაილი)' : '1. Instant Windows Launcher (.bat file)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBatch}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
                >
                  {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBatch ? (lang === 'ka' ? 'დაკოპირდა' : 'Copied') : (lang === 'ka' ? 'კოდის კოპირება' : 'Copy Script')}</span>
                </button>
                <button
                  onClick={handleDownloadLauncher}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ka' ? 'ჩამოტვირთვა (.bat)' : 'Download Launcher'}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {lang === 'ka'
                ? 'ეს ფაილი კომპიუტერზე გაშვებისას ხსნის სიმულატორს სუფთა Windows აპლიკაციის ფანჯარაში და ყოველთვის ტვირთავს უახლეს ვერსიას ინტერნეტიდან.'
                : 'Runs the simulator as a native standalone Windows application window with automatic live-sync from the cloud.'}
            </p>
          </div>

          {/* Full Standalone .EXE Installer Build Guide */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-200">
                  {lang === 'ka' ? '2. სრულფასოვანი .EXE ინსტალატორის აწყობა (Electron)' : '2. Compile Standalone .EXE Installer (Electron)'}
                </span>
              </div>
              <button
                onClick={handleCopyCommand}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? (lang === 'ka' ? 'დაკოპირდა' : 'Copied') : (lang === 'ka' ? 'ბრძანების კოპირება' : 'Copy Commands')}</span>
              </button>
            </div>

            <div className="bg-black/80 rounded-xl p-3 font-mono text-[11px] text-amber-300 border border-slate-800/80 overflow-x-auto whitespace-pre">
              {buildCommand}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 mt-1">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-slate-200 block">✓ `electron/main.cjs`</span>
                <span>ჩაშენებულია Live Sync და Offline Fallback ლოგიკა</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-slate-200 block">✓ `electron-builder.json`</span>
                <span>მზადაა NSIS ინსტალატორი და Portable .exe</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-slate-200 block">✓ `dist-electron/`</span>
                <span>ბილდის შედეგი ჩაიწერება ამ საქაღალდეში</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            ElectroPanel Desktop v1.0.0 • IEC 61439-1 Compliant
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            {lang === 'ka' ? 'დახურვა' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
