import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Upload,
  Plus,
  Trash2,
  Copy,
  Check,
  Zap,
  Shield,
  Lightbulb,
  Tv,
  Wind,
  Flame,
  Refrigerator,
  Droplets,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  X,
  FileUp,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ChevronDown,
  ChevronUp,
  Gauge,
  TrendingUp,
  Sun,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
} from 'recharts';
import { CircuitLoad, Language, LoadCategoryType, PlacedComponent, SimulationState, WireConnection } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { exportLoadsToExcel, exportLoadsToCsv, parseLoadsFromCsv } from '../engine/excelExportEngine';
import { exportLoadsToPdf } from '../engine/schedulePdfExportEngine';
import { COMPONENT_CATALOG } from '../data/componentCatalog';

const CATEGORY_COLORS: Record<LoadCategoryType, string> = {
  LIGHTING: '#F59E0B',      // Amber
  SOCKETS: '#3B82F6',       // Blue
  AC_CLIMATE: '#06B6D4',    // Cyan
  HEATING_BOILER: '#F43F5E',// Rose
  KITCHEN: '#10B981',       // Emerald
  WET_ROOM: '#6366F1',      // Indigo
  OUTDOOR: '#14B8A6',       // Teal
  GENERAL: '#8B5CF6',       // Purple
};

interface CircuitLoadScheduleProps {
  loads: CircuitLoad[];
  components: PlacedComponent[];
  wires: WireConnection[];
  lang: Language;
  simulationState: SimulationState;
  gridVoltage: number;
  onUpdateLoads: (newLoads: CircuitLoad[]) => void;
  onUpdateComponentPower?: (componentId: string, powerW: number) => void;
  onOpenPdfReport?: (filterMode?: 'ALL' | 'SCHEDULE_ONLY') => void;
  onOpenPanelAssembly?: () => void;
}

