/**
 * ElectroPanel - Field Technician QR Code & Web Summary Payload Engine
 * Encodes and decodes panel schematic & load schedule data into URL-safe hash payloads.
 */

import { CircuitLoad, PanelConfig, PlacedComponent, WireConnection } from '../types';

export interface PanelTechnicianPayload {
  version: number;
  panelId: string;
  projectName: string;
  generatedAt: string;
  numRails: number;
  gridVoltage: number;
  components: Array<{
    id: string;
    typeId: string;
    railId: string;
    pos: number;
    label?: string;
    room?: string;
    powerW?: number;
    currentA?: number;
    breakerA?: number;
    curve?: string;
  }>;
  wires: Array<{
    id: string;
    from: string;
    fromTerm: string;
    to: string;
    toTerm: string;
    color: string;
    gauge: number;
  }>;
  loads: Array<{
    id: string;
    code: string;
    name: string;
    room: string;
    cat: string;
    powerW: number;
    voltageV: number;
    cosPhi: number;
    breakerA: number;
    gauge: number;
    cable: string;
    demandFactor: number;
  }>;
}

/**
 * Packs the live panel configuration and load schedule into a minimal compact payload
 */
export function packTechnicianPayload(
  components: PlacedComponent[],
  wires: WireConnection[],
  loads: CircuitLoad[],
  numRails: number = 3,
  projectName: string = 'Residential Distribution Board'
): PanelTechnicianPayload {
  return {
    version: 1,
    panelId: `DB-${Math.floor(1000 + Math.random() * 9000)}`,
    projectName,
    generatedAt: new Date().toISOString(),
    numRails,
    gridVoltage: 230,
    components: components.map((c) => ({
      id: c.id,
      typeId: c.typeId,
      railId: c.railId,
      pos: c.positionIndex,
      label: c.customLabel,
      room: c.breakerSettings?.circuitTypeTag || '',
      powerW: c.customPowerW,
      currentA: c.customCurrentA || c.breakerSettings?.ratedCurrentA,
      breakerA: c.breakerSettings?.ratedCurrentA,
      curve: c.curve || c.breakerSettings?.curve,
    })),
    wires: wires.map((w) => ({
      id: w.id,
      from: w.fromComponentId,
      fromTerm: w.fromTerminalId,
      to: w.toComponentId,
      toTerm: w.toTerminalId,
      color: w.color,
      gauge: w.gauge,
    })),
    loads: loads.map((l) => ({
      id: l.id,
      code: l.circuitCode,
      name: l.name,
      room: l.room,
      cat: l.category,
      powerW: l.powerW,
      voltageV: l.voltageV,
      cosPhi: l.cosPhi,
      breakerA: l.breakerRatingA,
      gauge: l.wireGaugeMm2,
      cable: l.cableType,
      demandFactor: l.demandFactor,
    })),
  };
}

/**
 * Encodes payload into URL-safe Base64 string
 */
export function encodePayloadToBase64(payload: PanelTechnicianPayload): string {
  try {
    const jsonStr = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonStr));
  } catch (err) {
    console.error('Failed to encode technician payload', err);
    return '';
  }
}

/**
 * Decodes URL-safe Base64 string back to technician payload
 */
export function decodePayloadFromBase64(base64Str: string): PanelTechnicianPayload | null {
  try {
    const jsonStr = decodeURIComponent(atob(base64Str));
    return JSON.parse(jsonStr) as PanelTechnicianPayload;
  } catch (err) {
    console.error('Failed to decode technician payload', err);
    return null;
  }
}

/**
 * Generates full field technician share URL
 */
export function generateFieldTechnicianUrl(payload: PanelTechnicianPayload): string {
  const base64 = encodePayloadToBase64(payload);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://electropanel.app';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  // Store in localStorage for instant access on same origin
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('electropanel_tech_summary_data', JSON.stringify(payload));
      localStorage.setItem(`electropanel_panel_${payload.panelId}`, JSON.stringify(payload));
    }
  } catch (e) {
    // Ignore storage quota errors
  }

  // Use URL search param & hash for maximum cross-browser and mobile compatibility
  return `${origin}${pathname}?view=tech_summary&panel=${payload.panelId}#data=${base64}`;
}
