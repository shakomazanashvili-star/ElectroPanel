import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ActiveTool,
  BreakerCustomizationSettings,
  CircuitLoad,
  ComponentMetadata,
  Language,
  PanelClipboard,
  PanelConfig,
  PanelPhoto,
  PanelThermalState,
  PlacedComponent,
  Terminal,
  ThermalPalette,
  WireColorType,
  WireConnection,
  WireGauge,
  WireRoutingState,
  WireRoutingStyle,
} from './types';
import { PRESETS } from './data/presets';
import { COMPONENT_CATALOG } from './data/componentCatalog';
import { runSimulation } from './engine/simulationEngine';
import { calculateThermalState, generateThermalAlerts } from './engine/thermalEngine';
import { Header } from './components/Header';
import { WireControlBar } from './components/WireControlBar';
import { ComponentPalette } from './components/ComponentPalette';
import { DinRailPanel } from './components/DinRailPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { SchematicView } from './components/SchematicView';
import { BomModal } from './components/BomModal';
import { CircuitLoadSchedule } from './components/CircuitLoadSchedule';
import { FloorPlanDesigner } from './components/FloorPlanDesigner';
import { BreakerCustomizerModal } from './components/BreakerCustomizerModal';
import { ConnectionManagerModal } from './components/ConnectionManagerModal';
import { ThermalInspectorModal } from './components/ThermalInspectorModal';
import { PdfReportModal } from './components/PdfReportModal';
import { WindowsUpdateModal } from './components/WindowsUpdateModal';
import { PanelAssemblyModal } from './components/PanelAssemblyModal';
import { WireOptimizerModal } from './components/WireOptimizerModal';
import { PanelQrModal } from './components/PanelQrModal';
import { TechnicianSummaryView } from './components/TechnicianSummaryView';