export const CircuitLoadSchedule: React.FC<CircuitLoadScheduleProps> = ({
  loads,
  components,
  wires,
  lang,
  simulationState,
  gridVoltage,
  onUpdateLoads,
  onUpdateComponentPower,
  onOpenPdfReport,
  onOpenPanelAssembly,
}) => {
  const isKa = lang === 'ka';
  const t = TRANSLATIONS[lang];

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [projectName, setProjectName] = useState(
    isKa ? 'საცხოვრებელი ბინის მთავარი გამანაწილებელი ფარი' : 'Residential Electrical Distribution Board'
  );
  const [engineerName, setEngineerName] = useState(
    isKa ? 'სერტიფიცირებული ინჟინერ-ელექტრიკოსი' : 'Certified Electrical Engineer'
  );

  // File Upload & CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    loads: CircuitLoad[];
    fileName: string;
  } | null>(null);

  const processCsvFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          setImportNotification({
            type: 'error',
            message: t.importErrorNotice || (isKa ? 'CSV ფაილი ცარიელია.' : 'CSV file is empty.'),
          });
          return;
        }
        const result = parseLoadsFromCsv(text);
        if (result.error || !result.loads || result.loads.length === 0) {
          setImportNotification({
            type: 'error',
            message:
              result.error ||
              t.importErrorNotice ||
              (isKa ? 'CSV ფაილის იმპორტი ვერ მოხერხდა.' : 'Failed to parse CSV file.'),
          });
          return;
        }

        // If loads list already has items, prompt replace vs append
        if (loads.length > 0) {
          setPendingImport({ loads: result.loads, fileName: file.name });
        } else {
          onUpdateLoads(result.loads);
          setImportNotification({
            type: 'success',
            message: (t.importSuccessNotice || 'Successfully imported {count} electrical circuits!').replace(
              '{count}',
              result.loads.length.toString()
            ),
          });
          setTimeout(() => setImportNotification(null), 5000);
        }
      } catch (err: any) {
        setImportNotification({
          type: 'error',
          message: err.message || (isKa ? 'შეცდომა ფაილის წაკითხვისას' : 'Error reading file'),
        });
      }
    };
    reader.onerror = () => {
      setImportNotification({
        type: 'error',
        message: isKa ? 'ფაილის წაკითხვა ვერ მოხერხდა' : 'Failed to read file',
      });
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCsvFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processCsvFile(file);
    }
  };

  const handleApplyPendingImport = (mode: 'replace' | 'append') => {
    if (!pendingImport) return;
    let finalLoads: CircuitLoad[];
    if (mode === 'replace') {
      finalLoads = pendingImport.loads;
    } else {
      // Append mode: make sure codes or IDs do not conflict
      const startIdx = loads.length;
      const appended = pendingImport.loads.map((l, i) => ({
        ...l,
        id: `load-imported-${Date.now()}-${startIdx + i + 1}`,
      }));
      finalLoads = [...loads, ...appended];
    }
    onUpdateLoads(finalLoads);
    setImportNotification({
      type: 'success',
      message: (t.importSuccessNotice || 'Successfully imported {count} electrical circuits!').replace(
        '{count}',
        pendingImport.loads.length.toString()
      ),
    });
    setPendingImport(null);
    setTimeout(() => setImportNotification(null), 5000);
  };

  // Available breakers placed on the DIN rails
  const availableBreakers = useMemo(() => {
    return components
      .filter((c) => {
        const meta = COMPONENT_CATALOG.find((m) => m.type === c.typeId);
        return (
          meta?.category === 'CIRCUIT_BREAKER' ||
          meta?.category === 'RCBO_DEVICE' ||
          c.typeId.includes('MCB') ||
          c.typeId.includes('RCBO')
        );
      })
      .map((b) => ({
        id: b.id,
        label: b.customLabel || `${b.typeId} (${b.customCurrentA || 16}A)`,
        ratingA: b.customCurrentA || 16,
      }));
  }, [components]);

  // Calculations & Totals
  const totalInstalledPowerW = useMemo(() => {
    return loads.reduce((sum, l) => sum + (l.powerW || 0), 0);
  }, [loads]);

  const totalInstalledPowerKw = (totalInstalledPowerW / 1000).toFixed(2);

  const totalDesignPowerKw = useMemo(() => {
    const totalW = loads.reduce((sum, l) => sum + (l.powerW || 0) * (l.demandFactor || 1), 0);
    return (totalW / 1000).toFixed(2);
  }, [loads]);

  const totalCalculatedCurrentA = useMemo(() => {
    const cur = loads.reduce((sum, l) => {
      const v = l.voltageV || gridVoltage || 230;
      const cos = l.cosPhi || 0.95;
      return sum + (l.powerW || 0) / (v * cos);
    }, 0);
    return cur.toFixed(2);
  }, [loads, gridVoltage]);

  // Recommended Main Breaker calculation
  const recommendedMainBreaker = useMemo(() => {
    const cur = Number(totalCalculatedCurrentA);
    if (cur > 63) return 'C80 (80A)';
    if (cur > 50) return 'C63 (63A)';
    if (cur > 40) return 'C50 (50A)';
    if (cur > 32) return 'C40 (40A)';
    if (cur > 25) return 'C32 (32A)';
    if (cur > 20) return 'C25 (25A)';
    return 'C20 (20A)';
  }, [totalCalculatedCurrentA]);

  // Unique rooms list for filter
  const roomList = useMemo(() => {
    const rooms = new Set<string>();
    loads.forEach((l) => {
      if (l.room) rooms.add(l.room);
    });
    return Array.from(rooms);
  }, [loads]);

  // Visual Load Profile Chart State & Calculations (using Recharts)
  const [chartMode, setChartMode] = useState<'BAR_CIRCUITS' | 'PIE_CATEGORIES' | 'BAR_ROOMS'>('BAR_CIRCUITS');
  const [showChart, setShowChart] = useState(true);

  // Category label helper
  const getCategoryLabel = (category: LoadCategoryType) => {
    switch (category) {
      case 'LIGHTING':
        return t.catLighting;
      case 'SOCKETS':
        return t.catSockets;
      case 'AC_CLIMATE':
        return t.catAcClimate;
      case 'HEATING_BOILER':
        return t.catHeating;
      case 'KITCHEN':
        return t.catKitchenApp;
      case 'WET_ROOM':
        return t.catWetRoom;
      case 'OUTDOOR':
        return t.catOutdoor || (isKa ? 'გარე განათება / ეზო' : 'Outdoor / Yard');
      default:
        return t.catGeneral;
    }
  };

  // Active circuits data mapped for Recharts
  const activeCircuitsChartData = useMemo(() => {
    return loads
      .filter((l) => l.isActive)
      .map((l) => {
        const powerW = l.powerW || 0;
        const powerKw = Number((powerW / 1000).toFixed(2));
        const volt = l.voltageV || gridVoltage || 230;
        const cosPhi = l.cosPhi || 0.95;
        const currentA = Number((powerW / (volt * cosPhi)).toFixed(2));
        const calcPowerKw = Number(((powerW * (l.demandFactor || 1.0)) / 1000).toFixed(2));
        const catName = getCategoryLabel(l.category);

        return {
          id: l.id,
          code: l.circuitCode,
          name: l.name,
          room: l.room || (isKa ? 'ზოგადი' : 'General'),
          category: l.category,
          categoryName: catName,
          powerW,
          powerKw,
          calcPowerKw,
          currentA,
          demandFactor: l.demandFactor || 1.0,
          breakerRatingA: l.breakerRatingA || 16,
          wireGaugeMm2: l.wireGaugeMm2 || 2.5,
          color: CATEGORY_COLORS[l.category] || '#8B5CF6',
        };
      });
  }, [loads, gridVoltage, isKa, t]);

  // Active Category Aggregation
  const categoryChartData = useMemo(() => {
    const map = new Map<LoadCategoryType, { count: number; totalW: number }>();
    loads.forEach((l) => {
      if (!l.isActive) return;
      const prev = map.get(l.category) || { count: 0, totalW: 0 };
      map.set(l.category, {
        count: prev.count + 1,
        totalW: prev.totalW + (l.powerW || 0),
      });
    });

    const activeTotalW = Array.from(map.values()).reduce((sum, v) => sum + v.totalW, 0) || 1;

    return Array.from(map.entries())
      .map(([cat, data]) => {
        const catLabel = getCategoryLabel(cat);

        return {
          category: cat,
          name: catLabel,
          value: data.totalW,
          powerKw: Number((data.totalW / 1000).toFixed(2)),
          percent: Number(((data.totalW / activeTotalW) * 100).toFixed(1)),
          circuitsCount: data.count,
          color: CATEGORY_COLORS[cat] || '#8B5CF6',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [loads, t]);

  // Active Room Aggregation
  const roomChartData = useMemo(() => {
    const map = new Map<string, { count: number; totalW: number }>();
    loads.forEach((l) => {
      if (!l.isActive) return;
      const room = l.room || (isKa ? 'ზოგადი' : 'General');
      const prev = map.get(room) || { count: 0, totalW: 0 };
      map.set(room, {
        count: prev.count + 1,
        totalW: prev.totalW + (l.powerW || 0),
      });
    });

    return Array.from(map.entries())
      .map(([room, data], idx) => ({
        room,
        powerW: data.totalW,
        powerKw: Number((data.totalW / 1000).toFixed(2)),
        count: data.count,
        color: ['#06B6D4', '#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899', '#14B8A6'][idx % 8],
      }))
      .sort((a, b) => b.powerW - a.powerW);
  }, [loads, isKa]);

  // Active KPI stats for chart header
  const activeCircuitsCount = activeCircuitsChartData.length;
  const activeTotalPowerW = activeCircuitsChartData.reduce((sum, c) => sum + c.powerW, 0);
  const activeTotalPowerKw = (activeTotalPowerW / 1000).toFixed(2);
  const peakCircuit = useMemo(() => {
    if (activeCircuitsChartData.length === 0) return null;
    return [...activeCircuitsChartData].sort((a, b) => b.powerW - a.powerW)[0];
  }, [activeCircuitsChartData]);
  const avgCircuitPowerW = activeCircuitsCount > 0 ? Math.round(activeTotalPowerW / activeCircuitsCount) : 0;

  // Filtered loads
  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
      const matchesSearch =
        searchQuery === '' ||
        load.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.circuitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (load.room && load.room.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRoom = selectedRoomFilter === 'ALL' || load.room === selectedRoomFilter;

      return matchesSearch && matchesRoom;
    });
  }, [loads, searchQuery, selectedRoomFilter]);

  // Handlers for Row Editing
  const handleUpdateLoad = (id: string, field: keyof CircuitLoad, value: any) => {
    const updated = loads.map((l) => {
      if (l.id === id) {
        const newLoad = { ...l, [field]: value };
        // If power was changed and has a linked component, notify component
        if (field === 'powerW' && l.componentId && onUpdateComponentPower) {
          onUpdateComponentPower(l.componentId, Number(value) || 0);
        }
        return newLoad;
      }
      return l;
    });
    onUpdateLoads(updated);
  };

  const handleAddLoad = () => {
    const newIdx = loads.length + 1;
    const newLoad: CircuitLoad = {
      id: `load-custom-${Date.now()}`,
      circuitCode: `Q${newIdx}`,
      name: isKa ? `ახალი მომხმარებელი ${newIdx}` : `New Appliance ${newIdx}`,
      room: isKa ? 'მისაღები' : 'Living Room',
      category: 'GENERAL',
      powerW: 1000,
      voltageV: 230,
      cosPhi: 0.95,
      breakerId: availableBreakers[0]?.id || 'mcb-sockets',
      breakerRatingA: availableBreakers[0]?.ratingA || 16,
      wireGaugeMm2: 2.5,
      cableType: 'NYM 3x2.5',
      demandFactor: 1.0,
      isActive: true,
      notes: '',
    };
    onUpdateLoads([...loads, newLoad]);
  };

  const handleDeleteLoad = (id: string) => {
    onUpdateLoads(loads.filter((l) => l.id !== id));
  };

  const handleSyncWithWires = () => {
    // Attempt auto-linking loads with breakers based on wire connections
    const updated = loads.map((load) => {
      if (!load.componentId) return load;
      // find wire connected to this load's terminal
      const connectedWire = wires.find(
        (w) => w.fromComponentId === load.componentId || w.toComponentId === load.componentId
      );
      if (connectedWire) {
        const otherCompId =
          connectedWire.fromComponentId === load.componentId
            ? connectedWire.toComponentId
            : connectedWire.fromComponentId;
        const matchingBreaker = availableBreakers.find((b) => b.id === otherCompId);
        if (matchingBreaker) {
          return {
            ...load,
            breakerId: matchingBreaker.id,
            breakerRatingA: matchingBreaker.ratingA,
          };
        }
      }
      return load;
    });
    onUpdateLoads(updated);
  };

  const handleCopyTsv = () => {
    const headers = [
      '№',
      'კოდი',
      'მომხმარებელი',
      'ოთახი',
      'კატეგორია',
      'სიმძლავრე (W)',
      'სიმძლავრე (kW)',
      'ძაბვა (V)',
      'cos φ',
      'დენი (A)',
      'ავტომატი',
      'კაბელი (მმ²)',
      'Kc',
      'გათვლილი (kW)',
    ];

    const rows = loads.map((l, idx) => {
      const powerW = l.powerW || 0;
      const powerKw = (powerW / 1000).toFixed(2);
      const volt = l.voltageV || 230;
      const cosPhi = l.cosPhi || 0.95;
      const currentA = (powerW / (volt * cosPhi)).toFixed(2);
      const demandFactor = l.demandFactor || 1.0;
      const calcPowerKw = ((powerW * demandFactor) / 1000).toFixed(2);

      return [
        idx + 1,
        l.circuitCode,
        l.name,
        l.room,
        l.category,
        powerW,
        powerKw,
        volt,
        cosPhi,
        currentA,
        l.breakerRatingA ? `C${l.breakerRatingA}` : l.breakerId,
        l.wireGaugeMm2 || 2.5,
        demandFactor,
        calcPowerKw,
      ].join('\t');
    });

    const text = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (cat: LoadCategoryType) => {
    switch (cat) {
      case 'LIGHTING':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case 'SOCKETS':
        return <Tv className="w-3.5 h-3.5 text-blue-400" />;
      case 'AC_CLIMATE':
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'HEATING_BOILER':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'KITCHEN':
        return <Refrigerator className="w-3.5 h-3.5 text-emerald-400" />;
      case 'WET_ROOM':
        return <Droplets className="w-3.5 h-3.5 text-indigo-400" />;
      case 'OUTDOOR':
        return <Sun className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Tooltip renderers for Recharts
  const renderCircuitTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs text-slate-100 min-w-[220px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20"
                style={{ backgroundColor: data.color }}
              />
              <span className="font-mono font-bold text-amber-400 text-sm">{data.code}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {data.categoryName}
            </span>
          </div>
          <div className="font-bold text-white mb-2 leading-tight">{data.name}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <span className="text-slate-400">{isKa ? 'დადგმული სიმძლავრე:' : 'Installed Power:'}</span>
            <span className="font-mono font-bold text-amber-300 text-right">
              {data.powerW} W ({data.powerKw} kW)
            </span>
            <span className="text-slate-400">{isKa ? 'გათვლილი (Kc-ით):' : 'Design (with Kc):'}</span>
            <span className="font-mono font-bold text-teal-300 text-right">
              {data.calcPowerKw} kW
            </span>
            <span className="text-slate-400">{isKa ? 'მიმდინარე დენი:' : 'Current Draw:'}</span>
            <span className="font-mono font-bold text-emerald-400 text-right">
              {data.currentA} A
            </span>
            <span className="text-slate-400">{isKa ? 'ოთახი:' : 'Room / Area:'}</span>
            <span className="text-slate-300 text-right truncate font-medium">{data.room}</span>
            <span className="text-slate-400">{isKa ? 'ავტომატი:' : 'Protective MCB:'}</span>
            <span className="font-mono text-slate-300 text-right">
              C{data.breakerRatingA}A ({data.wireGaugeMm2} მმ²)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs text-slate-100 min-w-[190px]">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800">
            <span className="w-3 h-3 rounded-full ring-2 ring-white/20" style={{ backgroundColor: data.color }} />
            <span className="font-bold text-white text-sm">{data.name}</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">{isKa ? 'ჯამური სიმძლავრე:' : 'Total Power:'}</span>
              <span className="font-mono font-bold text-amber-300">
                {data.powerKw} kW ({data.value} W)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isKa ? 'წილი ჯამში:' : 'Share of Load:'}</span>
              <span className="font-mono font-bold text-emerald-400">{data.percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isKa ? 'აქტიური წრედები:' : 'Active Circuits:'}</span>
              <span className="font-mono font-bold text-slate-300">
                {data.circuitsCount} {isKa ? 'წრედი' : 'circuits'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderRoomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs text-slate-100 min-w-[180px]">
          <div className="font-bold text-white text-sm mb-1.5 pb-1 border-b border-slate-800">
            {data.room}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">{isKa ? 'სიმძლავრე:' : 'Total Power:'}</span>
              <span className="font-mono font-bold text-teal-300">
                {data.powerKw} kW ({data.powerW} W)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isKa ? 'წრედების რაოდ.:' : 'Circuits Count:'}</span>
              <span className="font-mono font-bold text-slate-300">{data.count}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="relative flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto text-slate-100 flex flex-col items-center select-none"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
      }}
      onDrop={handleFileDrop}
    >
      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".csv,text/csv,text/plain"
        className="hidden"
        id="circuit-load-csv-file-input"
      />

      {/* Drag & Drop Visual Dropzone Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm border-4 border-dashed border-emerald-500 rounded-3xl m-4 flex flex-col items-center justify-center pointer-events-none p-6 text-center animate-in fade-in">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-xl shadow-emerald-950/50">
            <Upload className="w-10 h-10 animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">
            {isKa ? 'ჩააგდეთ CSV ფაილი იმპორტისთვის' : 'Drop CSV Schedule File Here'}
          </h3>
          <p className="text-sm text-slate-300 font-medium max-w-md">
            {t.dragDropCsvHint || (isKa ? 'გადმოათრიეთ .csv ფაილი ასატვირთად' : 'Drop .csv file here to import circuits')}
          </p>
        </div>
      )}

      {/* Import Notification Banner */}
      {importNotification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-top ${
            importNotification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {importNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{importNotification.message}</span>
          <button
            onClick={() => setImportNotification(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Import Strategy Modal */}
      {pendingImport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {isKa ? 'CSV განრიგის იმპორტი' : 'Import CSV Schedule'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{pendingImport.fileName}</p>
                </div>
              </div>
              <button
                onClick={() => setPendingImport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isKa
                ? `ფაილში ნაპოვნია ${pendingImport.loads.length} წრედი. მიუთითეთ, გსურთ არსებული ${loads.length} მომხმარებლის ჩანაცვლება თუ ახალი წრედების სიის ბოლოში დამატება:`
                : `Found ${pendingImport.loads.length} electrical circuits in file. Choose whether to replace current ${loads.length} loads or append to the existing list:`}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleApplyPendingImport('replace')}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer flex flex-col items-center gap-0.5"
              >
                <span>{isKa ? 'ჩანაცვლება' : 'Replace All'}</span>
                <span className="text-[10px] font-medium text-slate-900">
                  ({pendingImport.loads.length} {isKa ? 'წრედი' : 'circuits'})
                </span>
              </button>

              <button
                onClick={() => handleApplyPendingImport('append')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex flex-col items-center gap-0.5"
              >
                <span>{isKa ? 'სიის ბოლოში დამატება' : 'Append to List'}</span>
                <span className="text-[10px] font-medium text-emerald-200">
                  (+{pendingImport.loads.length} {isKa ? 'წრედი' : 'circuits'})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl flex flex-col gap-5">
        {/* Top Header & Actions Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {t.loadScheduleTitle}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  IEC 60364-5-52
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t.loadScheduleSubtitle}
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenPanelAssembly && (
              <button
                id="open-panel-assembly-from-schedule-btn"
                onClick={onOpenPanelAssembly}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 active:scale-95 transition cursor-pointer"
                title={isKa ? 'ავტომატების სიით ან Excel ფაილით აწყობილი კარადის გენერირება' : 'Auto-build electrical panel from breakers list or Excel'}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isKa ? '⚡ სიით კარადის აწყობა (Excel)' : '⚡ Build Panel (Excel)'}</span>
              </button>
            )}

            <button
              id="add-load-circuit-btn"
              onClick={handleAddLoad}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addCircuitBtn}</span>
            </button>

            <button
              id="import-csv-load-schedule-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 font-semibold text-xs border border-emerald-500/30 shadow-md transition cursor-pointer"
              title={isKa ? 'მომხმარებლების გრაფის იმპორტი CSV ფაილიდან (.csv)' : 'Import electrical load schedule from CSV file (.csv)'}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.importCsvBtn || (isKa ? 'CSV იმპორტი' : 'Import CSV')}</span>
            </button>

            <button
              id="export-excel-btn"
              onClick={() => exportLoadsToExcel(loads, lang, { projectName, engineerName, gridVoltage })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
              title="Download Microsoft Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t.exportExcelBtn}</span>
            </button>

            <button
              id="print-load-schedule-report-btn"
              onClick={() => onOpenPdfReport?.('SCHEDULE_ONLY')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
              title={isKa ? 'სრული ტექნიკური ანგარიშის ბეჭდვის მოდალის გახსნა დატვირთვების შემაჯამებელი გვერდით' : 'Open Print Dossier Modal specifically filtered to Circuit Load Summary page'}
            >
              <Printer className="w-4 h-4 text-blue-100" />
              <span>{t.printReportBtn || (isKa ? 'ანგარიშის ბეჭდვა (PDF)' : 'Print Report')}</span>
            </button>

            <button
              id="export-pdf-schedule-btn"
              onClick={() => exportLoadsToPdf(loads, lang, { projectName, engineerName, gridVoltage })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition cursor-pointer"
              title="Download print-ready Technical Passport PDF"
            >
              <FileText className="w-4 h-4" />
              <span>{t.exportPdfBtn}</span>
            </button>

            <button
              id="export-csv-btn"
              onClick={() => exportLoadsToCsv(loads, lang)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
              title="Download standard CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportCsvBtn}</span>
            </button>

            <button
              id="copy-schedule-btn"
              onClick={handleCopyTsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
              title="Copy table data"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.copiedNotice : t.copySchedule}</span>
            </button>

            <button
              id="sync-wires-btn"
              onClick={handleSyncWithWires}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
              title="Auto-detect connected MCBs from wiring canvas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.syncWithWires}</span>
            </button>
          </div>
        </div>

        {/* KPI Live Metric Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.installedCapacityTotal}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-400 font-mono">
                {totalInstalledPowerKw}
              </span>
              <span className="text-xs text-slate-400 font-bold">kW</span>
              <span className="text-[10px] text-slate-500 ml-1">({totalInstalledPowerW} W)</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.designCapacityTotal}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-teal-400 font-mono">
                {totalDesignPowerKw}
              </span>
              <span className="text-xs text-slate-400 font-bold">kW</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.maxPhaseCurrent}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-blue-400 font-mono">
                {totalCalculatedCurrentA}
              </span>
              <span className="text-xs text-slate-400 font-bold">A</span>
              <span className="text-[10px] text-slate-500 ml-1">(@ {gridVoltage}V)</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.recommendedMainMcb}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black text-emerald-400 font-mono">
                {recommendedMainBreaker}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.circuitsCount}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-purple-400 font-mono">
                {loads.length}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {isKa ? 'წრედი' : 'Circuits'}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Load Profile Chart (Recharts) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    {t.loadProfileChart}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                    {activeCircuitsCount} {isKa ? 'აქტიური' : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {t.loadProfileSubtitle}
                </p>
              </div>
            </div>

            {/* Quick KPI stats in chart header */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-slate-400 text-[11px]">{t.totalActivePower || (isKa ? 'აქტიური სიმძლავრე:' : 'Active Power:')}</span>
                  <span className="font-mono font-bold text-teal-300">{activeTotalPowerKw} kW</span>
                </div>
                <div className="h-3 w-px bg-slate-800" />
                {peakCircuit && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-slate-400 text-[11px]">{t.peakCircuitLoad || (isKa ? 'პიკური წრედი:' : 'Peak Load:')}</span>
                      <span className="font-mono font-bold text-rose-300">
                        {peakCircuit.code} ({peakCircuit.powerKw} kW)
                      </span>
                    </div>
                    <div className="h-3 w-px bg-slate-800" />
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">{t.averageCircuitPower || (isKa ? 'საშუალო/წრედი:' : 'Avg/Circuit:')}</span>
                  <span className="font-mono font-bold text-amber-300">{avgCircuitPowerW} W</span>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  id="chart-mode-circuits-btn"
                  onClick={() => {
                    setChartMode('BAR_CIRCUITS');
                    setShowChart(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                    chartMode === 'BAR_CIRCUITS' && showChart
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{t.chartByCircuit}</span>
                </button>

                <button
                  type="button"
                  id="chart-mode-categories-btn"
                  onClick={() => {
                    setChartMode('PIE_CATEGORIES');
                    setShowChart(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                    chartMode === 'PIE_CATEGORIES' && showChart
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  <span>{t.chartByCategory}</span>
                </button>

                <button
                  type="button"
                  id="chart-mode-rooms-btn"
                  onClick={() => {
                    setChartMode('BAR_ROOMS');
                    setShowChart(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                    chartMode === 'BAR_ROOMS' && showChart
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t.chartByRoom}</span>
                </button>
              </div>

              {/* Collapse/Expand Toggle */}
              <button
                type="button"
                id="toggle-load-profile-chart-btn"
                onClick={() => setShowChart(!showChart)}
                className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
                title={showChart ? (isKa ? 'გრაფიკის ჩაკეცვა' : 'Collapse Chart') : (isKa ? 'გრაფიკის გაშლა' : 'Expand Chart')}
              >
                {showChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Chart Content Area */}
          {showChart && (
            <div>
              {activeCircuitsChartData.length === 0 ? (
                <div className="py-12 px-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">
                    {isKa ? 'აქტიური წრედები არ მოიძებნა' : 'No Active Circuits'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {isKa
                      ? 'ჩართეთ სასურველი წრედების ჩამრთველები ქვედა ცხრილში (სტატუსის სვეტში) სიმძლავრის განაწილების გრაფიკის სანახავად.'
                      : 'Enable electrical circuits using the power switch toggles in the schedule table below to view the power profile.'}
                  </p>
                </div>
              ) : (
                <>
                  {chartMode === 'BAR_CIRCUITS' && (
                    <div className="flex flex-col gap-3">
                      <div className="w-full h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={activeCircuitsChartData}
                            margin={{ top: 15, right: 15, left: -5, bottom: 25 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
                            <XAxis
                              dataKey="code"
                              tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 'bold' }}
                              tickLine={{ stroke: '#475569' }}
                              axisLine={{ stroke: '#475569' }}
                              interval={0}
                            />
                            <YAxis
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              tickLine={{ stroke: '#475569' }}
                              axisLine={{ stroke: '#475569' }}
                              unit=" W"
                            />
                            <Tooltip
                              content={renderCircuitTooltip}
                              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            />
                            <Bar
                              dataKey="powerW"
                              radius={[6, 6, 0, 0]}
                              name={isKa ? 'სიმძლავრე (W)' : 'Power (W)'}
                            >
                              {activeCircuitsChartData.map((entry, index) => (
                                <Cell key={`cell-circuit-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Category Legend Bar at Bottom */}
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                        {Object.entries(CATEGORY_COLORS).map(([categoryKey, color]) => {
                          const count = activeCircuitsChartData.filter((c) => c.category === categoryKey).length;
                          if (count === 0) return null;
                          const label = getCategoryLabel(categoryKey as LoadCategoryType);

                          return (
                            <div
                              key={categoryKey}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800"
                            >
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-slate-300 font-medium">{label}</span>
                              <span className="text-[10px] text-slate-500 font-mono">({count})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {chartMode === 'PIE_CATEGORIES' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-2">
                      {/* Left Donut Chart */}
                      <div className="md:col-span-5 h-64 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip content={renderCategoryTooltip} />
                            <Pie
                              data={categoryChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={95}
                              paddingAngle={3}
                            >
                              {categoryChartData.map((entry, index) => (
                                <Cell key={`cell-pie-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xl font-black text-amber-400 font-mono">
                            {activeTotalPowerKw}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            kW Total
                          </span>
                        </div>
                      </div>

                      {/* Right Category Breakdown Cards */}
                      <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {categoryChartData.map((item) => (
                          <div
                            key={item.category}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="font-bold text-white text-xs">{item.name}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                {item.circuitsCount} {isKa ? 'წრედი' : 'ckt'}
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between">
                              <span className="font-mono font-bold text-amber-300 text-sm">
                                {item.powerKw} kW
                              </span>
                              <span className="font-mono font-bold text-emerald-400 text-xs">
                                {item.percent}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${item.percent}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {chartMode === 'BAR_ROOMS' && (
                    <div className="w-full h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={roomChartData}
                          margin={{ top: 15, right: 15, left: -5, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
                          <XAxis
                            dataKey="room"
                            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 'bold' }}
                            tickLine={{ stroke: '#475569' }}
                            axisLine={{ stroke: '#475569' }}
                          />
                          <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickLine={{ stroke: '#475569' }}
                            axisLine={{ stroke: '#475569' }}
                            unit=" kW"
                          />
                          <Tooltip
                            content={renderRoomTooltip}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                          />
                          <Bar
                            dataKey="powerKw"
                            radius={[6, 6, 0, 0]}
                            name={isKa ? 'სიმძლავრე (kW)' : 'Power (kW)'}
                          >
                            {roomChartData.map((entry, index) => (
                              <Cell key={`cell-room-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder={isKa ? 'ძიება წრედის სახელით, კოდით ან ოთახით...' : 'Search by circuit name, code or room...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 w-full focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">{t.allRooms}</option>
              {roomList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Interactive Load & Circuit Schedule Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2 text-center w-10">{t.colCircuitNum}</th>
                  <th className="py-3 px-2 w-16">{t.colCircuitCode}</th>
                  <th className="py-3 px-3 min-w-[200px]">{t.colName}</th>
                  <th className="py-3 px-2 w-28">{t.colRoom}</th>
                  <th className="py-3 px-2 w-28">{t.colCategory}</th>
                  <th className="py-3 px-2 text-right w-24">{t.colPowerW}</th>
                  <th className="py-3 px-2 text-right w-20">{t.colPowerKw}</th>
                  <th className="py-3 px-2 text-center w-16">{t.colVoltageV}</th>
                  <th className="py-3 px-2 text-center w-16">{t.colCosPhi}</th>
                  <th className="py-3 px-2 text-right w-20">{t.colCurrentA}</th>
                  <th className="py-3 px-2 w-32">{t.colBreaker}</th>
                  <th className="py-3 px-2 text-center w-24">{t.colWireGauge}</th>
                  <th className="py-3 px-2 text-center w-20">{t.colDemandFactor}</th>
                  <th className="py-3 px-2 text-right w-24">{t.colCalcPower}</th>
                  <th className="py-3 px-2 text-center w-16">{t.colStatus}</th>
                  <th className="py-3 px-2 text-center w-16">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredLoads.map((load, idx) => {
                  const powerW = load.powerW || 0;
                  const powerKw = (powerW / 1000).toFixed(2);
                  const volt = load.voltageV || gridVoltage || 230;
                  const cosPhi = load.cosPhi || 0.95;
                  const currentA = (powerW / (volt * cosPhi)).toFixed(2);
                  const demandFactor = load.demandFactor || 1.0;
                  const calcPowerKw = ((powerW * demandFactor) / 1000).toFixed(2);

                  // Sizing alert if power exceeds 16A on 1.5mm2
                  const hasOverloadRisk = Number(currentA) > 16 && (load.wireGaugeMm2 || 2.5) < 2.5;

                  return (
                    <tr
                      key={load.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        !load.isActive ? 'opacity-50 bg-slate-950/40' : ''
                      }`}
                    >
                      {/* 1. Index */}
                      <td className="py-2.5 px-2 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2. Circuit Code */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={load.circuitCode}
                          onChange={(e) => handleUpdateLoad(load.id, 'circuitCode', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono font-bold text-amber-400 text-xs text-center focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* 3. Consumer Description */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={load.name}
                          onChange={(e) => handleUpdateLoad(load.id, 'name', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-medium text-white text-xs focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* 4. Room / Location */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={load.room || ''}
                          placeholder={isKa ? 'ოთახი' : 'Room'}
                          onChange={(e) => handleUpdateLoad(load.id, 'room', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* 5. Category */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(load.category)}
                          <select
                            value={load.category}
                            onChange={(e) => handleUpdateLoad(load.id, 'category', e.target.value as LoadCategoryType)}
                            className="bg-slate-950 border border-slate-800 rounded px-1 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-amber-500"
                          >
                            <option value="LIGHTING">{t.catLighting}</option>
                            <option value="SOCKETS">{t.catSockets}</option>
                            <option value="AC_CLIMATE">{t.catAcClimate}</option>
                            <option value="HEATING_BOILER">{t.catHeating}</option>
                            <option value="KITCHEN">{t.catKitchenApp}</option>
                            <option value="WET_ROOM">{t.catWetRoom}</option>
                            <option value="GENERAL">{t.catGeneral}</option>
                          </select>
                        </div>
                      </td>

                      {/* 6. Power in Watts */}
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="50"
                            min="0"
                            value={load.powerW}
                            onChange={(e) => handleUpdateLoad(load.id, 'powerW', Number(e.target.value) || 0)}
                            className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono font-bold text-amber-300 text-xs text-right focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-slate-500 font-bold">W</span>
                        </div>
                      </td>

                      {/* 7. Power in kW */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300 font-semibold text-[11px]">
                        {powerKw} kW
                      </td>

                      {/* 8. Voltage */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-[11px]">
                        {volt}V
                      </td>

                      {/* 9. cos phi */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="1.0"
                          value={load.cosPhi || 0.95}
                          onChange={(e) => handleUpdateLoad(load.id, 'cosPhi', Number(e.target.value))}
                          className="w-12 bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-slate-300 text-xs text-center focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* 10. Current in Amperes */}
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasOverloadRisk && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" title="High current for wire gauge!" />
                          )}
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            {currentA} A
                          </span>
                        </div>
                      </td>

                      {/* 11. Protective Breaker */}
                      <td className="py-2.5 px-2">
                        <select
                          value={load.breakerId || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const b = availableBreakers.find((x) => x.id === selectedId);
                            handleUpdateLoad(load.id, 'breakerId', selectedId);
                            if (b) handleUpdateLoad(load.id, 'breakerRatingA', b.ratingA);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-amber-500"
                        >
                          <option value="">{isKa ? 'აირჩიეთ ავტომატი' : 'Select MCB'}</option>
                          {availableBreakers.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 12. Wire Gauge */}
                      <td className="py-2.5 px-2 text-center">
                        <select
                          value={load.wireGaugeMm2 || 2.5}
                          onChange={(e) => handleUpdateLoad(load.id, 'wireGaugeMm2', Number(e.target.value))}
                          className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-amber-500"
                        >
                          <option value={1.5}>1.5 mm² (Cu)</option>
                          <option value={2.5}>2.5 mm² (Cu)</option>
                          <option value={4.0}>4.0 mm² (Cu)</option>
                          <option value={6.0}>6.0 mm² (Cu)</option>
                          <option value={10.0}>10.0 mm² (Cu)</option>
                        </select>
                      </td>

                      {/* 13. Demand Factor (Kc) */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="1.0"
                          value={load.demandFactor || 1.0}
                          onChange={(e) => handleUpdateLoad(load.id, 'demandFactor', Number(e.target.value))}
                          className="w-14 bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-slate-300 text-xs text-center focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* 14. Calculated Power with Kc */}
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-teal-300 text-xs">
                        {calcPowerKw} kW
                      </td>

                      {/* 15. Active switch toggle */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleUpdateLoad(load.id, 'isActive', !load.isActive)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition cursor-pointer mx-auto ${
                            load.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-600 border border-slate-700'
                          }`}
                          title={load.isActive ? 'Active (ON)' : 'Inactive (OFF)'}
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* 16. Delete button */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteLoad(load.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                          title="Delete circuit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-500 uppercase font-bold text-[10px] block">
                  {t.installedCapacityTotal}
                </span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {totalInstalledPowerKw} kW ({totalInstalledPowerW} W)
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-bold text-[10px] block">
                  {t.designCapacityTotal}
                </span>
                <span className="font-mono font-black text-teal-400 text-sm">
                  {totalDesignPowerKw} kW
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-bold text-[10px] block">
                  {t.maxPhaseCurrent}
                </span>
                <span className="font-mono font-black text-blue-400 text-sm">
                  {totalCalculatedCurrentA} A
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddLoad}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addCircuitBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
