import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Copy,
  Zap,
  CheckCircle2,
  Layers,
  Settings2,
  Shield,
  Gauge,
  HelpCircle,
  X,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Language, CircuitLoad, PlacedComponent, WireConnection } from '../types';
import {
  BreakerListItem,
  DEFAULT_BREAKER_LISTS,
  generateBreakerListExcelTemplate,
  parseBreakerListFromExcel,
  buildAssembledPanelFromList,
  PanelAssemblyOptions,
} from '../engine/panelAssemblyGenerator';

interface PanelAssemblyModalProps {
  lang: Language;
  onApplyAssembledPanel: (result: {
    components: PlacedComponent[];
    wires: WireConnection[];
    circuitLoads: CircuitLoad[];
    numRails: number;
  }) => void;
  onClose: () => void;
}

export const PanelAssemblyModal: React.FC<PanelAssemblyModalProps> = ({
  lang,
  onApplyAssembledPanel,
  onClose,
}) => {
  const isKa = lang === 'ka';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active items in the table
  const [items, setItems] = useState<BreakerListItem[]>(() => {
    return JSON.parse(JSON.stringify(DEFAULT_BREAKER_LISTS[0].items));
  });

  // Selected Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>('standard-2-room');

  // Assembly Options
  const [options, setOptions] = useState<PanelAssemblyOptions>({
    projectName: isKa ? 'ჩემი ელექტრო კარადა' : 'My Electrical Panel',
    isThreePhase: false,
    gridVoltage: 230,
    includeMainInfeed: true,
    includeMainMcb: true,
    mainMcbCurrentA: 40,
    includeVoltageRelay: true,
    includeGroupRcd: true,
    groupRcdCurrentA: 40,
    groupRcdSensitivityMa: 30,
    includeNeutralBusbar: true,
    includeGroundBusbar: true,
    autoWire: true,
    maxUnitsPerRail: 18,
  });

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'SETTINGS'>('ITEMS');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Calculate live summary stats
  const totalBreakers = items.length;
  const totalPowerW = items.reduce((sum, it) => sum + (it.powerW || 0), 0);
  const totalPowerKw = (totalPowerW / 1000).toFixed(2);
  const totalUnits = items.reduce((sum, it) => {
    if (it.deviceType === 'RCBO') return sum + 2;
    if (it.deviceType === 'RCD') return sum + (it.poles === 4 ? 4 : 2);
    if (it.poles === 3) return sum + 3;
    if (it.poles === 4) return sum + 4;
    if (it.poles === 2) return sum + 2;
    return sum + 1;
  }, 0) + (options.includeMainInfeed ? (options.isThreePhase ? 5 : 3) : 0)
    + (options.includeMainMcb ? (options.isThreePhase ? 3 : 2) : 0)
    + (options.includeVoltageRelay ? 2 : 0)
    + (options.includeGroupRcd ? (options.isThreePhase ? 4 : 2) : 0)
    + (options.includeNeutralBusbar ? (items.length > 6 ? 4 : 3) : 0)
    + (options.includeGroundBusbar ? (items.length > 6 ? 4 : 3) : 0);

  const estimatedRails = Math.max(2, Math.ceil(totalUnits / (options.maxUnitsPerRail || 18)));
  const recommendedMainBreakerA = totalPowerW > 10000 ? (options.isThreePhase ? 50 : 63) : totalPowerW > 6000 ? 50 : 40;

  // Handle Preset Change
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom-empty') {
      setItems([]);
      return;
    }
    const found = DEFAULT_BREAKER_LISTS.find((p) => p.id === presetId);
    if (found) {
      setItems(JSON.parse(JSON.stringify(found.items)));
      setOptions((prev) => ({
        ...prev,
        isThreePhase: found.isThreePhase,
        gridVoltage: found.isThreePhase ? 400 : 230,
        mainMcbCurrentA: found.isThreePhase ? 50 : 40,
        includeVoltageRelay: !found.isThreePhase,
      }));
    }
  };

  // Add new blank row
  const handleAddRow = () => {
    const newItem: BreakerListItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${isKa ? 'ახალი წრედი' : 'New Circuit'} №${items.length + 1}`,
      deviceType: 'MCB',
      poles: 1,
      currentA: 16,
      curve: 'C',
      powerW: 1500,
      room: isKa ? 'მისაღები' : 'Living Room',
      category: 'SOCKETS',
      phase: options.isThreePhase ? 'L1' : 'L1',
      wireGaugeMm2: 2.5,
      cableType: 'NYM 3x2.5',
      createLoadSimulation: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update item field
  const handleUpdateItem = <K extends keyof BreakerListItem>(
    id: string,
    field: K,
    value: BreakerListItem[K]
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };

        // Auto update related fields for common electrical logic
        if (field === 'category') {
          if (value === 'LIGHTING') {
            updated.currentA = 10;
            updated.curve = 'B';
            updated.wireGaugeMm2 = 1.5;
            updated.cableType = 'NYM 3x1.5';
            updated.powerW = 150;
          } else if (value === 'AC_CLIMATE') {
            updated.currentA = 20;
            updated.curve = 'C';
            updated.wireGaugeMm2 = 2.5;
            updated.cableType = 'NYM 3x2.5';
            updated.powerW = 1800;
          } else if (value === 'KITCHEN' && updated.powerW >= 3000) {
            updated.currentA = 25;
            updated.curve = 'C';
            updated.wireGaugeMm2 = 4.0;
            updated.cableType = 'NYM 3x4.0';
          }
        }

        if (field === 'currentA') {
          const numA = Number(value);
          if (numA <= 10 && updated.wireGaugeMm2 > 1.5 && updated.category === 'LIGHTING') {
            updated.wireGaugeMm2 = 1.5;
            updated.cableType = 'NYM 3x1.5';
          } else if (numA >= 25 && updated.wireGaugeMm2 < 4.0) {
            updated.wireGaugeMm2 = 4.0;
            updated.cableType = 'NYM 3x4.0';
          } else if (numA >= 32 && updated.wireGaugeMm2 < 6.0) {
            updated.wireGaugeMm2 = 6.0;
            updated.cableType = 'NYM 3x6.0';
          }
        }

        return updated;
      })
    );
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Duplicate row
  const handleDuplicateRow = (id: string) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    const clone: BreakerListItem = {
      ...JSON.parse(JSON.stringify(it)),
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${it.name} (ასლი)`,
    };
    setItems((prev) => [...prev, clone]);
  };

  // Excel File Upload & Parse
  const handleFileUpload = async (file: File) => {
    try {
      setImportStatusMessage({
        text: isKa ? 'ფაილი მუშავდება...' : 'Processing Excel file...',
        type: 'info',
      });
      const parsedItems = await parseBreakerListFromExcel(file);
      if (parsedItems.length === 0) {
        setImportStatusMessage({
          text: isKa
            ? 'ფაილში მონაცემები ვერ მოიძებნა. გთხოვთ გამოიყენოთ Excel შაბლონი.'
            : 'No data found in file. Please use the Excel template.',
          type: 'error',
        });
        return;
      }
      setItems(parsedItems);
      setImportStatusMessage({
        text: isKa
          ? `წარმატებით ჩაიტვირთა ${parsedItems.length} ავტომატი Excel ფაილიდან!`
          : `Successfully imported ${parsedItems.length} breakers from Excel!`,
        type: 'success',
      });
      setSelectedPresetId('custom-excel');
    } catch (err: any) {
      console.error(err);
      setImportStatusMessage({
        text: isKa
          ? `შეცდომა ფაილის წაკითხვისას: ${err.message || 'უცნობი ფორმატი'}`
          : `Error reading file: ${err.message || 'Unknown format'}`,
        type: 'error',
      });
    }
  };

  // Build and emit full panel
  const handleBuildPanel = () => {
    if (items.length === 0) {
      alert(isKa ? 'გთხოვთ დაამატოთ მინიმუმ 1 ავტომატი!' : 'Please add at least 1 breaker!');
      return;
    }

    const assembled = buildAssembledPanelFromList(items, options);
    onApplyAssembledPanel(assembled);
    onClose();
  };

  return (
    <div
      id="panel-assembly-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden animate-fadeIn"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0]);
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {isKa ? 'ავტომატების სიით კარადის აწყობა' : 'Panel Auto-Builder from Breakers List'}
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Excel & Manual List
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKa
                  ? 'ჩაწერეთ ავტომატების ჩამონათვალი ნომინალებით ან ატვირთეთ Excel ფაილი სრულად აწყობილი ელექტრო კარადის მისაღებად'
                  : 'Specify breakers with ratings or upload an Excel spreadsheet to auto-generate a fully assembled electrical panel'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="close-panel-assembly-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title={isKa ? 'დახურვა' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-800/60 border-b border-slate-700/60 text-xs">
          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">{isKa ? 'შაბლონი:' : 'Preset:'}</span>
            <select
              id="preset-template-select"
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
            >
              {DEFAULT_BREAKER_LISTS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {isKa ? preset.nameKa : preset.nameEn}
                </option>
              ))}
              <option value="custom-empty">{isKa ? '🧹 სუფთა სია (ნულიდან)' : '🧹 Clean Blank List'}</option>
              <option value="custom-excel" disabled>
                {isKa ? '📄 ატვირთული Excel' : '📄 Uploaded Excel'}
              </option>
            </select>
          </div>

          {/* Import / Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="download-excel-template-btn"
              onClick={() => generateBreakerListExcelTemplate(lang)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-lg border border-slate-600 font-medium transition-all shadow-sm"
              title={isKa ? 'ჩამოტვირთეთ Excel (.xlsx) შაბლონი შესავსებად' : 'Download Excel (.xlsx) template'}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isKa ? 'Excel შაბლონის ჩამოტვირთვა' : 'Download Template (.xlsx)'}</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <button
              id="upload-excel-file-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg border border-emerald-500/50 font-medium transition-all shadow-sm"
              title={isKa ? 'ატვირთეთ თქვენი შევსებული Excel ფაილი' : 'Upload filled Excel file'}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isKa ? 'Excel-ის ატვირთვა' : 'Upload Excel (.xlsx)'}</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                activeTab === 'ITEMS'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isKa ? 'ავტომატების სია' : 'Breakers List'} ({items.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
                activeTab === 'SETTINGS'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{isKa ? 'კარადის კონფიგურაცია' : 'Panel Settings'}</span>
            </button>
          </div>
        </div>

        {/* Import notification alert */}
        <AnimatePresence>
          {importStatusMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`px-6 py-2 flex items-center justify-between text-xs border-b ${
                importStatusMessage.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : importStatusMessage.type === 'error'
                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                  : 'bg-blue-950/60 text-blue-300 border-blue-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>{importStatusMessage.text}</span>
              </div>
              <button
                onClick={() => setImportStatusMessage(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/90">
          {activeTab === 'ITEMS' && (
            <div className="space-y-4">
              {/* Header Action Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300 font-semibold">
                  <span>{isKa ? 'განაწილების ხაზები და ავტომატები' : 'Distribution Lines & Breakers'}</span>
                  <span className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 text-slate-400 rounded-full">
                    {items.length} {isKa ? 'ხაზი' : 'circuits'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="add-breaker-row-btn"
                    onClick={handleAddRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isKa ? '+ ხაზის დამატება' : '+ Add Circuit'}</span>
                  </button>
                  {items.length > 0 && (
                    <button
                      onClick={() => setItems([])}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-xs transition-colors"
                      title={isKa ? 'სიის გასუფთავება' : 'Clear List'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-700/80 rounded-xl overflow-hidden shadow-inner bg-slate-950/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700">
                        <th className="py-2.5 px-3 w-10 text-center">№</th>
                        <th className="py-2.5 px-3 min-w-[200px]">
                          {isKa ? 'დასახელება / მომხმარებელი' : 'Circuit / Consumer Label'}
                        </th>
                        <th className="py-2.5 px-2 w-28">{isKa ? 'ტიპი' : 'Type'}</th>
                        <th className="py-2.5 px-2 w-20 text-center">{isKa ? 'პოლუსი' : 'Poles'}</th>
                        <th className="py-2.5 px-2 w-24">{isKa ? 'ნომინალი' : 'Current'}</th>
                        <th className="py-2.5 px-2 w-20">{isKa ? 'მრუდი' : 'Curve'}</th>
                        <th className="py-2.5 px-2 w-28">{isKa ? 'სიმძლავრე (W)' : 'Power (W)'}</th>
                        <th className="py-2.5 px-2 w-32">{isKa ? 'კატეგორია' : 'Category'}</th>
                        <th className="py-2.5 px-2 w-28">{isKa ? 'ოთახი' : 'Room'}</th>
                        {options.isThreePhase && (
                          <th className="py-2.5 px-2 w-20 text-center">{isKa ? 'ფაზა' : 'Phase'}</th>
                        )}
                        <th className="py-2.5 px-2 w-24">{isKa ? 'კვეთა' : 'Wire'}</th>
                        <th className="py-2.5 px-3 w-20 text-center">{isKa ? 'მოქმედება' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Row Number */}
                          <td className="py-2 px-3 text-center text-slate-500 font-mono font-bold">
                            {idx + 1}
                          </td>

                          {/* Name / Label */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              placeholder={isKa ? 'მაგ: მისაღების განათება' : 'e.g. Living Room'}
                              className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-slate-100 text-xs font-medium"
                            />
                          </td>

                          {/* Device Type */}
                          <td className="py-2 px-2">
                            <select
                              value={item.deviceType}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'deviceType',
                                  e.target.value as BreakerListItem['deviceType']
                                )
                              }
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-slate-200 font-medium"
                            >
                              <option value="MCB">MCB (ავტომატი)</option>
                              <option value="RCBO">RCBO (დიფავტომატი)</option>
                              <option value="RCD">RCD (უზო)</option>
                              <option value="SPD">SPD (მუხტი)</option>
                              <option value="SMART_SWITCH">Smart WiFi</option>
                            </select>
                          </td>

                          {/* Poles */}
                          <td className="py-2 px-2 text-center">
                            <select
                              value={item.poles}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'poles',
                                  Number(e.target.value) as 1 | 2 | 3 | 4
                                )
                              }
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-center text-slate-200"
                            >
                              <option value={1}>1P</option>
                              <option value={2}>2P</option>
                              <option value={3}>3P</option>
                              <option value={4}>4P</option>
                            </select>
                          </td>

                          {/* Current A */}
                          <td className="py-2 px-2">
                            <select
                              value={item.currentA}
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'currentA', Number(e.target.value))
                              }
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs font-bold text-amber-400"
                            >
                              <option value={6}>6 A</option>
                              <option value={10}>10 A</option>
                              <option value={16}>16 A</option>
                              <option value={20}>20 A</option>
                              <option value={25}>25 A</option>
                              <option value={32}>32 A</option>
                              <option value={40}>40 A</option>
                              <option value={50}>50 A</option>
                              <option value={63}>63 A</option>
                            </select>
                          </td>

                          {/* Curve */}
                          <td className="py-2 px-2">
                            <select
                              value={item.curve}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'curve',
                                  e.target.value as 'B' | 'C' | 'D'
                                )
                              }
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-slate-200"
                            >
                              <option value="B">B-მრუდი</option>
                              <option value="C">C-მრუდი</option>
                              <option value="D">D-მრუდი</option>
                            </select>
                          </td>

                          {/* Power W */}
                          <td className="py-2 px-2">
                            <div className="relative">
                              <input
                                type="number"
                                step={50}
                                min={50}
                                max={30000}
                                value={item.powerW}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, 'powerW', Number(e.target.value))
                                }
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-right pr-6 text-slate-200"
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">
                                W
                              </span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2 px-2">
                            <select
                              value={item.category}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'category',
                                  e.target.value as BreakerListItem['category']
                                )
                              }
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-slate-300"
                            >
                              <option value="LIGHTING">{isKa ? '💡 განათება' : '💡 Lighting'}</option>
                              <option value="SOCKETS">{isKa ? '🔌 როზეტები' : '🔌 Sockets'}</option>
                              <option value="AC_CLIMATE">{isKa ? '❄️ კონდიციონერი' : '❄️ AC/Climate'}</option>
                              <option value="HEATING_BOILER">{isKa ? '🔥 ბოილერი/ქვაბი' : '🔥 Boiler/Heat'}</option>
                              <option value="KITCHEN">{isKa ? '🍳 სამზარეულო/ქურა' : '🍳 Kitchen/Stove'}</option>
                              <option value="WET_ROOM">{isKa ? '🚿 აბაზანა/სარეცხი' : '🚿 Wet Room'}</option>
                              <option value="OUTDOOR">{isKa ? '🌳 გარე ქსელი' : '🌳 Outdoor'}</option>
                              <option value="GENERAL">{isKa ? '⚙️ ზოგადი' : '⚙️ General'}</option>
                            </select>
                          </td>

                          {/* Room */}
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.room}
                              onChange={(e) => handleUpdateItem(item.id, 'room', e.target.value)}
                              placeholder={isKa ? 'ოთახი' : 'Room'}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-slate-200"
                            />
                          </td>

                          {/* Phase (for 3-Phase) */}
                          {options.isThreePhase && (
                            <td className="py-2 px-2 text-center">
                              <select
                                value={item.phase}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    'phase',
                                    e.target.value as 'L1' | 'L2' | 'L3'
                                  )
                                }
                                className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-center font-bold text-indigo-400"
                              >
                                <option value="L1">L1</option>
                                <option value="L2">L2</option>
                                <option value="L3">L3</option>
                              </select>
                            </td>
                          )}

                          {/* Wire Gauge */}
                          <td className="py-2 px-2">
                            <select
                              value={item.wireGaugeMm2}
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'wireGaugeMm2', Number(e.target.value))
                              }
                              className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded text-xs text-slate-300"
                            >
                              <option value={1.5}>1.5 მმ²</option>
                              <option value={2.5}>2.5 მმ²</option>
                              <option value={4.0}>4.0 მმ²</option>
                              <option value={6.0}>6.0 მმ²</option>
                              <option value={10.0}>10.0 მმ²</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleDuplicateRow(item.id)}
                                className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                                title={isKa ? 'დუბლირება' : 'Duplicate'}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRow(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                title={isKa ? 'წაშლა' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {items.length === 0 && (
                        <tr>
                          <td
                            colSpan={options.isThreePhase ? 12 : 11}
                            className="py-10 text-center text-slate-500"
                          >
                            <div className="flex flex-col items-center justify-center gap-2">
                              <FileSpreadsheet className="w-10 h-10 text-slate-600" />
                              <p className="text-sm font-medium">
                                {isKa ? 'სია ცარიელია' : 'Breaker list is empty'}
                              </p>
                              <p className="text-xs text-slate-500 max-w-sm">
                                {isKa
                                  ? 'დააჭირეთ "+ ხაზის დამატებას", აირჩიეთ მზა შაბლონი ან ატვირთეთ თქვენი Excel ფაილი'
                                  : 'Click "+ Add Circuit", choose a preset, or upload your Excel spreadsheet'}
                              </p>
                              <button
                                onClick={handleAddRow}
                                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                              >
                                <Plus className="w-4 h-4" />
                                <span>{isKa ? 'პირველი ხაზის დამატება' : 'Add First Circuit'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Panel Infeed & Protection Settings */}
              <div className="space-y-4 p-5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    {isKa ? 'ქსელის შემოსვლა და მთავარი დაცვა' : 'Grid Infeed & Main Protection'}
                  </h3>
                </div>

                {/* Grid Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isKa ? 'ქსელის ტიპი და ძაბვა' : 'Grid Infeed & Voltage'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          isThreePhase: false,
                          gridVoltage: 230,
                          mainMcbCurrentA: 40,
                          includeVoltageRelay: true,
                        }))
                      }
                      className={`p-3 text-left rounded-xl border transition-all ${
                        !options.isThreePhase
                          ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{isKa ? '1-ფაზა (230V)' : '1-Phase (230V)'}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isKa ? 'ბინა, ოფისი, საცხოვრებელი' : 'Apartment, Studio, Standard'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          isThreePhase: true,
                          gridVoltage: 400,
                          mainMcbCurrentA: 50,
                          includeVoltageRelay: false,
                        }))
                      }
                      className={`p-3 text-left rounded-xl border transition-all ${
                        options.isThreePhase
                          ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{isKa ? '3-ფაზა (3x400V)' : '3-Phase (3x400V)'}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isKa ? 'კერძო სახლი, საწარმო, ქვაბი' : 'Private house, Factory, Heavy'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Main MCB */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="opt-main-mcb"
                      checked={options.includeMainMcb}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, includeMainMcb: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    <label htmlFor="opt-main-mcb" className="text-xs font-semibold text-slate-200">
                      {isKa ? 'მთავარი შემავალი ავტომატი (Main MCB)' : 'Main Breaker (Main MCB)'}
                    </label>
                  </div>
                  {options.includeMainMcb && (
                    <select
                      value={options.mainMcbCurrentA}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, mainMcbCurrentA: Number(e.target.value) }))
                      }
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-amber-400 font-bold rounded text-xs"
                    >
                      <option value={32}>C32 A</option>
                      <option value={40}>C40 A</option>
                      <option value={50}>C50 A</option>
                      <option value={63}>C63 A</option>
                    </select>
                  )}
                </div>

                {/* Voltage Relay */}
                {!options.isThreePhase && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="opt-vrelay"
                        checked={options.includeVoltageRelay}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            includeVoltageRelay: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                      />
                      <label htmlFor="opt-vrelay" className="text-xs font-semibold text-slate-200">
                        {isKa
                          ? 'ციფრული ძაბვის რელე 63A (Voltage Relay)'
                          : 'Digital Voltage Protection Relay 63A'}
                      </label>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">175V - 260V</span>
                  </div>
                )}

                {/* Group RCD */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="opt-group-rcd"
                      checked={options.includeGroupRcd}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, includeGroupRcd: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    <label htmlFor="opt-group-rcd" className="text-xs font-semibold text-slate-200">
                      {isKa ? 'საერთო უზო (Group RCD / УЗО)' : 'Group RCD (Earth Leakage Protection)'}
                    </label>
                  </div>
                  {options.includeGroupRcd && (
                    <select
                      value={options.groupRcdSensitivityMa}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          groupRcdSensitivityMa: Number(e.target.value),
                        }))
                      }
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-indigo-300 font-bold rounded text-xs"
                    >
                      <option value={30}>30 mA</option>
                      <option value={100}>100 mA</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Busbars & Wiring Topology */}
              <div className="space-y-4 p-5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    {isKa ? 'შინები და ავტომატური შეერთება' : 'Busbars & Automated Wiring'}
                  </h3>
                </div>

                {/* Neutral Busbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="opt-nbusbar"
                      checked={options.includeNeutralBusbar}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          includeNeutralBusbar: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    <label htmlFor="opt-nbusbar" className="text-xs font-semibold text-slate-200">
                      {isKa ? 'ნოლის შემკრები შინა (N-Busbar)' : 'Neutral Busbar (N-Bar)'}
                    </label>
                  </div>
                  <span className="text-[11px] text-blue-400 font-medium">100A DIN</span>
                </div>

                {/* Ground Busbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="opt-pebusbar"
                      checked={options.includeGroundBusbar}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          includeGroundBusbar: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    <label htmlFor="opt-pebusbar" className="text-xs font-semibold text-slate-200">
                      {isKa ? 'დამიწების შემკრები შინა (PE-Busbar)' : 'Grounding Busbar (PE-Bar)'}
                    </label>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium">125A Brass</span>
                </div>

                {/* Auto Wiring */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="opt-autowire"
                      checked={options.autoWire}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, autoWire: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    <div>
                      <label htmlFor="opt-autowire" className="text-xs font-semibold text-white">
                        {isKa ? 'სრული ავტო-შეერთება (Auto-Wiring)' : 'Complete Auto-Wiring'}
                      </label>
                      <p className="text-[11px] text-slate-400">
                        {isKa
                          ? 'ავტომატურად გაიყვანს ყველა ფაზის, ნოლისა და დამიწების მავთულს'
                          : 'Automatically routes all Line, Neutral, and Ground wires'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rail Capacity */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-300">
                    {isKa ? 'DIN რელსის ტევადობა (მოდულები)' : 'DIN Rail Capacity (Units per rail)'}
                  </label>
                  <select
                    value={options.maxUnitsPerRail}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, maxUnitsPerRail: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs"
                  >
                    <option value={12}>12 მოდული (პატარა ფარი)</option>
                    <option value={18}>18 მოდული (სტანდარტული ფარი)</option>
                    <option value={24}>24 მოდული (გაფართოებული ფარი)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-950 border-t border-slate-800">
          {/* Summary Metric Chips */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400">{isKa ? 'ავტომატები:' : 'Breakers:'}</span>
              <span className="font-bold text-white">{totalBreakers}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400">{isKa ? 'სიმძლავრე:' : 'Load:'}</span>
              <span className="font-bold text-amber-400">{totalPowerKw} kW</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400">{isKa ? 'მოდულები:' : 'DIN Units:'}</span>
              <span className="font-bold text-indigo-400">{totalUnits}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400">{isKa ? 'რელსები:' : 'Rails:'}</span>
              <span className="font-bold text-emerald-400">{estimatedRails} რელსი</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              {isKa ? 'გაუქმება' : 'Cancel'}
            </button>

            <button
              id="assemble-and-build-panel-btn"
              onClick={handleBuildPanel}
              disabled={items.length === 0}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold shadow-lg transition-all ${
                items.length > 0
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-98 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{isKa ? '⚡ აწყობილი კარადის გენერირება' : '⚡ Build & Assemble Panel'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
