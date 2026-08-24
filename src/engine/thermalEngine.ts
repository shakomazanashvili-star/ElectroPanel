import { COMPONENT_CATALOG } from '../data/componentCatalog';
import {
  ComponentThermalData,
  PanelThermalState,
  PlacedComponent,
  SafetyAlert,
  SimulationState,
  ThermalPalette,
  ThermalRiskLevel,
  WireConnection,
} from '../types';

/**
 * Returns RGB interpolated hex or rgba for thermal spectrum visualization
 */
export function getThermalColor(
  tempC: number,
  minTemp: number = 25,
  maxTemp: number = 105,
  palette: ThermalPalette = 'FLIR_IRONBOW',
  alpha: number = 1
): string {
  // Normalize temperature between 0 and 1
  const t = Math.max(0, Math.min(1, (tempC - minTemp) / (maxTemp - minTemp || 1)));

  let r = 0;
  let g = 0;
  let b = 0;

  if (palette === 'FLIR_IRONBOW') {
    // FLIR Ironbow: Black -> Dark Purple -> Deep Violet -> Red/Orange -> Amber/Yellow -> White
    if (t < 0.15) {
      const p = t / 0.15;
      r = Math.round(15 + p * 40);
      g = Math.round(10 + p * 15);
      b = Math.round(40 + p * 70);
    } else if (t < 0.35) {
      const p = (t - 0.15) / 0.2;
      r = Math.round(55 + p * 110);
      g = Math.round(25 + p * 15);
      b = Math.round(110 - p * 30);
    } else if (t < 0.6) {
      const p = (t - 0.35) / 0.25;
      r = Math.round(165 + p * 75);
      g = Math.round(40 + p * 80);
      b = Math.round(80 - p * 70);
    } else if (t < 0.85) {
      const p = (t - 0.6) / 0.25;
      r = Math.round(240 + p * 15);
      g = Math.round(120 + p * 115);
      b = Math.round(10 + p * 30);
    } else {
      const p = (t - 0.85) / 0.15;
      r = 255;
      g = Math.round(235 + p * 20);
      b = Math.round(40 + p * 215);
    }
  } else if (palette === 'RAINBOW_JET') {
    // Classic Rainbow Jet: Deep Blue -> Cyan -> Green -> Yellow -> Red -> White
    if (t < 0.2) {
      const p = t / 0.2;
      r = 0;
      g = Math.round(p * 200);
      b = 255;
    } else if (t < 0.4) {
      const p = (t - 0.2) / 0.2;
      r = 0;
      g = 255;
      b = Math.round(255 - p * 200);
    } else if (t < 0.65) {
      const p = (t - 0.4) / 0.25;
      r = Math.round(p * 255);
      g = 255;
      b = 0;
    } else if (t < 0.85) {
      const p = (t - 0.65) / 0.2;
      r = 255;
      g = Math.round(255 - p * 200);
      b = 0;
    } else {
      const p = (t - 0.85) / 0.15;
      r = 255;
      g = Math.round(55 + p * 200);
      b = Math.round(p * 255);
    }
  } else if (palette === 'HIGH_CONTRAST') {
    // Medical/Industrial High Contrast Alert
    if (t < 0.45) {
      r = 30;
      g = Math.round(t * 180);
      b = 200;
    } else if (t < 0.7) {
      r = Math.round(220);
      g = Math.round(180 - (t - 0.45) * 200);
      b = 20;
    } else {
      r = 255;
      g = Math.round((1 - t) * 80);
      b = Math.round((1 - t) * 80);
    }
  } else {
    // HEAT_GLOW: Subtle dark amber glow
    if (t < 0.4) {
      const p = t / 0.4;
      r = Math.round(30 + p * 90);
      g = Math.round(20 + p * 40);
      b = Math.round(40 + p * 20);
    } else if (t < 0.75) {
      const p = (t - 0.4) / 0.35;
      r = Math.round(120 + p * 125);
      g = Math.round(60 + p * 80);
      b = Math.round(60 - p * 40);
    } else {
      const p = (t - 0.75) / 0.25;
      r = 255;
      g = Math.round(140 + p * 115);
      b = Math.round(20 + p * 210);
    }
  }

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Calculates complete thermodynamic model of the electrical distribution panel
 */
export function calculateThermalState(
  components: PlacedComponent[],
  wires: WireConnection[],
  simulationState: SimulationState,
  baseAmbientTempC: number = 25.0
): PanelThermalState {
  const catalogMap = new Map(COMPONENT_CATALOG.map((c) => [c.type, c]));
  const componentsThermal: Record<string, ComponentThermalData> = {};

  // Group components by rail to compute spatial neighbor proximity heating
  const railGroups: Record<string, PlacedComponent[]> = {};
  components.forEach((comp) => {
    if (!railGroups[comp.railId]) {
      railGroups[comp.railId] = [];
    }
    railGroups[comp.railId].push(comp);
  });

  // Sort components in each rail by positionIndex
  Object.keys(railGroups).forEach((railId) => {
    railGroups[railId].sort((a, b) => a.positionIndex - b.positionIndex);
  });

  let totalHeatLossWatts = 0;
  let maxBoardTempC = baseAmbientTempC;
  let minBoardTempC = baseAmbientTempC;
  let sumTemp = 0;
  let maxHotspotComponentId: string | null = null;

  // 1. First Pass: Compute self-heating for each component
  const selfHeatingMap: Record<
    string,
    {
      ambient: number;
      selfDelta: number;
      nominalTemp: number;
      powerLossW: number;
      loadRatio: number;
    }
  > = {};

  components.forEach((comp) => {
    const meta = catalogMap.get(comp.typeId);
    const status = simulationState.componentStatuses[comp.id] || {
      isEnergized: false,
      currentA: 0,
      activePowerW: 0,
      isTripped: false,
    };

    // Calculate convective ambient temperature based on rail elevation
    // Top rails are warmer due to rising warm air inside the enclosed enclosure
    const railNumMatch = comp.railId.match(/\d+/);
    const railIndex = railNumMatch ? parseInt(railNumMatch[0], 10) - 1 : 0;
    const railAmbientTempC = baseAmbientTempC + railIndex * 2.2;

    const currentA = status.isEnergized && !comp.isTripped ? status.currentA : 0;
    const ratedA = comp.customCurrentA || meta?.ratedCurrentA || 16;
    const loadRatio = ratedA > 0 ? currentA / ratedA : 0;

    // Joule heating dissipation model: P_loss = I^2 * R_internal
    // Typical MCB 16A internal resistance: ~3.5 mOhm per pole; Main MCB 40A ~ 1.2 mOhm
    let internalResistanceOhm = 0.0035;
    if (ratedA <= 10) internalResistanceOhm = 0.007;
    else if (ratedA >= 40) internalResistanceOhm = 0.0012;

    const poles = comp.breakerSettings?.poles || meta?.poles || 1;
    const powerLossW = Math.max(
      0.1,
      Number((Math.pow(currentA, 2) * internalResistanceOhm * poles + (currentA > 0 ? 0.35 : 0)).toFixed(2))
    );

    // Temperature rise from self heating (non-linear exponent according to IEC 60898 calibration)
    // 0% load -> +0°C
    // 50% load -> +12°C
    // 100% load -> +44°C (reaches ~69°C total at 25°C ambient)
    // 125% overload -> +72°C (reaches ~97°C total)
    // 150% overload -> +105°C (reaches ~130°C hotspot)
    let selfDelta = 0;
    if (currentA > 0) {
      selfDelta = 44.0 * Math.pow(loadRatio, 1.82);
    }

    // Special loads: Electric cooktop / oven radiate ambient warmth
    if (meta?.category === 'CONSUMER_LOAD' && status.isEnergized && comp.isOn) {
      selfDelta = Math.min(65, (status.activePowerW / 3000) * 35);
    }

    const nominalTemp = railAmbientTempC + selfDelta;
    selfHeatingMap[comp.id] = {
      ambient: railAmbientTempC,
      selfDelta,
      nominalTemp,
      powerLossW,
      loadRatio,
    };
  });

  // 2. Second Pass: Compute Mutual Proximity Heating between adjacent devices on the same DIN rail
  components.forEach((comp) => {
    const selfData = selfHeatingMap[comp.id];
    const railComps = railGroups[comp.railId] || [];
    const myIndexInRail = railComps.findIndex((c) => c.id === comp.id);

    let mutualHeatingDeltaC = 0;

    // Check immediate left and right neighbors on DIN rail
    if (myIndexInRail > 0) {
      const leftNeighbor = railComps[myIndexInRail - 1];
      const leftData = selfHeatingMap[leftNeighbor.id];
      if (leftData && leftData.loadRatio > 0.4) {
        // Conductive and radiant thermal transfer from left
        mutualHeatingDeltaC += (leftData.selfDelta * 0.18);
      }
    }

    if (myIndexInRail >= 0 && myIndexInRail < railComps.length - 1) {
      const rightNeighbor = railComps[myIndexInRail + 1];
      const rightData = selfHeatingMap[rightNeighbor.id];
      if (rightData && rightData.loadRatio > 0.4) {
        // Conductive and radiant thermal transfer from right
        mutualHeatingDeltaC += (rightData.selfDelta * 0.18);
      }
    }

    // Heavy cluster penalty (if 3+ adjacent breakers are under high load)
    if (selfData.loadRatio > 0.7 && mutualHeatingDeltaC > 6.0) {
      mutualHeatingDeltaC *= 1.25; // Dense DIN pack thermal entrapment
    }

    const effectiveTempC = Number((selfData.nominalTemp + mutualHeatingDeltaC).toFixed(1));
    totalHeatLossWatts += selfData.powerLossW;

    // Determine Risk Level
    let riskLevel: ThermalRiskLevel = 'SAFE';
    let warningKa: string | undefined;
    let warningEn: string | undefined;

    if (effectiveTempC >= 90) {
      riskLevel = 'CRITICAL_HOTSPOT';
      warningKa = `კრიტიკული გადახურება (${effectiveTempC}°C)! იზოლაციის დაზიანებისა და თერმული ავარიის საფრთხე!`;
      warningEn = `Critical Hotspot (${effectiveTempC}°C)! Risk of insulation degradation and thermal fire hazard!`;
    } else if (effectiveTempC >= 75) {
      riskLevel = 'OVERHEATING';
      warningKa = `მაღალი თერმული დატვირთვა (${effectiveTempC}°C). რეკომენდებულია მეზობელ ავტომატებთან დისტანციის დაცვა.`;
      warningEn = `Elevated Overheating (${effectiveTempC}°C). Exceeds nominal continuous thermal limits.`;
    } else if (effectiveTempC >= 58) {
      riskLevel = 'ELEVATED';
      warningKa = `მომატებული ტემპერატურა (${effectiveTempC}°C). შეამოწმეთ ფარის ვენტილაცია.`;
      warningEn = `Elevated temperature (${effectiveTempC}°C). High continuous operating load.`;
    } else if (effectiveTempC >= 42) {
      riskLevel = 'NOMINAL';
    } else {
      riskLevel = 'SAFE';
    }

    // IEC 60898 Breaker Derating Factor (Capacity reduces as ambient temperature rises above 30°C)
    // Formula: In_effective = In * (1 - 0.005 * (T_enclosure - 30))
    let deratingFactor = 1.0;
    if (effectiveTempC > 30) {
      deratingFactor = Math.max(0.65, Number((1 - 0.0055 * (effectiveTempC - 30)).toFixed(2)));
    }

    componentsThermal[comp.id] = {
      componentId: comp.id,
      nominalTempC: Number(selfData.nominalTemp.toFixed(1)),
      effectiveTempC,
      ambientTempC: Number(selfData.ambient.toFixed(1)),
      temperatureRiseDeltaC: Number(selfData.selfDelta.toFixed(1)),
      mutualHeatingDeltaC: Number(mutualHeatingDeltaC.toFixed(1)),
      heatDissipationWatts: selfData.powerLossW,
      loadRatio: Number(selfData.loadRatio.toFixed(2)),
      riskLevel,
      deratingFactor,
      hotspotWarningKa: warningKa,
      hotspotWarningEn: warningEn,
    };

    if (effectiveTempC > maxBoardTempC) {
      maxBoardTempC = effectiveTempC;
      maxHotspotComponentId = comp.id;
    }
    if (effectiveTempC < minBoardTempC) {
      minBoardTempC = effectiveTempC;
    }
    sumTemp += effectiveTempC;
  });

  const avgBoardTempC =
    components.length > 0
      ? Number((sumTemp / components.length).toFixed(1))
      : baseAmbientTempC;

  return {
    isThermalOverlayActive: false,
    palette: 'FLIR_IRONBOW',
    opacity: 0.85,
    showTemperatureBadges: true,
    showHeatPlumes: true,
    ambientTempC: baseAmbientTempC,
    maxBoardTempC: Number(maxBoardTempC.toFixed(1)),
    minBoardTempC: Number(minBoardTempC.toFixed(1)),
    avgBoardTempC,
    maxHotspotComponentId,
    totalHeatLossWatts: Number(totalHeatLossWatts.toFixed(1)),
    componentsThermal,
  };
}

/**
 * Creates thermal safety alerts to be added to simulation state
 */
export function generateThermalAlerts(
  thermalState: PanelThermalState,
  components: PlacedComponent[]
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const compMap = new Map(components.map((c) => [c.id, c]));

  Object.values(thermalState.componentsThermal).forEach((item) => {
    const comp = compMap.get(item.componentId);
    if (!comp) return;

    if (item.riskLevel === 'CRITICAL_HOTSPOT') {
      alerts.push({
        id: `thermal-crit-${item.componentId}`,
        level: 'CRITICAL',
        titleKa: `🔥 კრიტიკული თერმული გადახურება: ${comp.customLabel}`,
        titleEn: `🔥 Critical Thermal Hotspot: ${comp.customLabel}`,
        descriptionKa: `ტემპერატურამ მიაღწია ${item.effectiveTempC}°C-ს (დატვირთვა: ${(item.loadRatio * 100).toFixed(0)}%). ავტომატის გამტარუნარიანობა დერეიტინგით შემცირებულია ${(item.deratingFactor * 100).toFixed(0)}%-მდე!`,
        descriptionEn: `Device temperature surged to ${item.effectiveTempC}°C (Load: ${(item.loadRatio * 100).toFixed(0)}%). Continuous rating derated to ${(item.deratingFactor * 100).toFixed(0)}%! Immediate trip risk.`,
        relatedComponentIds: [item.componentId],
      });
    } else if (item.riskLevel === 'OVERHEATING') {
      alerts.push({
        id: `thermal-warn-${item.componentId}`,
        level: 'WARNING',
        titleKa: `⚠️ თერმული გაფრთხილება: ${comp.customLabel}`,
        titleEn: `⚠️ Thermal Overheating Warning: ${comp.customLabel}`,
        descriptionKa: `ტემპერატურაა ${item.effectiveTempC}°C (გამოყოფილი სითბო: ${item.heatDissipationWatts}W, მეზობელი ავტომატებისგან ურთიერთგახურება: +${item.mutualHeatingDeltaC}°C).`,
        descriptionEn: `Component operating at ${item.effectiveTempC}°C (Heat loss: ${item.heatDissipationWatts}W, mutual thermal coupling: +${item.mutualHeatingDeltaC}°C).`,
        relatedComponentIds: [item.componentId],
      });
    }
  });

  return alerts;
}
