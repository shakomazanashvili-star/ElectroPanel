import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Layers,
  Cpu,
  Radio,
  Shield,
  Zap,
  Flame,
  CheckSquare,
  Square,
  Copy,
  Scissors,
  ClipboardPaste,
  ClipboardCheck,
  Sparkles,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  Power,
  PowerOff,
  Check,
  X,
  MousePointer,
  RotateCcw,
} from 'lucide-react';
import {
  ActiveTool,
  Language,
  PanelClipboard,
  PanelThermalState,
  PlacedComponent,
  SimulationState,
  Terminal,
  ThermalPalette,
  WireColorType,
  WireConnection,
  WireGauge,
  WireRoutingState,
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
  selectedComponentIds?: string[];
  onSelectComponentIds?: (ids: string[] | ((prev: string[]) => string[])) => void;
  onBatchDeleteComponents?: (ids: string[]) => void;
  onBatchDuplicateComponents?: (ids: string[]) => string[] | void;
  onBatchMoveToRail?: (ids: string[], railId: string) => void;
  onBatchShiftPositions?: (ids: string[], direction: 'LEFT' | 'RIGHT') => void;
  onBatchTogglePower?: (ids: string[], targetState?: boolean) => void;
  clipboard?: PanelClipboard | null;
  onCopyComponents?: (ids?: string[]) => { count: number; wiresCount: number } | void;
  onCutComponents?: (ids?: string[]) => { count: number; wiresCount: number } | void;
  onPasteComponents?: (targetRailId?: string) => { count: number; wiresCount: number; railId: string } | null | void;
  onCopyComponent?: (id: string) => { count: number; wiresCount: number } | void;
  simulationState: SimulationState;
  wiringStartTerminal: { componentId: string; terminalId: string; type: string } | null;
  selectedColor: WireColorType;
  selectedGauge: WireGauge;
  thermalState?: PanelThermalState;
  routingState?: WireRoutingState;
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
  selectedComponentIds,
  onSelectComponentIds,
  onBatchDeleteComponents,
  onBatchDuplicateComponents,
  onBatchMoveToRail,
  onBatchShiftPositions,
  onBatchTogglePower,
  clipboard,
  onCopyComponents,
  onCutComponents,
  onPasteComponents,
  onCopyComponent,
  simulationState,
  wiringStartTerminal,
  selectedColor,
  selectedGauge,
  thermalState,
  routingState,
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
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
  const [activeRailId, setActiveRailId] = useState<string>('rail-1');
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    sub?: string;
    icon?: string;
    type: 'info' | 'success' | 'warn';
  } | null>(null);
  const t = TRANSLATIONS[lang];

  const showToast = useCallback((
    message: string,
    sub?: string,
    icon = '📋',
    type: 'info' | 'success' | 'warn' = 'info'
  ) => {
    const id = Date.now();
    setToast({ id, message, sub, icon, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 2800);
  }, []);

  // Effective Selection State
  const selectedIds = selectedComponentIds ?? localSelectedIds;
  const setSelectedIds = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      if (onSelectComponentIds) {
        onSelectComponentIds(updater);
      } else {
        setLocalSelectedIds(updater);
      }
    },
    [onSelectComponentIds]
  );

  // Update activeRailId when selecting components
  useEffect(() => {
    if (selectedIds.length > 0) {
      const firstSelected = components.find((c) => selectedIds.includes(c.id));
      if (firstSelected) {
        setActiveRailId(firstSelected.railId);
      }
    }
  }, [selectedIds, components]);

  // Marquee Rubberband Selection State
  const [isMarqueeDragging, setIsMarqueeDragging] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);

  const inspectingComp = internalInspectingComp;
  const isThermalActive = thermalState?.isThermalOverlayActive ?? false;
  const isMultiSelectMode = activeTool === 'MULTI_SELECT';

  const handleInspect = (comp: PlacedComponent) => {
    if (onInspectThermal) {
      onInspectThermal(comp);
    } else {
      setInternalInspectingComp(comp);
    }
  };

  // Toggle single component selection
  const handleToggleSelect = useCallback(
    (componentId: string, event?: React.MouseEvent) => {
      setSelectedIds((prev) => {
        if (event?.shiftKey || isMultiSelectMode) {
          if (prev.includes(componentId)) {
            return prev.filter((id) => id !== componentId);
          } else {
            return [...prev, componentId];
          }
        } else {
          if (prev.includes(componentId) && prev.length === 1) {
            return [];
          }
          return [componentId];
        }
      });
    },
    [isMultiSelectMode, setSelectedIds]
  );

  // Select all components
  const handleSelectAll = useCallback(() => {
    setSelectedIds(components.map((c) => c.id));
    showToast(
      lang === 'ka' ? `მონიშნულია ყველა (${components.length})` : `Selected all (${components.length})`,
      undefined,
      '🔘',
      'info'
    );
  }, [components, setSelectedIds, showToast, lang]);

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  // Invert selection
  const handleInvertSelection = useCallback(() => {
    setSelectedIds((prev) => {
      const prevSet = new Set(prev);
      return components.filter((c) => !prevSet.has(c.id)).map((c) => c.id);
    });
  }, [components, setSelectedIds]);

  // Batch delete action
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (onBatchDeleteComponents) {
      onBatchDeleteComponents(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteComponent(id));
      setSelectedIds([]);
    }
    showToast(
      lang === 'ka' ? `წაიშალა ${count} მოწყობილობა` : `Deleted ${count} device${count > 1 ? 's' : ''}`,
      undefined,
      '🗑️',
      'warn'
    );
  }, [selectedIds, onBatchDeleteComponents, onDeleteComponent, setSelectedIds, showToast, lang]);

  // Batch duplicate action
  const handleBatchDuplicate = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (onBatchDuplicateComponents) {
      onBatchDuplicateComponents(selectedIds);
    } else {
      selectedIds.forEach((id) => onDuplicateComponent(id));
    }
    showToast(
      lang === 'ka' ? `დუბლირებულია ${selectedIds.length} მოწყობილობა` : `Duplicated ${selectedIds.length} device${selectedIds.length > 1 ? 's' : ''}`,
      undefined,
      '✨',
      'success'
    );
  }, [selectedIds, onBatchDuplicateComponents, onDuplicateComponent, showToast, lang]);

  // Clipboard: Copy action
  const handleCopy = useCallback(
    (targetIds?: string[]) => {
      const ids = targetIds && targetIds.length > 0 ? targetIds : selectedIds;
      if (ids.length === 0) return;
      if (onCopyComponents) {
        const res = onCopyComponents(ids);
        if (res && res.count > 0) {
          showToast(
            lang === 'ka' ? `დაკოპირდა ${res.count} მოწყობილობა (Cmd+C)` : `Copied ${res.count} device${res.count > 1 ? 's' : ''} (Cmd+C)`,
            res.wiresCount > 0
              ? (lang === 'ka' ? `⚡ ${res.wiresCount} შიდა შეერთებით` : `⚡ with ${res.wiresCount} internal wire${res.wiresCount > 1 ? 's' : ''}`)
              : undefined,
            '📋',
            'info'
          );
        }
      }
    },
    [selectedIds, onCopyComponents, showToast, lang]
  );

  // Clipboard: Cut action
  const handleCut = useCallback(
    (targetIds?: string[]) => {
      const ids = targetIds && targetIds.length > 0 ? targetIds : selectedIds;
      if (ids.length === 0) return;
      if (onCutComponents) {
        const res = onCutComponents(ids);
        if (res && res.count > 0) {
          showToast(
            lang === 'ka' ? `ამოიჭრა ${res.count} მოწყობილობა (Cmd+X)` : `Cut ${res.count} device${res.count > 1 ? 's' : ''} (Cmd+X)`,
            lang === 'ka' ? 'შენახულია ბუფერში' : 'Saved to clipboard',
            '✂️',
            'warn'
          );
        }
      }
    },
    [selectedIds, onCutComponents, showToast, lang]
  );

  // Clipboard: Paste action
  const handlePaste = useCallback(
    (targetRailId?: string) => {
      const effectiveRail = targetRailId || activeRailId || 'rail-1';
      if (onPasteComponents) {
        const res = onPasteComponents(effectiveRail);
        if (res && res.count > 0) {
          const railNum = res.railId.replace('rail-', '');
          showToast(
            lang === 'ka' ? `ჩასმულია ${res.count} მოწყობილობა რელსზე #${railNum}` : `Pasted ${res.count} device${res.count > 1 ? 's' : ''} to Rail #${railNum}`,
            res.wiresCount > 0
              ? (lang === 'ka' ? `⚡ ${res.wiresCount} შიდა მავთული აღდგენილია` : `⚡ ${res.wiresCount} internal wire${res.wiresCount > 1 ? 's' : ''} restored`)
              : undefined,
            '📥',
            'success'
          );
        } else {
          showToast(
            lang === 'ka' ? 'ბუფერი ცარიელია' : 'Clipboard is empty',
            lang === 'ka' ? 'ჯერ მონიშნეთ მოწყობილობები და დააჭირეთ Cmd+C' : 'Select components and press Cmd+C first',
            'ℹ️',
            'warn'
          );
        }
      }
    },
    [activeRailId, onPasteComponents, showToast, lang]
  );

  // Batch move to rail action
  const handleBatchMoveToTargetRail = useCallback(
    (railId: string) => {
      if (selectedIds.length === 0) return;
      if (onBatchMoveToRail) {
        onBatchMoveToRail(selectedIds, railId);
        setActiveRailId(railId);
        showToast(
          lang === 'ka' ? `გადატანილია რელსზე #${railId.replace('rail-', '')}` : `Moved to Rail #${railId.replace('rail-', '')}`,
          undefined,
          '↔️',
          'info'
        );
      }
    },
    [selectedIds, onBatchMoveToRail, showToast, lang]
  );

  // Batch shift left / right
  const handleBatchShift = useCallback(
    (direction: 'LEFT' | 'RIGHT') => {
      if (selectedIds.length === 0) return;
      if (onBatchShiftPositions) {
        onBatchShiftPositions(selectedIds, direction);
      }
    },
    [selectedIds, onBatchShiftPositions]
  );

  // Batch power switch
  const handleBatchPower = useCallback(
    (targetOn: boolean) => {
      if (selectedIds.length === 0) return;
      if (onBatchTogglePower) {
        onBatchTogglePower(selectedIds, targetOn);
      }
    },
    [selectedIds, onBatchTogglePower]
  );

  // Keyboard shortcuts (Escape, Delete, Backspace, Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X, Ctrl/Cmd+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDeselectAll();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleBatchDelete();
        }
      } else if (isModifier && key === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (isModifier && key === 'c') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleCopy();
        }
      } else if (isModifier && key === 'x') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleCut();
        }
      } else if (isModifier && key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (isModifier && key === 'd') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleBatchDuplicate();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedIds,
    handleDeselectAll,
    handleBatchDelete,
    handleSelectAll,
    handleCopy,
    handleCut,
    handlePaste,
    handleBatchDuplicate,
  ]);

  // Handle marquee start
  const handlePanelMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[id^="term-"]')
    ) {
      return;
    }

    if (isMultiSelectMode || e.shiftKey) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setMarqueeStart({ x: e.clientX, y: e.clientY });
      setMarqueeCurrent({ x: e.clientX, y: e.clientY });
      setIsMarqueeDragging(true);

      if (!e.shiftKey && !isMultiSelectMode) {
        setSelectedIds([]);
      }
    }
  };

  // Handle marquee dragging and selection calculation
  const handlePanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMarqueeDragging || !marqueeStart || !containerRef.current) return;
    setMarqueeCurrent({ x: e.clientX, y: e.clientY });

    const left = Math.min(marqueeStart.x, e.clientX);
    const top = Math.min(marqueeStart.y, e.clientY);
    const right = Math.max(marqueeStart.x, e.clientX);
    const bottom = Math.max(marqueeStart.y, e.clientY);

    const intersectedIds: string[] = [];
    components.forEach((comp) => {
      const compEl = document.getElementById(`comp-${comp.id}`);
      if (compEl) {
        const rect = compEl.getBoundingClientRect();
        const isIntersecting = !(
          rect.right < left ||
          rect.left > right ||
          rect.bottom < top ||
          rect.top > bottom
        );
        if (isIntersecting) {
          intersectedIds.push(comp.id);
        }
      }
    });

    if (e.shiftKey) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...intersectedIds])));
    } else {
      setSelectedIds(intersectedIds);
    }
  };

  const handlePanelMouseUp = () => {
    if (isMarqueeDragging) {
      setIsMarqueeDragging(false);
      setMarqueeStart(null);
      setMarqueeCurrent(null);
    }
  };

  // Group components by rail
  const rails: { id: string; label: string; components: PlacedComponent[] }[] = [];
  for (let i = 1; i <= numRails; i++) {
    const railId = `rail-${i}`;
    rails.push({
      id: railId,
      label: `${t.rail} #${i}`,
      components: components
        .filter((c) => c.railId === railId)
        .sort((a, b) => a.positionIndex - b.positionIndex),
    });
  }

  // Calculate marquee visual rectangle relative to containerRef
  let marqueeRect = null;
  if (isMarqueeDragging && marqueeStart && marqueeCurrent && containerRef.current) {
    const containerRect = containerRef.current.getBoundingClientRect();
    const left = Math.min(marqueeStart.x, marqueeCurrent.x) - containerRect.left + containerRef.current.scrollLeft;
    const top = Math.min(marqueeStart.y, marqueeCurrent.y) - containerRect.top + containerRef.current.scrollTop;
    const width = Math.abs(marqueeCurrent.x - marqueeStart.x);
    const height = Math.abs(marqueeCurrent.y - marqueeStart.y);
    marqueeRect = { left, top, width, height };
  }

  const hasClipboardItems = !!(clipboard && clipboard.components && clipboard.components.length > 0);

  return (
    <div
      className="flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto flex flex-col items-center relative select-none"
      onMouseMove={handlePanelMouseMove}
      onMouseUp={handlePanelMouseUp}
    >
      {/* Toast Notification HUD */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-900/40 ring-2 ring-emerald-500/20'
              : toast.type === 'warn'
              ? 'bg-amber-950/90 border-amber-500/60 text-amber-100 shadow-amber-900/40 ring-2 ring-amber-500/20'
              : 'bg-indigo-950/90 border-indigo-500/60 text-indigo-100 shadow-indigo-900/40 ring-2 ring-indigo-500/20'
          }`}>
            <span className="text-lg">{toast.icon}</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold font-sans">{toast.message}</span>
              {toast.sub && (
                <span className="text-[10px] text-slate-300 font-mono">{toast.sub}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Outer Distribution Board Enclosure Chassis */}
      <div
        ref={containerRef}
        onMouseDown={handlePanelMouseDown}
        className="w-full max-w-6xl min-w-[720px] bg-slate-900/90 border-2 border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col gap-8 backdrop-blur-md"
      >
        {/* ========================================================= */}
        {/* 🌟 FLOATING BATCH ACTION & CLIPBOARD BAR */}
        {/* ========================================================= */}
        {(selectedIds.length > 0 || isMultiSelectMode || hasClipboardItems) && (
          <div className="sticky top-0 z-40 w-full flex flex-col gap-2 -mt-2 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="w-full bg-slate-950/95 border-2 border-indigo-500/50 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-slate-100 ring-4 ring-indigo-500/10">
              {/* 1. Left: Selection Status & Quick Select Tools */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold font-mono">
                    {selectedIds.length} / {components.length}{' '}
                    <span className="font-sans font-semibold text-slate-300">
                      {lang === 'ka' ? 'მონიშნულია' : 'Selected'}
                    </span>
                  </span>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-800">
                  <button
                    id="btn-select-all"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title={lang === 'ka' ? 'ყველა მოწყობილობის მონიშვნა (Ctrl+A / Cmd+A)' : 'Select all devices (Ctrl+A / Cmd+A)'}
                  >
                    {t.selectAll}
                  </button>
                  <button
                    id="btn-invert-select"
                    onClick={handleInvertSelection}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                    title={lang === 'ka' ? 'მონიშვნის ინვერსია' : 'Invert selection'}
                  >
                    {t.invertSelection}
                  </button>
                  {selectedIds.length > 0 && (
                    <button
                      id="btn-deselect-all"
                      onClick={handleDeselectAll}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-900/60 transition cursor-pointer flex items-center gap-1"
                      title={lang === 'ka' ? 'მონიშვნის გაუქმება (Escape)' : 'Deselect all (Escape)'}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t.deselectAll}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Middle & Right: Clipboard & Batch Operations */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Copy Button (Cmd+C) */}
                <button
                  id="btn-clipboard-copy"
                  onClick={() => handleCopy()}
                  disabled={selectedIds.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    selectedIds.length > 0
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-400 hover:bg-indigo-600 hover:text-white shadow-md'
                      : 'bg-slate-900/50 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                  title={lang === 'ka' ? 'მონიშნულების კოპირება ბუფერში (Cmd+C / Ctrl+C)' : 'Copy selected to clipboard (Cmd+C / Ctrl+C)'}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyBatch}</span>
                </button>

                {/* Cut Button (Cmd+X) */}
                <button
                  id="btn-clipboard-cut"
                  onClick={() => handleCut()}
                  disabled={selectedIds.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    selectedIds.length > 0
                      ? 'bg-amber-600/30 text-amber-200 border-amber-500 hover:bg-amber-600 hover:text-slate-950 shadow-md'
                      : 'bg-slate-900/50 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                  title={lang === 'ka' ? 'ამოჭრა ბუფერში (Cmd+X / Ctrl+X)' : 'Cut to clipboard (Cmd+X / Ctrl+X)'}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{t.cutBatch}</span>
                </button>

                {/* Paste Button (Cmd+V) */}
                <button
                  id="btn-clipboard-paste"
                  onClick={() => handlePaste(activeRailId)}
                  disabled={!hasClipboardItems}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    hasClipboardItems
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20 animate-pulse'
                      : 'bg-slate-900/50 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                  }`}
                  title={
                    hasClipboardItems
                      ? `${lang === 'ka' ? 'ჩასმა აქტიურ რელსზე' : 'Paste into active rail'} #${activeRailId.replace('rail-', '')} (${clipboard?.components.length} items, ${clipboard?.internalWires?.length || 0} wires) (Cmd+V)`
                      : lang === 'ka'
                      ? 'ბუფერი ცარიელია'
                      : 'Clipboard is empty'
                  }
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>
                    {t.pasteClipboard}
                    {hasClipboardItems ? ` (${clipboard?.components.length})` : ''}
                  </span>
                </button>

                {/* Batch Move to Rail Selector */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                      {t.moveToRail}:
                    </span>
                    <div className="flex items-center gap-1">
                      {rails.map((rail, idx) => (
                        <button
                          key={rail.id}
                          onClick={() => handleBatchMoveToTargetRail(rail.id)}
                          className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition cursor-pointer border border-slate-700"
                          title={`${lang === 'ka' ? 'გადატანა' : 'Move to'} ${rail.label}`}
                        >
                          #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Batch Position Shift Left / Right */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => handleBatchShift('LEFT')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title={lang === 'ka' ? 'პოზიციის გადანაცვლება მარცხნივ' : 'Shift position Left'}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleBatchShift('RIGHT')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title={lang === 'ka' ? 'პოზიციის გადანაცვლება მარჯვნივ' : 'Shift position Right'}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Batch Power Controls */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => handleBatchPower(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-800 hover:text-white text-xs font-semibold transition cursor-pointer"
                      title={lang === 'ka' ? 'მონიშნულების ჩართვა (ON)' : 'Turn all selected ON'}
                    >
                      <Power className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.batchSwitchOn}</span>
                    </button>
                    <button
                      onClick={() => handleBatchPower(false)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-semibold transition cursor-pointer"
                      title={lang === 'ka' ? 'მონიშნულების გამორთვა (OFF)' : 'Turn all selected OFF'}
                    >
                      <PowerOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.batchSwitchOff}</span>
                    </button>
                  </div>
                )}

                {/* Batch Duplicate Button */}
                {selectedIds.length > 0 && (
                  <button
                    id="btn-batch-duplicate"
                    onClick={handleBatchDuplicate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition cursor-pointer"
                    title={lang === 'ka' ? 'მონიშნული კომპონენტების დუბლირება (Ctrl+D / Cmd+D)' : 'Duplicate selected devices (Ctrl+D / Cmd+D)'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {t.duplicateBatch} ({selectedIds.length})
                    </span>
                  </button>
                )}

                {/* Batch Delete Button */}
                {selectedIds.length > 0 && (
                  <button
                    id="btn-batch-delete"
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md text-xs font-bold transition cursor-pointer"
                    title={lang === 'ka' ? 'მონიშნული კომპონენტების წაშლა (Delete)' : 'Delete selected devices (Delete)'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {t.deleteBatch} ({selectedIds.length})
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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

        {/* Wiring SVG Overlay with Intelligent Pathfinding and Cable Ducts */}
        <WiringCanvas
          wires={wires}
          components={components}
          numRails={numRails}
          activeTool={activeTool}
          simulationState={simulationState}
          wiringStartTerminal={wiringStartTerminal}
          selectedColor={selectedColor}
          selectedGauge={selectedGauge}
          routingState={routingState}
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

        {/* Rubberband Marquee Selection Visual Box */}
        {marqueeRect && (
          <div
            className="absolute z-50 border-2 border-indigo-400 bg-indigo-500/20 rounded-md pointer-events-none shadow-lg shadow-indigo-500/20 backdrop-blur-[1px]"
            style={{
              left: `${marqueeRect.left}px`,
              top: `${marqueeRect.top}px`,
              width: `${marqueeRect.width}px`,
              height: `${marqueeRect.height}px`,
            }}
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
              {selectedIds.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono border border-indigo-700/80 flex items-center gap-1 animate-pulse">
                  <CheckSquare className="w-3 h-3 text-indigo-400" />
                  {selectedIds.length} {lang === 'ka' ? 'მონიშნულია' : 'Selected'}
                </span>
              )}
              {hasClipboardItems && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 font-mono border border-emerald-700/80 flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                  {clipboard?.components.length} {lang === 'ka' ? 'ბუფერშია' : 'in clipboard'}
                </span>
              )}
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
        {rails.map((rail, idx) => {
          const isActive = activeRailId === rail.id;

          return (
            <div
              key={rail.id}
              onClick={() => setActiveRailId(rail.id)}
              className={`relative flex flex-col gap-2 z-10 transition-all rounded-2xl p-1.5 ${
                isActive
                  ? 'ring-1 ring-amber-400/40 bg-amber-500/[0.02]'
                  : 'hover:bg-slate-800/10'
              }`}
            >
              {/* Rail Label & Actions */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 font-bold transition-colors ${
                    isActive ? 'text-amber-300' : 'text-slate-300'
                  }`}>
                    <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                    {rail.label}
                  </span>
                  {isActive && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans font-bold border border-amber-500/30">
                      {lang === 'ka' ? '🎯 აქტიური სამიზნე (Cmd+V)' : '🎯 Active Target (Cmd+V)'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick Paste directly to this rail button */}
                  {hasClipboardItems && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePaste(rail.id);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-800 hover:text-white text-[11px] font-semibold transition cursor-pointer"
                      title={`${lang === 'ka' ? 'ჩასმა ამ რელსზე' : 'Paste onto this rail'} (${clipboard?.components.length} ${lang === 'ka' ? 'მოწყობილობა' : 'items'})`}
                    >
                      <ClipboardPaste className="w-3 h-3 text-emerald-400" />
                      <span>{t.pasteHere}</span>
                    </button>
                  )}

                  {numRails > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRail(idx + 1);
                      }}
                      className="text-slate-500 hover:text-rose-400 text-[11px] flex items-center gap-1 transition cursor-pointer"
                      title={t.removeRail}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.removeRail}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Physical Metallic DIN Rail Backplate & Slots */}
              <div className={`relative min-h-[200px] bg-slate-950/70 border rounded-2xl p-4 flex items-center shadow-inner overflow-x-auto transition-colors ${
                isActive ? 'border-amber-500/40 shadow-amber-500/5' : 'border-slate-800'
              }`}>
                {/* Metallic Perforated DIN Rail Track (35mm Standard) */}
                <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-9 bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 rounded border border-slate-500 shadow-inner flex items-center justify-between px-4 opacity-30 pointer-events-none">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="w-3 h-4 bg-slate-800/80 rounded-xs border border-slate-600/60" />
                  ))}
                </div>

                {/* Placed Components on this DIN Rail */}
                <div className="relative z-10 flex items-center gap-2 min-w-full">
                  {rail.components.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-6 text-slate-500 text-xs border-2 border-dashed border-slate-800 rounded-xl gap-2">
                      <p>{t.emptyRail}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenCatalogForRail(rail.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-semibold transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t.addComponent}</span>
                        </button>

                        {hasClipboardItems && (
                          <button
                            onClick={() => handlePaste(rail.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold transition cursor-pointer"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5" />
                            <span>
                              {lang === 'ka'
                                ? `ჩასმა ბუფერიდან (${clipboard?.components.length})`
                                : `Paste from Clipboard (${clipboard?.components.length})`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {rail.components.map((comp) => (
                        <ComponentCard
                          key={comp.id}
                          component={comp}
                          lang={lang}
                          activeTool={activeTool}
                          isSelected={selectedIds.includes(comp.id)}
                          isMultiSelectMode={isMultiSelectMode}
                          onToggleSelect={handleToggleSelect}
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
                          onCopyComponent={() => handleCopy([comp.id])}
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
          );
        })}

        {/* Bottom Corner Screw Rivets & Helpful wiring/multi-select/clipboard tip */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 z-10 text-[11px] text-slate-500">
          <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500 shadow-inner" />
          <div className="font-mono">
            {isMultiSelectMode || selectedIds.length > 0
              ? lang === 'ka'
                ? '✨ ცხელი ღილაკები: Cmd+C (კოპირება) • Cmd+V (ჩასმა) • Cmd+X (ამოჭრა) • Cmd+D (დუბლირება) • Delete (წაშლა) • Ctrl+A (ყველა)'
                : '✨ Shortcuts: Cmd+C (Copy) • Cmd+V (Paste) • Cmd+X (Cut) • Cmd+D (Duplicate) • Delete (Remove) • Ctrl+A (Select All)'
              : lang === 'ka'
              ? '💡 რჩევა: დააკლიკეთ ტერმინალებს მავთულის გასაყვანად. მონიშნეთ მოწყობილობები Cmd+C / Cmd+V ბუფერული კოპირებისთვის.'
              : '💡 Tip: Click terminals to draw wires. Select components and press Cmd+C / Cmd+V for clipboard copy & paste.'}
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

