import { COMPONENT_CATALOG } from '../data/componentCatalog';
import {
  PlacedComponent,
  SafetyAlert,
  SimulationState,
  SimulationTerminalState,
  WireConnection,
} from '../types';

export function runSimulation(
  components: PlacedComponent[],
  wires: WireConnection[],
  gridPowerOn: boolean,
  gridVoltageL1: number = 230,
  gridVoltageL2: number = 230,
  gridVoltageL3: number = 230,
  isThreePhase: boolean = false
): SimulationState {
  const terminalStates: Record<string, SimulationTerminalState> = {};
  const componentStatuses: Record<string, {
    isEnergized: boolean;
    activePowerW: number;
    currentA: number;
    voltageV: number;
    isTripped: boolean;
    tripReason?: string;
    warning?: string;
  }> = {};
  const wireStates: Record<string, {
    isEnergized: boolean;
    carriesCurrentA: number;
    isOverloaded: boolean;
    isShortCircuit: boolean;
  }> = {};
  const safetyAlerts: SafetyAlert[] = [];

  // Helper map for component catalog
  const catalogMap = new Map(COMPONENT_CATALOG.map((c) => [c.type, c]));

  // Initialize terminal states
  components.forEach((comp) => {
    const meta = catalogMap.get(comp.typeId);
    if (meta) {
      meta.terminals.forEach((term) => {
        const key = `${comp.id}:${term.id}`;
        terminalStates[key] = {
          isEnergized: false,
          voltageV: 0,
          currentA: 0,
          phase: 'NONE',
          potential: 0,
        };
      });
    }

    componentStatuses[comp.id] = {
      isEnergized: false,
      activePowerW: 0,
      currentA: 0,
      voltageV: 0,
      isTripped: comp.isTripped,
      tripReason: comp.tripReason,
    };
  });

  // Initialize wire states
  wires.forEach((wire) => {
    wireStates[wire.id] = {
      isEnergized: false,
      carriesCurrentA: 0,
      isOverloaded: false,
      isShortCircuit: false,
    };
  });

  if (!gridPowerOn) {
    return {
      gridPowerOn: false,
      gridVoltageL1,
      gridVoltageL2,
      gridVoltageL3,
      gridFrequencyHz: 50,
      isThreePhase,
      componentStatuses,
      terminalStates,
      wireStates,
      totalPowerW: 0,
      totalCurrentA: 0,
      safetyAlerts: [
        {
          id: 'grid-off',
          level: 'INFO',
          titleKa: 'მთავარი ქსელი გათიშულია',
          titleEn: 'Mains Power is OFF',
          descriptionKa: 'ჩართეთ ქსელის კვება ზედა პანელიდან სისტემის სამუშაოდ.',
          descriptionEn: 'Turn on mains power toggle from header to start simulation.',
        },
      ],
    };
  }

  // Find Infeed component
  const infeedComp = components.find(
    (c) => c.typeId === 'MAIN_INCOMING_1P' || c.typeId === 'MAIN_INCOMING_3P'
  );

  if (!infeedComp) {
    safetyAlerts.push({
      id: 'no-infeed',
      level: 'WARNING',
      titleKa: 'ქსელის შემოსვლა არ არის დამატებული',
      titleEn: 'No Mains Infeed Component Found',
      descriptionKa: 'დაამატეთ "ქსელის შემოსვლა (Grid Infeed)" კომპონენტების სიიდან.',
      descriptionEn: 'Please place a Main Grid Infeed component from the catalog.',
    });
    return {
      gridPowerOn: true,
      gridVoltageL1,
      gridVoltageL2,
      gridVoltageL3,
      gridFrequencyHz: 50,
      isThreePhase,
      componentStatuses,
      terminalStates,
      wireStates,
      totalPowerW: 0,
      totalCurrentA: 0,
      safetyAlerts,
    };
  }

  // Set Infeed source potentials
  if (infeedComp.typeId === 'MAIN_INCOMING_1P') {
    terminalStates[`${infeedComp.id}:L_out`] = {
      isEnergized: true,
      voltageV: gridVoltageL1,
      currentA: 0,
      phase: 'L1',
      potential: gridVoltageL1,
    };
    terminalStates[`${infeedComp.id}:N_out`] = {
      isEnergized: true,
      voltageV: 0,
      currentA: 0,
      phase: 'N',
      potential: 0,
    };
    terminalStates[`${infeedComp.id}:PE_out`] = {
      isEnergized: true,
      voltageV: 0,
      currentA: 0,
      phase: 'PE',
      potential: 0,
    };
  } else if (infeedComp.typeId === 'MAIN_INCOMING_3P') {
    terminalStates[`${infeedComp.id}:L1_out`] = {
      isEnergized: true,
      voltageV: gridVoltageL1,
      currentA: 0,
      phase: 'L1',
      potential: gridVoltageL1,
    };
    terminalStates[`${infeedComp.id}:L2_out`] = {
      isEnergized: true,
      voltageV: gridVoltageL2,
      currentA: 0,
      phase: 'L2',
      potential: gridVoltageL2,
    };
    terminalStates[`${infeedComp.id}:L3_out`] = {
      isEnergized: true,
      voltageV: gridVoltageL3,
      currentA: 0,
      phase: 'L3',
      potential: gridVoltageL3,
    };
    terminalStates[`${infeedComp.id}:N_out`] = {
      isEnergized: true,
      voltageV: 0,
      currentA: 0,
      phase: 'N',
      potential: 0,
    };
    terminalStates[`${infeedComp.id}:PE_out`] = {
      isEnergized: true,
      voltageV: 0,
      currentA: 0,
      phase: 'PE',
      potential: 0,
    };
  }

  // Build adjacency graph of terminals
  // Connections happen through:
  // 1. External Wires: (comp1:term1 <-> comp2:term2)
  // 2. Internal Component pass-through (e.g. MCB 1_in <-> 2_out when closed, Busbar all terminals, etc.)

  const componentMap = new Map(components.map((c) => [c.id, c]));

  function getInternalConnections(comp: PlacedComponent): [string, string][] {
    if (!comp.isOn || comp.isTripped) return [];

    switch (comp.typeId) {
      case 'MCB_1P_10A':
      case 'MCB_1P_16A':
      case 'MCB_1P_20A':
      case 'MCB_1P_25A':
      case 'MCB_1P_32A':
        return [['1_in', '2_out']];

      case 'MCB_2P_MAIN':
        return [
          ['1_in', '2_out'],
          ['N_in', 'N_out'],
        ];

      case 'MCB_3P_MAIN':
        return [
          ['1_in', '2_out'],
          ['3_in', '4_out'],
          ['5_in', '6_out'],
        ];

      case 'VOLTAGE_RELAY': {
        // Voltage relay checks voltage bounds
        const minV = comp.voltageRelaySettings?.minVoltage ?? 175;
        const maxV = comp.voltageRelaySettings?.maxVoltage ?? 260;
        const currentV = gridVoltageL1;

        if (currentV < minV || currentV > maxV) {
          // Out of safe range! Relay disconnects output
          return [['N_in', 'N_out']]; // Neutral remains connected, Phase disconnected
        }
        return [
          ['L_in', 'L_out'],
          ['N_in', 'N_out'],
        ];
      }

      case 'RCD_2P_30MA':
      case 'RCD_2P_10MA':
      case 'RCBO_1PN_16A':
        return [
          ['1_in', '2_out'],
          ['N_in', 'N_out'],
        ];

      case 'RCD_4P_30MA':
        return [
          ['1_in', '2_out'],
          ['3_in', '4_out'],
          ['5_in', '6_out'],
          ['N_in', 'N_out'],
        ];

      case 'NEUTRAL_BUSBAR_8P': {
        // Busbars connect all their pins together
        const pins = ['N_main', 'N_1', 'N_2', 'N_3', 'N_4', 'N_5', 'N_6'];
        const pairs: [string, string][] = [];
        for (let i = 0; i < pins.length; i++) {
          for (let j = i + 1; j < pins.length; j++) {
            pairs.push([pins[i], pins[j]]);
          }
        }
        return pairs;
      }

      case 'GROUND_BUSBAR_8P': {
        const pins = ['PE_main', 'PE_1', 'PE_2', 'PE_3', 'PE_4', 'PE_5', 'PE_6'];
        const pairs: [string, string][] = [];
        for (let i = 0; i < pins.length; i++) {
          for (let j = i + 1; j < pins.length; j++) {
            pairs.push([pins[i], pins[j]]);
          }
        }
        return pairs;
      }

      case 'SMART_RELAY_16A':
        return [['L_in', 'L_out']];

      default:
        return [];
    }
  }

  // Propagate potentials using iterative BFS/relaxation
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 40;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    // 1. Propagate through Wires
    wires.forEach((w) => {
      const keyA = `${w.fromComponentId}:${w.fromTerminalId}`;
      const keyB = `${w.toComponentId}:${w.toTerminalId}`;
      const stateA = terminalStates[keyA];
      const stateB = terminalStates[keyB];

      if (stateA && stateB) {
        // From A to B
        if (stateA.isEnergized && !stateB.isEnergized) {
          stateB.isEnergized = true;
          stateB.voltageV = stateA.voltageV;
          stateB.phase = stateA.phase;
          stateB.potential = stateA.potential;
          wireStates[w.id].isEnergized = true;
          changed = true;
        }
        // From B to A
        else if (stateB.isEnergized && !stateA.isEnergized) {
          stateA.isEnergized = true;
          stateA.voltageV = stateB.voltageV;
          stateA.phase = stateB.phase;
          stateA.potential = stateB.potential;
          wireStates[w.id].isEnergized = true;
          changed = true;
        } else if (stateA.isEnergized && stateB.isEnergized) {
          wireStates[w.id].isEnergized = true;
        }
      }
    });

    // 2. Propagate through Component internal contacts
    components.forEach((comp) => {
      const internals = getInternalConnections(comp);
      internals.forEach(([termA, termB]) => {
        const keyA = `${comp.id}:${termA}`;
        const keyB = `${comp.id}:${termB}`;
        const stateA = terminalStates[keyA];
        const stateB = terminalStates[keyB];

        if (stateA && stateB) {
          if (stateA.isEnergized && !stateB.isEnergized) {
            stateB.isEnergized = true;
            stateB.voltageV = stateA.voltageV;
            stateB.phase = stateA.phase;
            stateB.potential = stateA.potential;
            changed = true;
          } else if (stateB.isEnergized && !stateA.isEnergized) {
            stateA.isEnergized = true;
            stateA.voltageV = stateB.voltageV;
            stateA.phase = stateB.phase;
            stateA.potential = stateB.potential;
            changed = true;
          }
        }
      });
    });
  }

  // Check Voltage Relay condition
  components
    .filter((c) => c.typeId === 'VOLTAGE_RELAY')
    .forEach((vrelay) => {
      const minV = vrelay.voltageRelaySettings?.minVoltage ?? 175;
      const maxV = vrelay.voltageRelaySettings?.maxVoltage ?? 260;
      const currentV = gridVoltageL1;
      const hasLIn = terminalStates[`${vrelay.id}:L_in`]?.isEnergized;
      const hasNIn = terminalStates[`${vrelay.id}:N_in`]?.phase === 'N';

      if (hasLIn && hasNIn) {
        componentStatuses[vrelay.id].isEnergized = true;
        componentStatuses[vrelay.id].voltageV = currentV;

        if (currentV < minV) {
          componentStatuses[vrelay.id].warning = `დაბალი ძაბვა (< ${minV}V)! რელემ გათიშა მომხმარებლები`;
          safetyAlerts.push({
            id: `vrel-low-${vrelay.id}`,
            level: 'WARNING',
            titleKa: 'ძაბვის რელე: დაბალი ძაბვა!',
            titleEn: 'Voltage Relay: Under-Voltage Cutoff!',
            descriptionKa: `ქსელში ძაბვაა ${currentV}V (ზღვარი: ${minV}V). რელემ გათიშა გამომავალი ხაზი ტექნიკის დასაცავად.`,
            descriptionEn: `Grid voltage dropped to ${currentV}V (threshold: ${minV}V). Relay opened contacts to protect appliances.`,
            relatedComponentIds: [vrelay.id],
          });
        } else if (currentV > maxV) {
          componentStatuses[vrelay.id].warning = `მაღალი ზეძაბვა (> ${maxV}V)! რელემ გათიშა მომხმარებლები`;
          safetyAlerts.push({
            id: `vrel-high-${vrelay.id}`,
            level: 'WARNING',
            titleKa: 'ძაბვის რელე: ზეძაბვა!',
            titleEn: 'Voltage Relay: Over-Voltage Cutoff!',
            descriptionKa: `ქსელში ძაბვაა ${currentV}V (ზღვარი: ${maxV}V). რელემ გათიშა გამომავალი ხაზი ხანძრისა და დაზიანების თავიდან ასაცილებლად.`,
            descriptionEn: `Grid voltage surged to ${currentV}V (threshold: ${maxV}V). Relay opened contacts.`,
            relatedComponentIds: [vrelay.id],
          });
        }
      }
    });

  // Calculate Loads and currents
  let totalActivePowerW = 0;
  const loadComponents = components.filter((c) => catalogMap.get(c.typeId)?.category === 'CONSUMER_LOAD');

  loadComponents.forEach((load) => {
    const meta = catalogMap.get(load.typeId);
    if (!meta) return;

    const termL = terminalStates[`${load.id}:L`];
    const termN = terminalStates[`${load.id}:N`];
    const termPE = terminalStates[`${load.id}:PE`];

    const hasPhase = termL && termL.isEnergized && (termL.phase === 'L1' || termL.phase === 'L2' || termL.phase === 'L3');
    const hasNeutral = termN && termN.isEnergized && termN.phase === 'N';
    const hasGround = termPE && termPE.isEnergized && termPE.phase === 'PE';

    // Check Grounding warning for metal casing loads (Sockets, Cooktop, AC, Boiler, Washing Machine, EV Charger)
    if (meta.terminals.some((t) => t.type === 'GROUND') && !hasGround) {
      safetyAlerts.push({
        id: `no-pe-${load.id}`,
        level: 'WARNING',
        titleKa: `დამიწება აკლია: ${load.customLabel || meta.nameKa}`,
        titleEn: `Missing Earth/Ground: ${load.customLabel || meta.nameEn}`,
        descriptionKa: `მოწყობილობა ${load.customLabel} არ არის შეერთებული დამიწების შინასთან (PE-Bar). კორპუსზე დენის გაჟონვისას არსებობს დარტყმის საფრთხე!`,
        descriptionEn: `Device ${load.customLabel} is missing protective earth connection (PE). Risk of electric shock on chassis!`,
        relatedComponentIds: [load.id],
      });
    }

    if (hasPhase && hasNeutral && load.isOn && !load.isTripped) {
      const powerW = load.customPowerW ?? meta.ratedPowerW ?? 1000;
      const cosPhi = meta.powerFactor ?? 0.95;
      const voltage = gridVoltageL1;
      const currentA = +(powerW / (voltage * cosPhi)).toFixed(2);

      componentStatuses[load.id].isEnergized = true;
      componentStatuses[load.id].activePowerW = powerW;
      componentStatuses[load.id].currentA = currentA;
      componentStatuses[load.id].voltageV = voltage;

      totalActivePowerW += powerW;
    }
  });

  // Calculate Breaker Currents & Check Overloads
  const totalCurrentA = +(totalActivePowerW / (gridVoltageL1 * 0.95)).toFixed(1);

  // Assign load currents to connected branch breakers
  components.forEach((comp) => {
    const meta = catalogMap.get(comp.typeId);
    if (!meta) return;

    if (meta.category === 'CIRCUIT_BREAKER' || meta.category === 'RCBO_DEVICE') {
      const outTerm = terminalStates[`${comp.id}:2_out`];
      if (outTerm && outTerm.isEnergized) {
        componentStatuses[comp.id].isEnergized = true;
        componentStatuses[comp.id].voltageV = gridVoltageL1;

        // Estimate current through branch by summing energized connected loads
        let branchCurrentA = 0;
        let branchPowerW = 0;

        loadComponents.forEach((ld) => {
          const ldStatus = componentStatuses[ld.id];
          if (ldStatus.isEnergized) {
            // Find if there's a wire from this breaker to this load or downstream
            const connectedDirectly = wires.some(
              (w) =>
                (w.fromComponentId === comp.id && w.toComponentId === ld.id) ||
                (w.toComponentId === comp.id && w.fromComponentId === ld.id)
            );
            if (connectedDirectly) {
              branchCurrentA += ldStatus.currentA;
              branchPowerW += ldStatus.activePowerW;
            }
          }
        });

        // If main breaker, receives total current
        if (comp.typeId === 'MCB_2P_MAIN' || comp.typeId === 'MCB_3P_MAIN') {
          branchCurrentA = totalCurrentA;
          branchPowerW = totalActivePowerW;
        }

        componentStatuses[comp.id].currentA = +branchCurrentA.toFixed(1);
        componentStatuses[comp.id].activePowerW = branchPowerW;

        // Overload check
        const ratedA = comp.customCurrentA ?? meta.ratedCurrentA ?? 16;
        if (branchCurrentA > ratedA * 1.1) {
          safetyAlerts.push({
            id: `overload-${comp.id}`,
            level: 'CRITICAL',
            titleKa: `ავტომატის გადატვირთვა: ${comp.customLabel}`,
            titleEn: `Breaker Overload: ${comp.customLabel}`,
            descriptionKa: `დენი ${branchCurrentA}A აღემატება ავტომატის ნომინალს (${ratedA}A). რეკომენდებულია დატვირთვის განაწილება.`,
            descriptionEn: `Current draw ${branchCurrentA}A exceeds rated capacity (${ratedA}A).`,
            relatedComponentIds: [comp.id],
          });
        }
      }
    }

    if (meta.category === 'RCD_DEVICE') {
      const outTerm = terminalStates[`${comp.id}:2_out`];
      if (outTerm && outTerm.isEnergized) {
        componentStatuses[comp.id].isEnergized = true;
        componentStatuses[comp.id].voltageV = gridVoltageL1;
        componentStatuses[comp.id].currentA = totalCurrentA;
      }
    }
  });

  // Short-circuit detection (direct phase to neutral short with 0 resistance)
  wires.forEach((w) => {
    const compA = componentMap.get(w.fromComponentId);
    const compB = componentMap.get(w.toComponentId);
    if (!compA || !compB) return;

    const termA = catalogMap.get(compA.typeId)?.terminals.find((t) => t.id === w.fromTerminalId);
    const termB = catalogMap.get(compB.typeId)?.terminals.find((t) => t.id === w.toTerminalId);

    if (termA && termB) {
      const isDirectPhaseNeutral =
        (termA.type === 'PHASE' && termB.type === 'NEUTRAL') ||
        (termA.type === 'NEUTRAL' && termB.type === 'PHASE');

      // If both are from distribution devices and not load terminals
      const isDistributionA =
        catalogMap.get(compA.typeId)?.category !== 'CONSUMER_LOAD';
      const isDistributionB =
        catalogMap.get(compB.typeId)?.category !== 'CONSUMER_LOAD';

      if (isDirectPhaseNeutral && isDistributionA && isDistributionB && gridPowerOn) {
        wireStates[w.id].isShortCircuit = true;
        safetyAlerts.push({
          id: `short-circuit-${w.id}`,
          level: 'CRITICAL',
          titleKa: 'მოკლე ჩართვა (Short Circuit)!',
          titleEn: 'Short Circuit Detected!',
          descriptionKa: `მავთული პირდაპირ აკავშირებს ფაზას (L) და ნოლს (N) დატვირთვის გარეშე! ავტომატი მომენტალურად გაითიშება.`,
          descriptionEn: `Direct short between Phase (L) and Neutral (N) with zero impedance. Instantaneous trip.`,
          relatedWireIds: [w.id],
          relatedComponentIds: [compA.id, compB.id],
        });
      }
    }
  });

  return {
    gridPowerOn,
    gridVoltageL1,
    gridVoltageL2,
    gridVoltageL3,
    gridFrequencyHz: 50,
    isThreePhase,
    componentStatuses,
    terminalStates,
    wireStates,
    totalPowerW: totalActivePowerW,
    totalCurrentA,
    safetyAlerts,
  };
}
