import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ActiveTool,
  BreakerCustomizationSettings,
  ComponentMetadata,
  Language,
  PanelConfig,
  PanelThermalState,
  PlacedComponent,
  Terminal,
  ThermalPalette,
  WireColorType,
  WireConnection,
  WireGauge,
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
import { BreakerCustomizerModal } from './components/BreakerCustomizerModal';
import { ConnectionManagerModal } from './components/ConnectionManagerModal';
import { ThermalInspectorModal } from './components/ThermalInspectorModal';
import { PdfReportModal } from './components/PdfReportModal';
import { WindowsUpdateModal } from './components/WindowsUpdateModal';

export default function App() {
  // 1. Language & Main View state
  const [lang, setLang] = useState<Language>('ka');
  const [activeView, setActiveView] = useState<'PANEL' | 'SCHEMATIC' | 'BOM'>('PANEL');

  // 2. Interactive Tool & Wiring state
  const [activeTool, setActiveTool] = useState<ActiveTool>('SELECT');
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
  const [isWindowsModalOpen, setIsWindowsModalOpen] = useState<boolean>(false);

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
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onOpenPdfReport={() => setIsPdfReportOpen(true)}
        onOpenWindowsModal={() => setIsWindowsModalOpen(true)}
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
              simulationState={simulationState}
              wiringStartTerminal={wiringStartTerminal}
              selectedColor={selectedColor}
              selectedGauge={selectedGauge}
              thermalState={thermalState}
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

        {activeView === 'SCHEMATIC' && (
          <SchematicView
            components={components}
            wires={wires}
            lang={lang}
            simulationState={simulationState}
            onOpenPdfReport={() => setIsPdfReportOpen(true)}
          />
        )}

        {activeView === 'BOM' && (
          <BomModal
            components={components}
            wires={wires}
            lang={lang}
            simulationState={simulationState}
            onOpenPdfReport={() => setIsPdfReportOpen(true)}
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
    </div>
  );
}