export default function App() {
  // 1. Language & Main View state
  const [lang, setLang] = useState<Language>('ka');
  const [activeView, setActiveView] = useState<'PANEL' | 'FLOORPLAN' | 'SCHEDULE' | 'SCHEMATIC' | 'BOM'>('PANEL');

  // 2. Interactive Tool & Wiring state
  const [activeTool, setActiveTool] = useState<ActiveTool>('SELECT');
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<WireColorType>('PHASE_BROWN');
  const [selectedGauge, setSelectedGauge] = useState<WireGauge>(2.5);
  const [wiringStartTerminal, setWiringStartTerminal] = useState<{
    componentId: string;
    terminalId: string;
    type: string;
  } | null>(null);

  // 3. Modals state
  const [customizingBreaker, setCustomizingBreaker] = useState<PlacedComponent | null>(null);
  const [isCreatingNewBreaker, setIsCreatingNewBreaker] = useState<boolean>(false);
  const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState<boolean>(false);
  const [inspectingThermalComp, setInspectingThermalComp] = useState<PlacedComponent | null>(null);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState<boolean>(false);
  const [pdfReportFilter, setPdfReportFilter] = useState<'ALL' | 'SCHEDULE_ONLY'>('ALL');
  const [isWindowsModalOpen, setIsWindowsModalOpen] = useState<boolean>(false);
  const [isPanelAssemblyOpen, setIsPanelAssemblyOpen] = useState<boolean>(false);
  const [isWireOptimizerOpen, setIsWireOptimizerOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isTechnicianSummaryOpen, setIsTechnicianSummaryOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.includes('view=tech_summary');
    }
    return false;
  });

  // 4. Grid Simulation Settings
  const [gridPowerOn, setGridPowerOn] = useState<boolean>(true);
  const [gridVoltage, setGridVoltage] = useState<number>(230);

  // 5. Thermal Intensity Map Settings
  const [isThermalOverlayActive, setIsThermalOverlayActive] = useState<boolean>(false);
  const [thermalPalette, setThermalPalette] = useState<ThermalPalette>('FLIR_IRONBOW');
  const [thermalOpacity, setThermalOpacity] = useState<number>(0.78);
  const [showTemperatureBadges, setShowTemperatureBadges] = useState<boolean>(true);
  const [showHeatPlumes, setShowHeatPlumes] = useState<boolean>(true);

  // 6. Panel Layout & Wiring Data (Loaded with 3-Room Modern Apartment Preset)
  const defaultPreset = PRESETS[0];
  const [numRails, setNumRails] = useState<number>(defaultPreset.numRails);
  const [components, setComponents] = useState<PlacedComponent[]>(defaultPreset.components);
  const [wires, setWires] = useState<WireConnection[]>(defaultPreset.wires);

  // Custom User Presets (Persisted in localStorage)
  const [customPresets, setCustomPresets] = useState<PanelConfig[]>(() => {
    try {
      const saved = localStorage.getItem('electropanel_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Clipboard State (Cmd+C / Cmd+V support for components & internal wires)
  const [clipboard, setClipboard] = useState<PanelClipboard | null>(() => {
    try {
      const saved = localStorage.getItem('electropanel_clipboard');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const saveClipboard = (clip: PanelClipboard | null) => {
    setClipboard(clip);
    try {
      if (clip) {
        localStorage.setItem('electropanel_clipboard', JSON.stringify(clip));
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(
            JSON.stringify({
              type: 'ELECTROPANEL_CLIPBOARD_V1',
              data: clip,
            })
          ).catch(() => {});
        }
      } else {
        localStorage.removeItem('electropanel_clipboard');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Recent Components State (Tracks last 5 components added to DIN rails to speed up panel assembly)
  const [recentComponentTypes, setRecentComponentTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('electropanel_recent_components');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
      }
    } catch (e) {
      // fallback
    }
    // Default initial popular components
    return ['MCB_1P_16A', 'MCB_1P_10A', 'RCD_2P_40A_30MA', 'VOLTAGE_RELAY', 'MCB_2P_MAIN'];
  });

  const recordRecentComponent = (componentType: string) => {
    if (!componentType) return;
    setRecentComponentTypes((prev) => {
      const filtered = prev.filter((t) => t !== componentType);
      const updated = [componentType, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('electropanel_recent_components', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearRecentComponents = () => {
    setRecentComponentTypes([]);
    try {
      localStorage.removeItem('electropanel_recent_components');
    } catch (e) {}
  };

  const recentComponentsList = useMemo(() => {
    return recentComponentTypes
      .map((type) => COMPONENT_CATALOG.find((c) => c.type === type))
      .filter((c): c is ComponentMetadata => c !== undefined);
  }, [recentComponentTypes]);

  const [projectObservations, setProjectObservations] = useState<string>(() => {
    try {
      return localStorage.getItem('electropanel_site_observations') || '';
    } catch {
      return '';
    }
  });

  const [projectPhotos, setProjectPhotos] = useState<PanelPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('electropanel_site_photos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 6a. Circuit & Consumer Load Schedule State (მომხმარებლების გრაფა / ცხრილი)
  const [circuitLoads, setCircuitLoads] = useState<CircuitLoad[]>([
    {
      id: 'load-q1',
      circuitCode: 'Q1',
      name: 'ჭერის LED განათება',
      room: 'მისაღები / დერეფანი',
      category: 'LIGHTING',
      powerW: 150,
      voltageV: 230,
      cosPhi: 0.95,
      breakerId: 'mcb-light',
      breakerRatingA: 10,
      wireGaugeMm2: 1.5,
      cableType: 'NYM 3x1.5',
      demandFactor: 0.9,
      isActive: true,
      componentId: 'load-lights-1',
    },
    {
      id: 'load-q2',
      circuitCode: 'Q2',
      name: 'მისაღების როზეტები',
      room: 'მისაღები',
      category: 'SOCKETS',
      powerW: 1800,
      voltageV: 230,
      cosPhi: 0.95,
      breakerId: 'mcb-sockets',
      breakerRatingA: 16,
      wireGaugeMm2: 2.5,
      cableType: 'NYM 3x2.5',
      demandFactor: 0.7,
      isActive: true,
      componentId: 'load-tv-1',
    },
    {
      id: 'load-q3',
      circuitCode: 'Q3',
      name: 'ინვერტორული კონდიციონერი',
      room: 'მისაღები',
      category: 'AC_CLIMATE',
      powerW: 1500,
      voltageV: 230,
      cosPhi: 0.92,
      breakerId: 'mcb-ac',
      breakerRatingA: 20,
      wireGaugeMm2: 2.5,
      cableType: 'NYM 3x2.5',
      demandFactor: 0.8,
      isActive: true,
      componentId: 'load-ac-1',
    },
    {
      id: 'load-q4',
      circuitCode: 'Q4',
      name: 'წყლის გამაცხელებელი ბოილერი',
      room: 'აბაზანა',
      category: 'HEATING_BOILER',
      powerW: 2000,
      voltageV: 230,
      cosPhi: 1.0,
      breakerId: 'mcb-boiler',
      breakerRatingA: 20,
      wireGaugeMm2: 2.5,
      cableType: 'NYM 3x2.5',
      demandFactor: 1.0,
      isActive: true,
      componentId: 'load-boiler-1',
    },
    {
      id: 'load-q5',
      circuitCode: 'Q5',
      name: 'სარეცხი მანქანა',
      room: 'აბაზანა / სველი წერტილი',
      category: 'WET_ROOM',
      powerW: 2200,
      voltageV: 230,
      cosPhi: 0.9,
      breakerId: 'mcb-sockets',
      breakerRatingA: 16,
      wireGaugeMm2: 2.5,
      cableType: 'NYM 3x2.5',
      demandFactor: 0.8,
      isActive: true,
    },
    {
      id: 'load-q6',
      circuitCode: 'Q6',
      name: 'სამზარეულოს ჩასაშენებელი ქურა',
      room: 'სამზარეულო',
      category: 'KITCHEN',
      powerW: 3500,
      voltageV: 230,
      cosPhi: 0.98,
      breakerId: 'mcb-ac',
      breakerRatingA: 20,
      wireGaugeMm2: 4.0,
      cableType: 'NYM 3x4.0',
      demandFactor: 0.7,
      isActive: true,
    },
  ]);

  const handleUpdateLoadComponentPower = (componentId: string, powerW: number) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === componentId ? { ...c, customPowerW: powerW } : c))
    );
  };

  // 6b. Wire Auto-Routing State & Duct Stratification Settings
  const [wireRoutingState, setWireRoutingState] = useState<WireRoutingState>({
    isAutoRouted: true,
    style: 'ORTHOGONAL_DUCT',
    showCableDucts: true,
    cornerRadius: 12,
    laneSeparation: 6,
    totalCrossingsBefore: 0,
    totalCrossingsAfter: 0,
    totalLengthMm: 0,
  });

  const handleAutoRouteWires = () => {
    setWireRoutingState((prev) => ({
      ...prev,
      isAutoRouted: true,
    }));
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.25 },
    });
  };

  const handleChangeRoutingStyle = (style: WireRoutingStyle) => {
    setWireRoutingState((prev) => ({
      ...prev,
      style,
      isAutoRouted: true,
    }));
  };

  const handleToggleCableDucts = () => {
    setWireRoutingState((prev) => ({
      ...prev,
      showCableDucts: !prev.showCableDucts,
    }));
  };

  // 7. Run Live Electrical Simulation Engine
  const baseSimulationState = useMemo(() => {
    return runSimulation(components, wires, gridPowerOn, gridVoltage);
  }, [components, wires, gridPowerOn, gridVoltage]);

  // 8. Run Thermodynamic Finite Heat Simulation Engine
  const thermalState: PanelThermalState = useMemo(() => {
    const rawThermal = calculateThermalState(components, wires, baseSimulationState, 25.0);
    return {
      ...rawThermal,
      isThermalOverlayActive,
      palette: thermalPalette,
      opacity: thermalOpacity,
      showTemperatureBadges,
      showHeatPlumes,
    };
  }, [components, wires, baseSimulationState, isThermalOverlayActive, thermalPalette, thermalOpacity, showTemperatureBadges, showHeatPlumes]);

  // 9. Combined Simulation State with Thermal Safety Hazards & Derating Alerts
  const simulationState = useMemo(() => {
    const thermalAlerts = generateThermalAlerts(thermalState, components);
    return {
      ...baseSimulationState,
      safetyAlerts: [...baseSimulationState.safetyAlerts, ...thermalAlerts],
    };
  }, [baseSimulationState, thermalState, components]);

  // Terminal Click Handler (Interactive Wiring Engine)
  const handleTerminalClick = (componentId: string, terminal: Terminal) => {
    // If not in wiring mode or no start terminal yet, begin wiring
    if (!wiringStartTerminal) {
      // Auto-pick wire color based on terminal type for convenience
      if (terminal.type === 'NEUTRAL') {
        setSelectedColor('NEUTRAL_BLUE');
      } else if (terminal.type === 'GROUND') {
        setSelectedColor('GROUND_GREEN_YELLOW');
      } else if (terminal.type === 'PHASE_L1' || terminal.type === 'PHASE') {
        setSelectedColor('PHASE_BROWN');
      } else if (terminal.type === 'PHASE_L2') {
        setSelectedColor('PHASE_BLACK');
      } else if (terminal.type === 'PHASE_L3') {
        setSelectedColor('PHASE_GREY');
      }

      setWiringStartTerminal({
        componentId,
        terminalId: terminal.id,
        type: terminal.type,
      });
      setActiveTool('WIRE');
    } else {
      // Complete wire connection
      if (
        wiringStartTerminal.componentId === componentId &&
        wiringStartTerminal.terminalId === terminal.id
      ) {
        // Clicked the same terminal -> cancel
        setWiringStartTerminal(null);
        return;
      }

      // Check if connection already exists
      const exists = wires.some(
        (w) =>
          (w.fromComponentId === wiringStartTerminal.componentId &&
            w.fromTerminalId === wiringStartTerminal.terminalId &&
            w.toComponentId === componentId &&
            w.toTerminalId === terminal.id) ||
          (w.toComponentId === wiringStartTerminal.componentId &&
            w.toTerminalId === wiringStartTerminal.terminalId &&
            w.fromComponentId === componentId &&
            w.fromTerminalId === terminal.id)
      );

      if (!exists) {
        const newWire: WireConnection = {
          id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fromComponentId: wiringStartTerminal.componentId,
          fromTerminalId: wiringStartTerminal.terminalId,
          toComponentId: componentId,
          toTerminalId: terminal.id,
          color: selectedColor,
          gauge: selectedGauge,
        };

        setWires((prev) => [...prev, newWire]);
      }

      setWiringStartTerminal(null);
    }
  };

  // Toggle breaker switch
  const handleToggleSwitch = (componentId: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id === componentId) {
          return {
            ...c,
            isOn: !c.isOn,
            isTripped: false, // reset trip on manual flip
          };
        }
        return c;
      })
    );
  };

  // Test RCD button
  const handleTestRcd = (componentId: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id === componentId) {
          return {
            ...c,
            isOn: false,
            isTripped: true,
            tripReason: 'RCD Test Button Pressed (Simulated Differential Leakage)',
          };
        }
        return c;
      })
    );
  };

  // Delete component and attached wires
  const handleDeleteComponent = (componentId: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== componentId));
    setWires((prev) =>
      prev.filter(
        (w) => w.fromComponentId !== componentId && w.toComponentId !== componentId
      )
    );
  };

  // Duplicate component
  const handleDuplicateComponent = (componentId: string) => {
    const orig = components.find((c) => c.id === componentId);
    if (!orig) return;
    const newComp: PlacedComponent = {
      ...orig,
      id: `comp-${Date.now()}`,
      positionIndex: orig.positionIndex + 1,
      customLabel: `${orig.customLabel} (Copy)`,
    };
    setComponents((prev) => [...prev, newComp]);
  };

  // Batch Delete components
  const handleBatchDeleteComponents = (componentIds: string[]) => {
    const idSet = new Set(componentIds);
    setComponents((prev) => prev.filter((c) => !idSet.has(c.id)));
    setWires((prev) =>
      prev.filter(
        (w) => !idSet.has(w.fromComponentId) && !idSet.has(w.toComponentId)
      )
    );
    setSelectedComponentIds([]);
  };

  // Batch Duplicate components
  const handleBatchDuplicateComponents = (componentIds: string[]) => {
    const idSet = new Set(componentIds);
    const toClone = components.filter((c) => idSet.has(c.id));
    if (toClone.length === 0) return [];
    
    const now = Date.now();
    const newComps: PlacedComponent[] = toClone.map((orig, index) => ({
      ...orig,
      id: `comp-${now}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      positionIndex: orig.positionIndex + 1,
      customLabel: `${orig.customLabel} (Copy)`,
    }));
    
    setComponents((prev) => [...prev, ...newComps]);
    const newIds = newComps.map((c) => c.id);
    setSelectedComponentIds(newIds);
    return newIds;
  };

  // Clipboard: Copy selected components & their internal wires
  const handleCopyComponents = (componentIds?: string[]) => {
    const idsToCopy = componentIds && componentIds.length > 0 ? componentIds : selectedComponentIds;
    if (idsToCopy.length === 0) return { count: 0, wiresCount: 0 };

    const idSet = new Set(idsToCopy);
    const compsToCopy = components.filter((c) => idSet.has(c.id));
    if (compsToCopy.length === 0) return { count: 0, wiresCount: 0 };

    // Find internal wires where BOTH fromComponentId and toComponentId are in the selection
    const internalWires = wires.filter(
      (w) => idSet.has(w.fromComponentId) && idSet.has(w.toComponentId)
    );

    const newClipboard: PanelClipboard = {
      components: JSON.parse(JSON.stringify(compsToCopy)),
      internalWires: JSON.parse(JSON.stringify(internalWires)),
      sourceRailId: compsToCopy[0]?.railId || 'rail-1',
      copiedAt: Date.now(),
    };

    saveClipboard(newClipboard);
    return { count: compsToCopy.length, wiresCount: internalWires.length };
  };

  // Clipboard: Cut selected components & their internal wires
  const handleCutComponents = (componentIds?: string[]) => {
    const idsToCut = componentIds && componentIds.length > 0 ? componentIds : selectedComponentIds;
    const result = handleCopyComponents(idsToCut);
    if (result.count > 0) {
      handleBatchDeleteComponents(idsToCut);
    }
    return result;
  };

  // Clipboard: Paste components & restored internal wires to a target rail
  const handlePasteComponents = (targetRailId?: string) => {
    if (!clipboard || !clipboard.components || clipboard.components.length === 0) {
      return null;
    }

    const effectiveRailId = targetRailId || clipboard.sourceRailId || 'rail-1';
    const targetRailExisting = components.filter((c) => c.railId === effectiveRailId);
    const startPos = targetRailExisting.length;

    const idMap = new Map<string, string>();
    const timestamp = Date.now();

    const newComponents: PlacedComponent[] = clipboard.components.map((orig, index) => {
      const newId = `comp-${timestamp}-${index}-${Math.random().toString(36).substr(2, 4)}`;
      idMap.set(orig.id, newId);
      return {
        ...orig,
        id: newId,
        railId: effectiveRailId,
        positionIndex: startPos + index,
        breakerSettings: orig.breakerSettings ? JSON.parse(JSON.stringify(orig.breakerSettings)) : undefined,
        voltageRelaySettings: orig.voltageRelaySettings ? JSON.parse(JSON.stringify(orig.voltageRelaySettings)) : undefined,
        smartRelaySettings: orig.smartRelaySettings ? JSON.parse(JSON.stringify(orig.smartRelaySettings)) : undefined,
        isOn: orig.isOn ?? true,
        isTripped: false,
      };
    });

    const newWires: WireConnection[] = [];
    if (clipboard.internalWires && clipboard.internalWires.length > 0) {
      clipboard.internalWires.forEach((wire, wireIdx) => {
        const newFromId = idMap.get(wire.fromComponentId);
        const newToId = idMap.get(wire.toComponentId);
        if (newFromId && newToId) {
          newWires.push({
            ...wire,
            id: `wire-${timestamp}-${wireIdx}-${Math.random().toString(36).substr(2, 4)}`,
            fromComponentId: newFromId,
            toComponentId: newToId,
          });
        }
      });
    }

    setComponents((prev) => [...prev, ...newComponents]);
    if (newWires.length > 0) {
      setWires((prev) => [...prev, ...newWires]);
    }
    const newIds = newComponents.map((c) => c.id);
    setSelectedComponentIds(newIds);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.4 },
    });

    return {
      count: newComponents.length,
      wiresCount: newWires.length,
      railId: effectiveRailId,
    };
  };

  // Batch Move to Rail
  const handleBatchMoveToRail = (componentIds: string[], targetRailId: string) => {
    const idSet = new Set(componentIds);
    setComponents((prev) => {
      const targetRailExisting = prev.filter((c) => c.railId === targetRailId && !idSet.has(c.id));
      let nextPos = targetRailExisting.length;
      return prev.map((c) => {
        if (idSet.has(c.id)) {
          return {
            ...c,
            railId: targetRailId,
            positionIndex: nextPos++,
          };
        }
        return c;
      });
    });
  };

  // Batch Shift Positions (Left / Right within rail)
  const handleBatchShiftPositions = (componentIds: string[], direction: 'LEFT' | 'RIGHT') => {
    const idSet = new Set(componentIds);
    setComponents((prev) => {
      const railsMap: Record<string, PlacedComponent[]> = {};
      prev.forEach((c) => {
        if (!railsMap[c.railId]) railsMap[c.railId] = [];
        railsMap[c.railId].push({ ...c });
      });

      Object.keys(railsMap).forEach((railId) => {
        const list = railsMap[railId].sort((a, b) => a.positionIndex - b.positionIndex);
        if (direction === 'LEFT') {
          for (let i = 1; i < list.length; i++) {
            if (idSet.has(list[i].id) && !idSet.has(list[i - 1].id)) {
              const temp = list[i - 1];
              list[i - 1] = list[i];
              list[i] = temp;
            }
          }
        } else {
          for (let i = list.length - 2; i >= 0; i--) {
            if (idSet.has(list[i].id) && !idSet.has(list[i + 1].id)) {
              const temp = list[i + 1];
              list[i + 1] = list[i];
              list[i] = temp;
            }
          }
        }
        list.forEach((c, idx) => {
          c.positionIndex = idx;
        });
      });

      return Object.values(railsMap).flat();
    });
  };

  // Batch Toggle Power (All ON / All OFF)
  const handleBatchTogglePower = (componentIds: string[], targetState?: boolean) => {
    const idSet = new Set(componentIds);
    setComponents((prev) =>
      prev.map((c) => {
        if (idSet.has(c.id)) {
          const nextIsOn = targetState !== undefined ? targetState : !c.isOn;
          return {
            ...c,
            isOn: nextIsOn,
            isTripped: false,
          };
        }
        return c;
      })
    );
  };

  // Update component settings
  const handleUpdateSettings = (
    componentId: string,
    settings: Partial<PlacedComponent>
  ) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === componentId ? { ...c, ...settings } : c))
    );
  };

  // Save Breaker Customization
  const handleSaveBreakerCustomization = (
    componentId: string | null,
    settings: BreakerCustomizationSettings
  ) => {
    if (componentId) {
      // Update existing breaker
      setComponents((prev) =>
        prev.map((c) => {
          if (c.id === componentId) {
            return {
              ...c,
              customLabel: settings.customLabel || c.customLabel,
              customCurrentA: settings.ratedCurrentA,
              curve: settings.curve,
              breakerSettings: settings,
            };
          }
          return c;
        })
      );
    } else {
      // Create new customized breaker
      const newBreakerId = `mcb-custom-${Date.now()}`;
      const typeId =
        settings.poles === 1
          ? 'MCB_1P_16A'
          : settings.poles === 2
          ? 'MCB_2P_MAIN'
          : settings.poles === 3
          ? 'MCB_3P_32A'
          : 'MCB_4P_40A';

      const existingOnRail1 = components.filter((c) => c.railId === 'rail-1');
      const newBreaker: PlacedComponent = {
        id: newBreakerId,
        typeId,
        railId: 'rail-1',
        positionIndex: existingOnRail1.length,
        customLabel: settings.customLabel || `Custom MCB ${settings.ratedCurrentA}A`,
        customCurrentA: settings.ratedCurrentA,
        curve: settings.curve,
        isOn: true,
        isTripped: false,
        breakerSettings: settings,
      };

      recordRecentComponent(typeId);
      setComponents((prev) => [...prev, newBreaker]);
      confetti({ particleCount: 40, spread: 50 });
    }

    setCustomizingBreaker(null);
    setIsCreatingNewBreaker(false);
  };

  // Delete wire
  const handleDeleteWire = (wireId: string) => {
    setWires((prev) => prev.filter((w) => w.id !== wireId));
  };

  // Add wire
  const handleAddWire = (wire: WireConnection) => {
    setWires((prev) => [...prev, wire]);
  };

  // Add component from catalog to chosen rail
  const handleAddComponent = (meta: ComponentMetadata, targetRailId?: string) => {
    recordRecentComponent(meta.type);
    const railId = targetRailId || (meta.category === 'CONSUMER_LOAD' ? `rail-${numRails}` : 'rail-1');
    const existingOnRail = components.filter((c) => c.railId === railId);

    const newComp: PlacedComponent = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      typeId: meta.type,
      railId,
      positionIndex: existingOnRail.length,
      customLabel: lang === 'ka' ? meta.nameKa : meta.nameEn,
      customCurrentA: meta.ratedCurrentA,
      customPowerW: meta.ratedPowerW,
      curve: meta.curve,
      rcdSensitivityMa: meta.rcdSensitivityMa,
      isOn: true,
      isTripped: false,
      breakerSettings:
        meta.category === 'CIRCUIT_BREAKER'
          ? {
              customLabel: lang === 'ka' ? meta.nameKa : meta.nameEn,
              voltageRatingV: meta.voltageRatingV || 230,
              ratedCurrentA: meta.ratedCurrentA || 16,
              curve: meta.curve || 'C',
              poles: meta.poles || 1,
              breakingCapacityKa: meta.breakingCapacityKa || 6,
              protectionMechanism: 'THERMAL_MAGNETIC',
              overloadTripMultiplier: meta.overloadTripMultiplier || 1.13,
              shortCircuitTripMultiplier: meta.shortCircuitTripMultiplier || (meta.curve === 'B' ? 4 : meta.curve === 'D' ? 14 : 7.5),
              operatingFrequencyHz: 50,
            }
          : undefined,
      voltageRelaySettings:
        meta.type === 'VOLTAGE_RELAY'
          ? {
              minVoltage: 175,
              maxVoltage: 260,
              delaySeconds: 5,
            }
          : undefined,
    };

    setComponents((prev) => [...prev, newComp]);
  };

  // Add DIN rail
  const handleAddRail = () => {
    setNumRails((prev) => prev + 1);
  };

  // Remove DIN rail
  const handleRemoveRail = (railNumber: number) => {
    if (numRails <= 1) return;
    const railId = `rail-${railNumber}`;
    setComponents((prev) => prev.filter((c) => c.railId !== railId));
    setNumRails((prev) => prev - 1);
  };

  // Preset selector
  const handleSelectPreset = (preset: PanelConfig) => {
    setNumRails(preset.numRails);
    setComponents(preset.components);
    setWires(preset.wires);
    setWiringStartTerminal(null);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.2 },
    });
  };

  // Save current panel as custom preset
  const handleSaveCurrentAsPreset = () => {
    const defaultName =
      lang === 'ka'
        ? `ჩემი შაბლონი #${customPresets.length + 1}`
        : `My Custom Preset #${customPresets.length + 1}`;
    const name = window.prompt(
      lang === 'ka' ? 'შეიყვანეთ შაბლონის სახელი:' : 'Enter template preset name:',
      defaultName
    );
    if (!name || !name.trim()) return;

    const newPreset: PanelConfig = {
      id: `custom-preset-${Date.now()}`,
      name: name.trim(),
      descriptionKa: `მორგებული შაბლონი (${components.length} მოწყობილობა, ${wires.length} შეერთება)`,
      descriptionEn: `Custom preset (${components.length} devices, ${wires.length} wires)`,
      numRails,
      isThreePhase: components.some((c) => c.typeId.includes('3P') || c.typeId.includes('4P')),
      components: JSON.parse(JSON.stringify(components)),
      wires: JSON.parse(JSON.stringify(wires)),
    };

    const updated = [newPreset, ...customPresets];
    setCustomPresets(updated);
    try {
      localStorage.setItem('electropanel_custom_presets', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    confetti({ particleCount: 60, spread: 60 });
  };

  // Delete custom preset
  const handleDeleteCustomPreset = (presetId: string) => {
    const updated = customPresets.filter((p) => p.id !== presetId);
    setCustomPresets(updated);
    try {
      localStorage.setItem('electropanel_custom_presets', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Assembled Panel from Breakers List / Excel Auto-Builder
  const handleApplyAssembledPanel = (result: {
    components: PlacedComponent[];
    wires: WireConnection[];
    circuitLoads: CircuitLoad[];
    numRails: number;
  }) => {
    setComponents(result.components);
    setWires(result.wires);
    setCircuitLoads(result.circuitLoads);
    setNumRails(result.numRails);
    setSelectedComponentIds([]);
    setWiringStartTerminal(null);
    setActiveView('PANEL');

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Clear all
  const handleClearAll = () => {
    if (
      window.confirm(
        lang === 'ka'
          ? 'ნამდვილად გსურთ ფარის გასუფთავება?'
          : 'Are you sure you want to clear all devices and wires?'
      )
    ) {
      setComponents([
        {
          id: 'infeed-1',
          typeId: 'MAIN_INCOMING_1P',
          railId: 'rail-1',
          positionIndex: 0,
          customLabel: 'GRID 230V',
          isOn: true,
          isTripped: false,
        },
      ]);
      setWires([]);
      setWiringStartTerminal(null);
    }
  };

  // Auto Wire Helper (Intelligently connects Infeed -> Main MCB -> Voltage Relay -> RCD -> Busbars -> Branch MCBs -> Loads)
  const handleAutoWire = () => {
    const newWires: WireConnection[] = [];

    const infeed = components.find((c) => c.typeId.startsWith('MAIN_INCOMING'));
    const mainMcb = components.find((c) => c.typeId === 'MCB_2P_MAIN' || c.typeId.startsWith('MCB_'));
    const vrelay = components.find((c) => c.typeId === 'VOLTAGE_RELAY');
    const rcd = components.find((c) => c.typeId.startsWith('RCD_2P') || c.typeId.startsWith('RCBO'));
    const nbar = components.find((c) => c.typeId.startsWith('NEUTRAL_BUSBAR'));
    const pebar = components.find((c) => c.typeId.startsWith('GROUND_BUSBAR'));
    const branchMcbs = components.filter(
      (c) => c.typeId.startsWith('MCB_1P') && c.id !== mainMcb?.id
    );
    const loads = components.filter((c) => c.typeId.startsWith('LOAD_'));

    // Infeed -> Main MCB
    if (infeed && mainMcb) {
      newWires.push(
        { id: `aw-${Date.now()}-1`, fromComponentId: infeed.id, fromTerminalId: 'L_out', toComponentId: mainMcb.id, toTerminalId: '1_in', color: 'PHASE_BROWN', gauge: 10.0 },
        { id: `aw-${Date.now()}-2`, fromComponentId: infeed.id, fromTerminalId: 'N_out', toComponentId: mainMcb.id, toTerminalId: 'N_in', color: 'NEUTRAL_BLUE', gauge: 10.0 }
      );
    }

    // Infeed -> PE Bar
    if (infeed && pebar) {
      newWires.push({
        id: `aw-${Date.now()}-3`,
        fromComponentId: infeed.id,
        fromTerminalId: 'PE_out',
        toComponentId: pebar.id,
        toTerminalId: 'PE_main',
        color: 'GROUND_GREEN_YELLOW',
        gauge: 10.0,
      });
    }

    // Main MCB -> Voltage Relay
    if (mainMcb && vrelay) {
      newWires.push(
        { id: `aw-${Date.now()}-4`, fromComponentId: mainMcb.id, fromTerminalId: '2_out', toComponentId: vrelay.id, toTerminalId: 'L_in', color: 'PHASE_BROWN', gauge: 10.0 },
        { id: `aw-${Date.now()}-5`, fromComponentId: mainMcb.id, fromTerminalId: 'N_out', toComponentId: vrelay.id, toTerminalId: 'N_in', color: 'NEUTRAL_BLUE', gauge: 10.0 }
      );
    }

    // Voltage Relay -> RCD
    if (vrelay && rcd) {
      newWires.push(
        { id: `aw-${Date.now()}-6`, fromComponentId: vrelay.id, fromTerminalId: 'L_out', toComponentId: rcd.id, toTerminalId: '1_in', color: 'PHASE_BROWN', gauge: 10.0 },
        { id: `aw-${Date.now()}-7`, fromComponentId: vrelay.id, fromTerminalId: 'N_out', toComponentId: rcd.id, toTerminalId: 'N_in', color: 'NEUTRAL_BLUE', gauge: 10.0 }
      );
    }

    // RCD Neutral -> N-Bar
    if (rcd && nbar) {
      newWires.push({
        id: `aw-${Date.now()}-8`,
        fromComponentId: rcd.id,
        fromTerminalId: 'N_out',
        toComponentId: nbar.id,
        toTerminalId: 'N_main',
        color: 'NEUTRAL_BLUE',
        gauge: 10.0,
      });
    }

    // RCD Phase -> Branch MCBs jumper bar
    if (rcd && branchMcbs.length > 0) {
      newWires.push({
        id: `aw-${Date.now()}-9`,
        fromComponentId: rcd.id,
        fromTerminalId: '2_out',
        toComponentId: branchMcbs[0].id,
        toTerminalId: '1_in',
        color: 'PHASE_BROWN',
        gauge: 6.0,
      });

      for (let i = 0; i < branchMcbs.length - 1; i++) {
        newWires.push({
          id: `aw-jumper-${i}`,
          fromComponentId: branchMcbs[i].id,
          fromTerminalId: '1_in',
          toComponentId: branchMcbs[i + 1].id,
          toTerminalId: '1_in',
          color: 'PHASE_BROWN',
          gauge: 6.0,
        });
      }
    }

    // Branch MCBs & N-Bar & PE-Bar -> Loads
    loads.forEach((ld, idx) => {
      const assignedMcb = branchMcbs[idx % branchMcbs.length];
      if (assignedMcb) {
        newWires.push({
          id: `aw-ld-p-${idx}`,
          fromComponentId: assignedMcb.id,
          fromTerminalId: '2_out',
          toComponentId: ld.id,
          toTerminalId: 'L',
          color: 'PHASE_BROWN',
          gauge: 2.5,
        });
      }

      if (nbar) {
        const nTermId = `N_${(idx % 5) + 1}`;
        newWires.push({
          id: `aw-ld-n-${idx}`,
          fromComponentId: nbar.id,
          fromTerminalId: nTermId,
          toComponentId: ld.id,
          toTerminalId: 'N',
          color: 'NEUTRAL_BLUE',
          gauge: 2.5,
        });
      }

      if (pebar) {
        const peTermId = `PE_${(idx % 5) + 1}`;
        newWires.push({
          id: `aw-ld-pe-${idx}`,
          fromComponentId: pebar.id,
          fromTerminalId: peTermId,
          toComponentId: ld.id,
          toTerminalId: 'PE',
          color: 'GROUND_GREEN_YELLOW',
          gauge: 2.5,
        });
      }
    });

    setWires(newWires);
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.3 },
    });
  };

  // Apply Wire Length Optimization Result
  const handleApplyWireOptimization = (optimizedComponents: PlacedComponent[]) => {
    setComponents(optimizedComponents);
    setSelectedComponentIds([]);

    // Trigger visual celebration
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.4 },
    });
  };

  // Export JSON
  const handleExportJson = () => {
    const config: PanelConfig = {
      id: `custom-panel-${Date.now()}`,
      name: 'Custom ElectroPanel Configuration',
      descriptionKa: 'ექსპორტირებული ელექტრო ფარი',
      descriptionEn: 'Exported ElectroPanel',
      numRails,
      isThreePhase: false,
      components,
      wires,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `electropanel-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as PanelConfig;
          if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
            setNumRails(parsed.numRails || 2);
            setComponents(parsed.components);
            setWires(parsed.wires);
            confetti({ particleCount: 60 });
          }
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Header */}
      <Header
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'ka' ? 'en' : 'ka'))}
        activeView={activeView}
        onChangeView={setActiveView}
        gridPowerOn={gridPowerOn}
        onTogglePower={() => setGridPowerOn((prev) => !prev)}
        gridVoltage={gridVoltage}
        onChangeGridVoltage={setGridVoltage}
        onSelectPreset={handleSelectPreset}
        onClearAll={handleClearAll}
        onAutoWire={handleAutoWire}
        onAutoRouteWires={handleAutoRouteWires}
        isAutoRouted={wireRoutingState.isAutoRouted}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onOpenPdfReport={() => setIsPdfReportOpen(true)}
        onOpenWindowsModal={() => setIsWindowsModalOpen(true)}
        onOpenPanelAssembly={() => setIsPanelAssemblyOpen(true)}
        onOpenWireOptimizer={() => setIsWireOptimizerOpen(true)}
        onOpenQrCode={() => setIsQrModalOpen(true)}
        customPresets={customPresets}
        onSaveCurrentAsPreset={handleSaveCurrentAsPreset}
        onDeleteCustomPreset={handleDeleteCustomPreset}
        totalPowerW={simulationState.totalPowerW}
        totalCurrentA={simulationState.totalCurrentA}
        hasAlerts={simulationState.safetyAlerts.some((a) => a.level === 'CRITICAL' || a.level === 'WARNING')}
      />

      {/* 2. Interactive Wire Control Bar (only when in DIN Rail panel mode) */}
      {activeView === 'PANEL' && (
        <WireControlBar
          lang={lang}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
          selectedGauge={selectedGauge}
          onSelectGauge={setSelectedGauge}
          wiringStartTerminal={wiringStartTerminal}
          onCancelWiring={() => setWiringStartTerminal(null)}
          wireCount={wires.length}
          onOpenConnectionManager={() => setIsConnectionManagerOpen(true)}
          isThermalActive={isThermalOverlayActive}
          onToggleThermal={() => setIsThermalOverlayActive((prev) => !prev)}
          routingState={wireRoutingState}
          onAutoRouteWires={handleAutoRouteWires}
          onChangeRoutingStyle={handleChangeRoutingStyle}
          onToggleCableDucts={handleToggleCableDucts}
          onOpenWireOptimizer={() => setIsWireOptimizerOpen(true)}
        />
      )}

      {/* 3. Main Workspace Views */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {activeView === 'PANEL' && (
          <>
            {/* Left: Component Catalog Drawer */}
            <ComponentPalette
              lang={lang}
              onAddComponent={(meta) => handleAddComponent(meta)}
              onOpenNewBreakerCustomizer={() => {
                setIsCreatingNewBreaker(true);
                setCustomizingBreaker(null);
              }}
              recentComponents={recentComponentsList}
              onClearRecent={handleClearRecentComponents}
            />

            {/* Center: Interactive DIN Rail Canvas */}
            <DinRailPanel
              components={components}
              wires={wires}
              numRails={numRails}
              onAddRail={handleAddRail}
              onRemoveRail={handleRemoveRail}
              lang={lang}
              activeTool={activeTool}
              selectedComponentIds={selectedComponentIds}
              onSelectComponentIds={setSelectedComponentIds}
              onBatchDeleteComponents={handleBatchDeleteComponents}
              onBatchDuplicateComponents={handleBatchDuplicateComponents}
              onBatchMoveToRail={handleBatchMoveToRail}
              onBatchShiftPositions={handleBatchShiftPositions}
              onBatchTogglePower={handleBatchTogglePower}
              clipboard={clipboard}
              onCopyComponents={handleCopyComponents}
              onCutComponents={handleCutComponents}
              onPasteComponents={handlePasteComponents}
              onCopyComponent={(id) => handleCopyComponents([id])}
              simulationState={simulationState}
              wiringStartTerminal={wiringStartTerminal}
              selectedColor={selectedColor}
              selectedGauge={selectedGauge}
              thermalState={thermalState}
              routingState={wireRoutingState}
              onToggleThermalOverlay={() => setIsThermalOverlayActive((prev) => !prev)}
              onChangeThermalPalette={setThermalPalette}
              onChangeThermalOpacity={setThermalOpacity}
              onToggleThermalBadges={() => setShowTemperatureBadges((prev) => !prev)}
              onToggleThermalPlumes={() => setShowHeatPlumes((prev) => !prev)}
              onInspectThermal={(comp) => setInspectingThermalComp(comp)}
              onTerminalClick={handleTerminalClick}
              onToggleSwitch={handleToggleSwitch}
              onTestRcd={handleTestRcd}
              onDeleteComponent={handleDeleteComponent}
              onDuplicateComponent={handleDuplicateComponent}
              onUpdateSettings={handleUpdateSettings}
              onDeleteWire={handleDeleteWire}
              onOpenCatalogForRail={(railId) => {
                const defaultBreaker = COMPONENT_CATALOG.find((c) => c.type === 'MCB_1P_16A');
                if (defaultBreaker) handleAddComponent(defaultBreaker, railId);
              }}
              onOpenBreakerCustomizer={(comp) => {
                setCustomizingBreaker(comp);
                setIsCreatingNewBreaker(false);
              }}
            />

            {/* Right: Live Diagnostics & Safety Panel */}
            <DiagnosticsPanel
              lang={lang}
              simulationState={simulationState}
            />
          </>
        )}

        {activeView === 'FLOORPLAN' && (
          <FloorPlanDesigner
            lang={lang}
            existingLoads={circuitLoads}
            onSyncToCircuitSchedule={(newLoads) => {
              setCircuitLoads(newLoads);
              setActiveView('SCHEDULE');
            }}
          />
        )}

        {activeView === 'SCHEDULE' && (
          <CircuitLoadSchedule
            loads={circuitLoads}
            components={components}
            wires={wires}
            lang={lang}
            simulationState={simulationState}
            gridVoltage={gridVoltage}
            onUpdateLoads={setCircuitLoads}
            onUpdateComponentPower={handleUpdateLoadComponentPower}
            onOpenPdfReport={(filterMode) => {
              setPdfReportFilter(filterMode || 'SCHEDULE_ONLY');
              setIsPdfReportOpen(true);
            }}
            onOpenPanelAssembly={() => setIsPanelAssemblyOpen(true)}
          />
        )}

        {activeView === 'SCHEMATIC' && (
          <SchematicView
            components={components}
            wires={wires}
            lang={lang}
            simulationState={simulationState}
            onOpenPdfReport={() => {
              setPdfReportFilter('ALL');
              setIsPdfReportOpen(true);
            }}
          />
        )}

        {activeView === 'BOM' && (
          <BomModal
            components={components}
            wires={wires}
            lang={lang}
            simulationState={simulationState}
            onOpenPdfReport={() => {
              setPdfReportFilter('ALL');
              setIsPdfReportOpen(true);
            }}
          />
        )}
      </div>

      {/* 4. Breaker Customizer Modal (for customizing voltage, rated current, overload trip, short-circuit trip, protection mechanism) */}
      {(customizingBreaker || isCreatingNewBreaker) && (
        <BreakerCustomizerModal
          component={customizingBreaker}
          lang={lang}
          onSave={handleSaveBreakerCustomization}
          onClose={() => {
            setCustomizingBreaker(null);
            setIsCreatingNewBreaker(false);
          }}
        />
      )}

      {/* 5. Connection Manager Modal (for defining and visualizing all terminal connections) */}
      {isConnectionManagerOpen && (
        <ConnectionManagerModal
          components={components}
          wires={wires}
          lang={lang}
          simulationState={simulationState}
          onAddWire={handleAddWire}
          onDeleteWire={handleDeleteWire}
          onAutoWire={handleAutoWire}
          onClose={() => setIsConnectionManagerOpen(false)}
        />
      )}

      {/* 6. Thermographic Inspector Modal */}
      {inspectingThermalComp && (
        <ThermalInspectorModal
          component={inspectingThermalComp}
          thermalData={thermalState.componentsThermal[inspectingThermalComp.id]}
          lang={lang}
          palette={thermalState.palette}
          onClose={() => setInspectingThermalComp(null)}
        />
      )}

      {/* 7. Printable PDF Engineering Report & Technical Dossier Modal */}
      {isPdfReportOpen && (
        <PdfReportModal
          components={components}
          wires={wires}
          lang={lang}
          simulationState={simulationState}
          thermalState={thermalState}
          gridVoltage={gridVoltage}
          numRails={numRails}
          circuitLoads={circuitLoads}
          initialFilter={pdfReportFilter}
          onClose={() => setIsPdfReportOpen(false)}
        />
      )}

      {/* 8. Windows Desktop App & Auto-Update Modal */}
      {isWindowsModalOpen && (
        <WindowsUpdateModal
          lang={lang}
          onClose={() => setIsWindowsModalOpen(false)}
        />
      )}

      {/* 9. Breaker List & Excel Panel Auto-Assembly Modal */}
      {isPanelAssemblyOpen && (
        <PanelAssemblyModal
          lang={lang}
          onClose={() => setIsPanelAssemblyOpen(false)}
          onApplyAssembledPanel={handleApplyAssembledPanel}
        />
      )}

      {/* 10. Wire Length & Placement Optimizer Modal */}
      {isWireOptimizerOpen && (
        <WireOptimizerModal
          isOpen={isWireOptimizerOpen}
          onClose={() => setIsWireOptimizerOpen(false)}
          components={components}
          wires={wires}
          numRails={numRails}
          lang={lang}
          onApplyOptimization={handleApplyWireOptimization}
        />
      )}

      {/* 11. Field Technician QR Passport Modal */}
      {isQrModalOpen && (
        <PanelQrModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          components={components}
          wires={wires}
          loads={circuitLoads}
          numRails={numRails}
          lang={lang}
          onOpenTechnicianSummary={() => {
            setIsQrModalOpen(false);
            setIsTechnicianSummaryOpen(true);
          }}
        />
      )}

      {/* 12. Fullscreen Field Technician Web View */}
      {isTechnicianSummaryOpen && (
        <TechnicianSummaryView
          components={components}
          wires={wires}
          loads={circuitLoads}
          numRails={numRails}
          lang={lang}
          onSetLang={setLang}
          onBackToEditor={() => {
            setIsTechnicianSummaryOpen(false);
            // Clean URL search param if present
            if (typeof window !== 'undefined' && window.location.search.includes('view=tech_summary')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          }}
          panelTag="DB-MAIN-01"
          projectName={lang === 'ka' ? 'ელექტრო გამანაწილებელი ფარი' : 'Main Electrical Distribution Board'}
          projectSiteRef={lang === 'ka' ? 'PRJ-SITE-REF-01 (საპროექტო ობიექტი)' : 'PRJ-SITE-REF-01 (Project Site Reference)'}
          initialObservations={projectObservations}
          onSaveObservations={setProjectObservations}
          initialPhotos={projectPhotos}
          onSavePhotos={setProjectPhotos}
        />
      )}
    </div>
  );
}
