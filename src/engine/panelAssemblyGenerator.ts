import * as XLSX from 'xlsx';
import {
  CircuitLoad,
  Language,
  PanelConfig,
  PlacedComponent,
  WireColorType,
  WireConnection,
  WireGauge,
} from '../types';
import { COMPONENT_CATALOG } from '../data/componentCatalog';

export interface BreakerListItem {
  id: string;
  name: string; // Label / Consumer name e.g. "მისაღების განათება"
  deviceType: 'MCB' | 'RCBO' | 'RCD' | 'VOLTAGE_RELAY' | 'SPD' | 'SMART_SWITCH';
  poles: 1 | 2 | 3 | 4;
  currentA: number; // 6, 10, 16, 20, 25, 32, 40, 50, 63
  curve: 'B' | 'C' | 'D';
  rcdSensitivityMa?: number; // 10, 30, 100, 300
  powerW: number; // Estimated power in Watts
  room: string; // e.g. "მისაღები", "სამზარეულო"
  category: 'LIGHTING' | 'SOCKETS' | 'AC_CLIMATE' | 'HEATING_BOILER' | 'KITCHEN' | 'WET_ROOM' | 'OUTDOOR' | 'GENERAL';
  phase: 'L1' | 'L2' | 'L3';
  wireGaugeMm2: number; // 1.5, 2.5, 4.0, 6.0, 10.0
  cableType: string; // e.g. "NYM 3x2.5"
  createLoadSimulation: boolean; // whether to create linked load object
}

export interface PanelAssemblyOptions {
  projectName: string;
  isThreePhase: boolean;
  gridVoltage: number; // 230 or 400
  includeMainInfeed: boolean;
  includeMainMcb: boolean;
  mainMcbCurrentA: number; // 32, 40, 50, 63
  includeVoltageRelay: boolean;
  includeGroupRcd: boolean;
  groupRcdCurrentA: number; // 40, 63
  groupRcdSensitivityMa: number; // 30, 100
  includeNeutralBusbar: boolean;
  includeGroundBusbar: boolean;
  autoWire: boolean;
  maxUnitsPerRail?: number; // default 18 (standard DIN rail capacity)
}

/**
 * Default sample lists for quick start
 */
export const DEFAULT_BREAKER_LISTS: {
  id: string;
  nameKa: string;
  nameEn: string;
  descriptionKa: string;
  descriptionEn: string;
  isThreePhase: boolean;
  items: BreakerListItem[];
}[] = [
  {
    id: 'standard-2-room',
    nameKa: '🏠 სტანდარტული 2-ოთახიანი ბინა (1-ფაზა)',
    nameEn: '🏠 Standard 2-Room Apartment (1-Phase)',
    descriptionKa: 'განათება, როზეტები, კონდიციონერი, სამზარეულოს ქურა, სარეცხი მანქანა და ბოილერი.',
    descriptionEn: 'Lighting, outlets, AC, kitchen stove, washing machine, and water boiler.',
    isThreePhase: false,
    items: [
      {
        id: 'b1',
        name: 'დერეფნისა და ოთახების განათება',
        deviceType: 'MCB',
        poles: 1,
        currentA: 10,
        curve: 'B',
        powerW: 150,
        room: 'დერეფანი / ოთახები',
        category: 'LIGHTING',
        phase: 'L1',
        wireGaugeMm2: 1.5,
        cableType: 'NYM 3x1.5',
        createLoadSimulation: true,
      },
      {
        id: 'b2',
        name: 'საძინებლის როზეტები',
        deviceType: 'MCB',
        poles: 1,
        currentA: 16,
        curve: 'C',
        powerW: 1200,
        room: 'საძინებელი',
        category: 'SOCKETS',
        phase: 'L1',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'b3',
        name: 'მისაღების როზეტები & TV',
        deviceType: 'MCB',
        poles: 1,
        currentA: 16,
        curve: 'C',
        powerW: 1800,
        room: 'მისაღები',
        category: 'SOCKETS',
        phase: 'L1',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'b4',
        name: 'ინვერტორული კონდიციონერი',
        deviceType: 'MCB',
        poles: 1,
        currentA: 20,
        curve: 'C',
        powerW: 1500,
        room: 'მისაღები',
        category: 'AC_CLIMATE',
        phase: 'L1',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'b5',
        name: 'სამზარეულოს როზეტები',
        deviceType: 'MCB',
        poles: 1,
        currentA: 16,
        curve: 'C',
        powerW: 2200,
        room: 'სამზარეულო',
        category: 'KITCHEN',
        phase: 'L1',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'b6',
        name: 'ინდუქციური ქურა / ღუმელი',
        deviceType: 'MCB',
        poles: 1,
        currentA: 25,
        curve: 'C',
        powerW: 3500,
        room: 'სამზარეულო',
        category: 'KITCHEN',
        phase: 'L1',
        wireGaugeMm2: 4.0,
        cableType: 'NYM 3x4.0',
        createLoadSimulation: true,
      },
      {
        id: 'b7',
        name: 'სარეცხი მანქანა & აბაზანა',
        deviceType: 'RCBO',
        poles: 2,
        currentA: 16,
        curve: 'C',
        rcdSensitivityMa: 30,
        powerW: 2200,
        room: 'აბაზანა',
        category: 'WET_ROOM',
        phase: 'L1',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'b8',
        name: 'წყლის გამაცხელებელი ბოილერი',
        deviceType: 'MCB',
        poles: 1,
        currentA: 20,
        curve: 'C',
        powerW: 2000,
        room: 'აბაზანა',
        category: 'HEATING_BOILER',
        phase: 'L1',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
    ],
  },
  {
    id: '3-phase-house',
    nameKa: '🏡 კერძო სახლი / ვილა (3-ფაზიანი 400V)',
    nameEn: '🏡 Private House / Villa (3-Phase 400V)',
    descriptionKa: '3-ფაზიანი დანაწილება: L1/L2/L3 ფაზების თანაბარი გადანაწილება, ქვაბი, ელექტრომობილის დამტენი.',
    descriptionEn: '3-Phase distribution across L1/L2/L3, heating boiler, and EV car charger.',
    isThreePhase: true,
    items: [
      {
        id: 'h1',
        name: '1-ლი სართულის განათება',
        deviceType: 'MCB',
        poles: 1,
        currentA: 10,
        curve: 'B',
        powerW: 200,
        room: '1-ლი სართული',
        category: 'LIGHTING',
        phase: 'L1',
        wireGaugeMm2: 1.5,
        cableType: 'NYM 3x1.5',
        createLoadSimulation: true,
      },
      {
        id: 'h2',
        name: '2-ე სართულის განათება',
        deviceType: 'MCB',
        poles: 1,
        currentA: 10,
        curve: 'B',
        powerW: 200,
        room: '2-ე სართული',
        category: 'LIGHTING',
        phase: 'L2',
        wireGaugeMm2: 1.5,
        cableType: 'NYM 3x1.5',
        createLoadSimulation: true,
      },
      {
        id: 'h3',
        name: 'მისაღებისა და სამზარეულოს როზეტები',
        deviceType: 'MCB',
        poles: 1,
        currentA: 16,
        curve: 'C',
        powerW: 2500,
        room: 'მისაღები',
        category: 'SOCKETS',
        phase: 'L3',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'h4',
        name: 'სამზარეულოს ინდუქციური ქურა (3P)',
        deviceType: 'MCB',
        poles: 3,
        currentA: 16,
        curve: 'C',
        powerW: 7200,
        room: 'სამზარეულო',
        category: 'KITCHEN',
        phase: 'L1',
        wireGaugeMm2: 4.0,
        cableType: 'NYM 5x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'h5',
        name: 'გათბობის ცენტრალური ქვაბი & ტუმბოები',
        deviceType: 'MCB',
        poles: 1,
        currentA: 16,
        curve: 'C',
        powerW: 2000,
        room: 'საქვაბე',
        category: 'HEATING_BOILER',
        phase: 'L2',
        wireGaugeMm2: 2.5,
        cableType: 'NYM 3x2.5',
        createLoadSimulation: true,
      },
      {
        id: 'h6',
        name: 'კონდიცირება (HVAC Multi-Split)',
        deviceType: 'MCB',
        poles: 1,
        currentA: 25,
        curve: 'C',
        powerW: 3500,
        room: 'ზოგადი',
        category: 'AC_CLIMATE',
        phase: 'L3',
        wireGaugeMm2: 4.0,
        cableType: 'NYM 3x4.0',
        createLoadSimulation: true,
      },
      {
        id: 'h7',
        name: 'ელექტრომობილის დამტენი (EV Wallbox 3P)',
        deviceType: 'MCB',
        poles: 3,
        currentA: 32,
        curve: 'C',
        powerW: 11000,
        room: 'ავტოფარეხი',
        category: 'GENERAL',
        phase: 'L1',
        wireGaugeMm2: 6.0,
        cableType: 'NYM 5x6.0',
        createLoadSimulation: true,
      },
    ],
  },
];

/**
 * Generate and download an Excel Template (.xlsx) for breaker list input
 */
export function generateBreakerListExcelTemplate(lang: Language = 'ka'): void {
  const isKa = lang === 'ka';

  const headers = [
    isKa ? '№' : 'No.',
    isKa ? 'დასახელება / მომხმარებელი' : 'Circuit / Consumer Description',
    isKa ? 'მოწყობილობის ტიპი (MCB / RCBO / RCD / SPD / SMART)' : 'Device Type (MCB / RCBO / RCD / SPD / SMART)',
    isKa ? 'პოლუსი (1P / 2P / 3P / 4P)' : 'Poles (1P / 2P / 3P / 4P)',
    isKa ? 'ნომინალი (A)' : 'Current Rating (A)',
    isKa ? 'მრუდი (B / C / D)' : 'Curve (B / C / D)',
    isKa ? 'უზო გაჟონვა (mA)' : 'RCD Sensitivity (mA)',
    isKa ? 'სიმძლავრე (W)' : 'Power (W)',
    isKa ? 'ოთახი / ლოკაცია' : 'Room / Location',
    isKa ? 'კატეგორია' : 'Category',
    isKa ? 'ფაზა (L1 / L2 / L3)' : 'Phase (L1 / L2 / L3)',
    isKa ? 'კაბელის კვეთა (მმ²)' : 'Wire Gauge (mm²)',
    isKa ? 'კაბელის მარკა' : 'Cable Type',
  ];

  const sampleRows: (string | number)[][] = [
    [
      isKa
        ? 'ElectroPanel - ავტომატების ჩამონათვალის შაბლონი (შეავსეთ ცხრილი და ატვირთეთ აწყობილი კარადის მისაღებად)'
        : 'ElectroPanel - Circuit Breakers Schedule Template (Fill in and upload to build assembled panel)',
    ],
    [
      isKa
        ? 'ინსტრუქცია: ნომინალში მიუთითეთ ამპერები (მაგ: 10, 16, 20, 25, 32, 40). ტიპში: MCB (ჩვეულებრივი), RCBO (დიფავტომატი), RCD (უზო).'
        : 'Instructions: In Current Rating write Amps (e.g. 10, 16, 20, 25, 32, 40). Type: MCB, RCBO (combo), RCD.',
    ],
    [], // Empty row
    headers,
    // Sample rows
    [1, isKa ? 'მისაღების განათება' : 'Living Room Lights', 'MCB', '1P', 10, 'B', '', 150, isKa ? 'მისაღები' : 'Living Room', 'LIGHTING', 'L1', 1.5, 'NYM 3x1.5'],
    [2, isKa ? 'საძინებლის განათება' : 'Bedroom Lights', 'MCB', '1P', 10, 'B', '', 100, isKa ? 'საძინებელი' : 'Bedroom', 'LIGHTING', 'L1', 1.5, 'NYM 3x1.5'],
    [3, isKa ? 'მისაღების როზეტები & TV' : 'Living Room Sockets', 'MCB', '1P', 16, 'C', '', 1800, isKa ? 'მისაღები' : 'Living Room', 'SOCKETS', 'L1', 2.5, 'NYM 3x2.5'],
    [4, isKa ? 'საძინებლის როზეტები' : 'Bedroom Sockets', 'MCB', '1P', 16, 'C', '', 1200, isKa ? 'საძინებელი' : 'Bedroom', 'SOCKETS', 'L1', 2.5, 'NYM 3x2.5'],
    [5, isKa ? 'სამზარეულოს როზეტები' : 'Kitchen Sockets', 'MCB', '1P', 16, 'C', '', 2200, isKa ? 'სამზარეულო' : 'Kitchen', 'KITCHEN', 'L1', 2.5, 'NYM 3x2.5'],
    [6, isKa ? 'ინდუქციური ქურა / ღუმელი' : 'Induction Cooktop', 'MCB', '1P', 25, 'C', '', 3500, isKa ? 'სამზარეულო' : 'Kitchen', 'KITCHEN', 'L1', 4.0, 'NYM 3x4.0'],
    [7, isKa ? 'კონდიციონერი Inverter' : 'AC Inverter', 'MCB', '1P', 20, 'C', '', 1500, isKa ? 'მისაღები' : 'Living Room', 'AC_CLIMATE', 'L1', 2.5, 'NYM 3x2.5'],
    [8, isKa ? 'სარეცხი მანქანა & აბაზანა' : 'Washing Machine', 'RCBO', '2P', 16, 'C', 30, 2200, isKa ? 'აბაზანა' : 'Bathroom', 'WET_ROOM', 'L1', 2.5, 'NYM 3x2.5'],
    [9, isKa ? 'წყლის გამაცხელებელი ბოილერი' : 'Water Boiler', 'MCB', '1P', 20, 'C', '', 2000, isKa ? 'აბაზანა' : 'Bathroom', 'HEATING_BOILER', 'L1', 2.5, 'NYM 3x2.5'],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleRows);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 32 }, // Name
    { wch: 18 }, // Type
    { wch: 10 }, // Poles
    { wch: 14 }, // Current A
    { wch: 14 }, // Curve
    { wch: 18 }, // RCD mA
    { wch: 14 }, // Power W
    { wch: 20 }, // Room
    { wch: 16 }, // Category
    { wch: 14 }, // Phase
    { wch: 18 }, // Wire Gauge
    { wch: 18 }, // Cable Type
  ];

  XLSX.utils.book_append_sheet(wb, ws, isKa ? 'ავტომატების სია' : 'Breakers List');
  XLSX.writeFile(wb, isKa ? 'ElectroPanel_ავტომატების_შაბლონი.xlsx' : 'ElectroPanel_Breakers_Template.xlsx');
}

/**
 * Parse uploaded Excel or CSV file into BreakerListItem array
 */
export async function parseBreakerListFromExcel(file: File): Promise<BreakerListItem[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error('Excel sheet is empty');

  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Locate the header row
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    const rowStr = row.map((cell) => String(cell).toLowerCase()).join(' ');
    if (
      rowStr.includes('დასახელება') ||
      rowStr.includes('ნომინალ') ||
      rowStr.includes('breaker') ||
      rowStr.includes('current') ||
      rowStr.includes('rating') ||
      rowStr.includes('circuit') ||
      rowStr.includes('მომხმარებელი')
    ) {
      headerRowIndex = r;
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const items: BreakerListItem[] = [];

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Check if the row has any content
    const allEmpty = row.every((c) => String(c).trim() === '');
    if (allEmpty) continue;

    // Let's identify columns intelligently
    let name = '';
    let deviceType: BreakerListItem['deviceType'] = 'MCB';
    let poles: 1 | 2 | 3 | 4 = 1;
    let currentA = 16;
    let curve: 'B' | 'C' | 'D' = 'C';
    let rcdSensitivityMa: number | undefined = undefined;
    let powerW = 1500;
    let room = 'ზოგადი';
    let category: BreakerListItem['category'] = 'SOCKETS';
    let phase: 'L1' | 'L2' | 'L3' = 'L1';
    let wireGaugeMm2 = 2.5;
    let cableType = 'NYM 3x2.5';

    // Standard column mapping when using template
    if (row.length >= 2) {
      // If 1st column is row number, 2nd is name
      const col0 = String(row[0] || '').trim();
      const col1 = String(row[1] || '').trim();
      const col2 = String(row[2] || '').trim();

      if (!isNaN(Number(col0)) && col1.length > 0) {
        name = col1;
        // Parse type from col2
        const typeStr = col2.toUpperCase();
        if (typeStr.includes('RCBO') || typeStr.includes('დიფ')) deviceType = 'RCBO';
        else if (typeStr.includes('RCD') || typeStr.includes('უზო')) deviceType = 'RCD';
        else if (typeStr.includes('SPD') || typeStr.includes('მუხტ')) deviceType = 'SPD';
        else if (typeStr.includes('SMART') || typeStr.includes('ჭკვიან')) deviceType = 'SMART_SWITCH';
        else deviceType = 'MCB';

        // Poles from col 3
        const polesStr = String(row[3] || '').toUpperCase();
        if (polesStr.includes('4P') || polesStr === '4') poles = 4;
        else if (polesStr.includes('3P') || polesStr === '3') poles = 3;
        else if (polesStr.includes('2P') || polesStr === '2') poles = 2;
        else poles = 1;

        // Current from col 4
        const rawCurr = Number(String(row[4] || '').replace(/[^0-9.]/g, ''));
        if (!isNaN(rawCurr) && rawCurr > 0) currentA = rawCurr;

        // Curve from col 5
        const curveStr = String(row[5] || '').trim().toUpperCase();
        if (curveStr.startsWith('B')) curve = 'B';
        else if (curveStr.startsWith('D')) curve = 'D';
        else curve = 'C';

        // RCD mA from col 6
        const rawRcd = Number(String(row[6] || '').replace(/[^0-9.]/g, ''));
        if (!isNaN(rawRcd) && rawRcd > 0) rcdSensitivityMa = rawRcd;

        // Power W from col 7
        const rawPow = Number(String(row[7] || '').replace(/[^0-9.]/g, ''));
        if (!isNaN(rawPow) && rawPow > 0) powerW = rawPow;

        // Room from col 8
        if (row[8]) room = String(row[8]).trim();

        // Category from col 9
        const catStr = String(row[9] || '').toUpperCase();
        if (catStr.includes('LIGHT') || catStr.includes('განათ')) category = 'LIGHTING';
        else if (catStr.includes('AC') || catStr.includes('კლიმატ')) category = 'AC_CLIMATE';
        else if (catStr.includes('BOILER') || catStr.includes('ბოილერ') || catStr.includes('გათბობ')) category = 'HEATING_BOILER';
        else if (catStr.includes('KITCHEN') || catStr.includes('სამზარეულ')) category = 'KITCHEN';
        else if (catStr.includes('WET') || catStr.includes('აბაზან')) category = 'WET_ROOM';
        else if (catStr.includes('OUT') || catStr.includes('გარე')) category = 'OUTDOOR';
        else category = 'SOCKETS';

        // Phase from col 10
        const phaseStr = String(row[10] || '').toUpperCase();
        if (phaseStr.includes('L2')) phase = 'L2';
        else if (phaseStr.includes('L3')) phase = 'L3';
        else phase = 'L1';

        // Wire Gauge from col 11
        const rawGauge = Number(String(row[11] || '').replace(/[^0-9.]/g, ''));
        if (!isNaN(rawGauge) && rawGauge > 0) wireGaugeMm2 = rawGauge;

        // Cable Type from col 12
        if (row[12]) cableType = String(row[12]).trim();
      } else {
        // Fallback generic extraction
        name = col0 || col1 || `ავტომატი №${r}`;
        const rowText = row.map((c) => String(c)).join(' ');
        const numMatches = rowText.match(/\b(6|10|16|20|25|32|40|50|63)\b/g);
        if (numMatches && numMatches.length > 0) {
          currentA = Number(numMatches[0]);
        }
      }
    }

    // Auto deduce defaults if not set
    if (currentA <= 10 && category === 'SOCKETS') {
      category = 'LIGHTING';
      curve = 'B';
      wireGaugeMm2 = 1.5;
      cableType = 'NYM 3x1.5';
    } else if (currentA >= 25 && wireGaugeMm2 <= 2.5) {
      wireGaugeMm2 = 4.0;
      cableType = 'NYM 3x4.0';
    }

    items.push({
      id: `item-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 5)}`,
      name: name || `წრედი №${items.length + 1}`,
      deviceType,
      poles,
      currentA,
      curve,
      rcdSensitivityMa,
      powerW,
      room,
      category,
      phase,
      wireGaugeMm2,
      cableType,
      createLoadSimulation: true,
    });
  }

  return items;
}

/**
 * Main Electrical Panel Generator: Takes a list of breaker definitions and builds
 * an entire assembled distribution panel (DIN Rails, Infeed, Main MCB, Voltage Relay,
 * RCDs, Busbars, Branch Breakers, Consumer Loads, and complete wiring connections).
 */
export function buildAssembledPanelFromList(
  items: BreakerListItem[],
  options: PanelAssemblyOptions
): {
  components: PlacedComponent[];
  wires: WireConnection[];
  circuitLoads: CircuitLoad[];
  numRails: number;
} {
  const components: PlacedComponent[] = [];
  const wires: WireConnection[] = [];
  const circuitLoads: CircuitLoad[] = [];

  const isThreePhase = options.isThreePhase;
  const maxUnitsPerRail = options.maxUnitsPerRail || 18;

  // -------------------------------------------------------------
  // Step 1: Create Main Distribution & Protection Rail (Rail 1)
  // -------------------------------------------------------------
  let rail1Pos = 0;

  // 1. Grid Infeed
  const infeedId = isThreePhase ? 'infeed-main-3p' : 'infeed-main-1p';
  if (options.includeMainInfeed) {
    components.push({
      id: infeedId,
      typeId: isThreePhase ? 'MAIN_INCOMING_3P' : 'MAIN_INCOMING_1P',
      railId: 'rail-1',
      positionIndex: rail1Pos++,
      customLabel: isThreePhase ? 'GRID 3x400V' : 'GRID 230V',
      isOn: true,
      isTripped: false,
    });
  }

  // 2. Main Disconnect Circuit Breaker
  const mainMcbId = isThreePhase ? 'main-mcb-3p' : 'main-mcb-2p';
  if (options.includeMainMcb) {
    components.push({
      id: mainMcbId,
      typeId: isThreePhase ? 'MCB_3P_MAIN' : 'MCB_2P_MAIN',
      railId: 'rail-1',
      positionIndex: rail1Pos++,
      customLabel: isThreePhase
        ? `მთავარი 3P C${options.mainMcbCurrentA || 50}`
        : `მთავარი 2P C${options.mainMcbCurrentA || 40}`,
      customCurrentA: options.mainMcbCurrentA || (isThreePhase ? 50 : 40),
      curve: 'C',
      isOn: true,
      isTripped: false,
    });
  }

  // 3. Digital Voltage & Surge Protection Relay
  const vrelayId = 'vrelay-main-1';
  if (options.includeVoltageRelay && !isThreePhase) {
    components.push({
      id: vrelayId,
      typeId: 'VOLTAGE_RELAY',
      railId: 'rail-1',
      positionIndex: rail1Pos++,
      customLabel: 'ძაბვის რელე 63A',
      customCurrentA: 63,
      isOn: true,
      isTripped: false,
      voltageRelaySettings: {
        minVoltage: 175,
        maxVoltage: 260,
        delaySeconds: 5,
      },
    });
  }

  // 4. Group RCD (УЗО)
  const groupRcdId = isThreePhase ? 'rcd-group-3p' : 'rcd-group-1p';
  if (options.includeGroupRcd) {
    components.push({
      id: groupRcdId,
      typeId: isThreePhase ? 'RCD_4P_30MA' : 'RCD_2P_30MA',
      railId: 'rail-1',
      positionIndex: rail1Pos++,
      customLabel: isThreePhase
        ? `უზო 4P ${options.groupRcdCurrentA || 40}A ${options.groupRcdSensitivityMa || 30}mA`
        : `უზო 2P ${options.groupRcdCurrentA || 40}A ${options.groupRcdSensitivityMa || 30}mA`,
      customCurrentA: options.groupRcdCurrentA || 40,
      rcdSensitivityMa: options.groupRcdSensitivityMa || 30,
      isOn: true,
      isTripped: false,
    });
  }

  // 5. Neutral (N) Busbar
  const nBusbarId = 'n-busbar-main';
  if (options.includeNeutralBusbar) {
    components.push({
      id: nBusbarId,
      typeId: items.length > 6 ? 'NEUTRAL_BUSBAR_12P' : 'NEUTRAL_BUSBAR_8P',
      railId: 'rail-1',
      positionIndex: rail1Pos++,
      customLabel: 'ნოლის შინა (N)',
      isOn: true,
      isTripped: false,
    });
  }

  // 6. Grounding (PE) Busbar
  const peBusbarId = 'pe-busbar-main';
  if (options.includeGroundBusbar) {
    components.push({
      id: peBusbarId,
      typeId: items.length > 6 ? 'GROUND_BUSBAR_12P' : 'GROUND_BUSBAR_8P',
      railId: 'rail-1',
      positionIndex: rail1Pos++,
      customLabel: 'დამიწების შინა (PE)',
      isOn: true,
      isTripped: false,
    });
  }

  // -------------------------------------------------------------
  // Step 2: Distribute Branch Breakers & Loads onto DIN Rails
  // -------------------------------------------------------------
  // We place branch circuit breakers on Rail 2 (and Rail 3/4 if many items)
  let currentRailIndex = 2;
  let currentRailUnits = 0;
  let railPositionMap: Record<number, number> = { 2: 0, 3: 0, 4: 0 };

  const createdBreakerIds: string[] = [];
  const createdLoadIds: string[] = [];

  items.forEach((item, idx) => {
    // Determine DIN module width for this device
    let dinUnits = 1;
    let catalogTypeId = 'MCB_1P_16A';

    if (item.deviceType === 'RCBO') {
      dinUnits = 2;
      catalogTypeId = item.currentA >= 25 ? 'RCBO_1PN_25A' : 'RCBO_1PN_16A';
    } else if (item.deviceType === 'RCD') {
      dinUnits = item.poles === 4 ? 4 : 2;
      catalogTypeId = item.poles === 4 ? 'RCD_4P_30MA' : 'RCD_2P_30MA';
    } else if (item.deviceType === 'SPD') {
      dinUnits = 2;
      catalogTypeId = 'SURGE_PROTECTOR_1PN';
    } else if (item.deviceType === 'SMART_SWITCH') {
      dinUnits = 1;
      catalogTypeId = 'SMART_RELAY_16A';
    } else {
      // MCB
      if (item.poles === 1) {
        dinUnits = 1;
        if (item.currentA <= 6) catalogTypeId = 'MCB_1P_6A';
        else if (item.currentA <= 10) catalogTypeId = 'MCB_1P_10A';
        else if (item.currentA <= 16 && item.curve === 'D') catalogTypeId = 'MCB_1P_16A_D';
        else if (item.currentA <= 16) catalogTypeId = 'MCB_1P_16A';
        else if (item.currentA <= 20) catalogTypeId = 'MCB_1P_20A';
        else if (item.currentA <= 25) catalogTypeId = 'MCB_1P_25A';
        else catalogTypeId = 'MCB_1P_32A';
      } else if (item.poles === 2) {
        dinUnits = 2;
        catalogTypeId = item.currentA >= 63 ? 'MCB_2P_63A' : 'MCB_2P_MAIN';
      } else if (item.poles === 3) {
        dinUnits = 3;
        catalogTypeId = 'MCB_3P_MAIN';
      } else {
        dinUnits = 4;
        catalogTypeId = 'MCB_4P_63A';
      }
    }

    // Check if we need to wrap to next rail
    if (currentRailUnits + dinUnits > maxUnitsPerRail && currentRailIndex < 4) {
      currentRailIndex++;
      currentRailUnits = 0;
    }

    const railId = `rail-${currentRailIndex}`;
    const pos = railPositionMap[currentRailIndex] || 0;
    railPositionMap[currentRailIndex] = pos + 1;
    currentRailUnits += dinUnits;

    const breakerCompId = `mcb-gen-${idx + 1}`;
    createdBreakerIds.push(breakerCompId);

    // Add Breaker Component
    components.push({
      id: breakerCompId,
      typeId: catalogTypeId,
      railId,
      positionIndex: pos,
      customLabel: `${item.name} (${item.curve || 'C'}${item.currentA}A)`,
      customCurrentA: item.currentA,
      curve: item.curve,
      rcdSensitivityMa: item.rcdSensitivityMa,
      isOn: true,
      isTripped: false,
    });

    // Create linked Consumer Load component if requested
    let loadCompId = '';
    if (item.createLoadSimulation) {
      // Find matching load type
      let loadTypeId = 'LOAD_SOCKETS';
      if (item.category === 'LIGHTING') loadTypeId = 'LOAD_LIGHTS';
      else if (item.category === 'AC_CLIMATE') loadTypeId = 'LOAD_AC';
      else if (item.category === 'HEATING_BOILER') loadTypeId = 'LOAD_BOILER';
      else if (item.category === 'KITCHEN') loadTypeId = item.powerW >= 3000 ? 'LOAD_COOKTOP' : 'LOAD_SOCKETS';
      else if (item.category === 'WET_ROOM') loadTypeId = 'LOAD_WASHING_MACHINE';

      loadCompId = `load-gen-${idx + 1}`;
      createdLoadIds.push(loadCompId);

      const loadPos = railPositionMap[currentRailIndex] || 0;
      railPositionMap[currentRailIndex] = loadPos + 1;

      components.push({
        id: loadCompId,
        typeId: loadTypeId,
        railId,
        positionIndex: loadPos,
        customLabel: item.name,
        customPowerW: item.powerW,
        isOn: true,
        isTripped: false,
      });
    }

    // Add to CircuitLoad schedule
    circuitLoads.push({
      id: `schedule-load-${idx + 1}`,
      circuitCode: `Q${idx + 1}`,
      name: item.name,
      room: item.room || 'ზოგადი',
      category: item.category || 'SOCKETS',
      powerW: item.powerW || 1500,
      voltageV: isThreePhase ? (item.poles >= 3 ? 400 : 230) : 230,
      cosPhi: item.category === 'LIGHTING' ? 0.95 : 0.92,
      breakerId: breakerCompId,
      breakerRatingA: item.currentA,
      wireGaugeMm2: item.wireGaugeMm2 || 2.5,
      cableType: item.cableType || 'NYM 3x2.5',
      demandFactor: item.category === 'LIGHTING' ? 0.9 : 0.75,
      phase: item.phase || 'L1',
      isActive: true,
      notes: `${item.curve}${item.currentA}A ${item.poles}P`,
      componentId: loadCompId || breakerCompId,
    });
  });

  const totalRails = Math.max(2, currentRailIndex);

  // -------------------------------------------------------------
  // Step 3: Automatic Intelligent Interconnections (Wiring)
  // -------------------------------------------------------------
  if (options.autoWire) {
    let wireCounter = 1;
    const addWire = (
      fromComp: string,
      fromTerm: string,
      toComp: string,
      toTerm: string,
      color: WireColorType,
      gauge: WireGauge
    ) => {
      wires.push({
        id: `w-gen-${wireCounter++}`,
        fromComponentId: fromComp,
        fromTerminalId: fromTerm,
        toComponentId: toComp,
        toTerminalId: toTerm,
        color,
        gauge,
      });
    };

    if (!isThreePhase) {
      // 1-Phase Standard Topology:
      // Infeed -> Main MCB -> Voltage Relay -> RCD -> N-Busbar & MCBs comb
      if (options.includeMainInfeed && options.includeMainMcb) {
        addWire(infeedId, 'L_out', mainMcbId, '1_in', 'PHASE_BROWN', 10.0);
        addWire(infeedId, 'N_out', mainMcbId, 'N_in', 'NEUTRAL_BLUE', 10.0);
        if (options.includeGroundBusbar) {
          addWire(infeedId, 'PE_out', peBusbarId, 'PE_main', 'GROUND_GREEN_YELLOW', 10.0);
        }
      }

      let currentSourceComp = options.includeMainMcb ? mainMcbId : infeedId;
      let currentSourceLTerm = options.includeMainMcb ? '2_out' : 'L_out';
      let currentSourceNTerm = options.includeMainMcb ? 'N_out' : 'N_out';

      // Connect to Voltage Relay if present
      if (options.includeVoltageRelay) {
        addWire(currentSourceComp, currentSourceLTerm, vrelayId, 'L_in', 'PHASE_BROWN', 10.0);
        addWire(currentSourceComp, currentSourceNTerm, vrelayId, 'N_in', 'NEUTRAL_BLUE', 10.0);
        currentSourceComp = vrelayId;
        currentSourceLTerm = 'L_out';
        currentSourceNTerm = 'N_out';
      }

      // Connect to Group RCD if present
      if (options.includeGroupRcd) {
        addWire(currentSourceComp, currentSourceLTerm, groupRcdId, '1_in', 'PHASE_BROWN', 10.0);
        addWire(currentSourceComp, currentSourceNTerm, groupRcdId, 'N_in', 'NEUTRAL_BLUE', 10.0);

        // RCD Neutral out -> N-Busbar
        if (options.includeNeutralBusbar) {
          addWire(groupRcdId, 'N_out', nBusbarId, 'N_main', 'NEUTRAL_BLUE', 10.0);
        }

        currentSourceComp = groupRcdId;
        currentSourceLTerm = '2_out';
      } else {
        // No RCD: Neutral directly to N-Busbar
        if (options.includeNeutralBusbar) {
          addWire(currentSourceComp, currentSourceNTerm, nBusbarId, 'N_main', 'NEUTRAL_BLUE', 10.0);
        }
      }

      // Chain Phase distribution busbar to Branch Breakers (Comb busbar)
      if (createdBreakerIds.length > 0) {
        // Feed first breaker
        addWire(currentSourceComp, currentSourceLTerm, createdBreakerIds[0], '1_in', 'PHASE_BROWN', 6.0);

        // Chain remaining breakers together on Line In (1_in)
        for (let b = 0; b < createdBreakerIds.length - 1; b++) {
          addWire(createdBreakerIds[b], '1_in', createdBreakerIds[b + 1], '1_in', 'PHASE_BROWN', 6.0);
        }
      }

      // Wire Branch Breakers to their respective Load simulation components
      items.forEach((item, idx) => {
        const breakerId = createdBreakerIds[idx];
        const loadId = createdLoadIds[idx];
        if (!breakerId || !loadId) return;

        const gauge = (item.wireGaugeMm2 as WireGauge) || 2.5;

        // Phase: Breaker Out -> Load L
        addWire(breakerId, '2_out', loadId, 'L', 'PHASE_BROWN', gauge);

        // Neutral: N-Busbar -> Load N
        if (options.includeNeutralBusbar) {
          const termIdx = Math.min((idx % 6) + 1, 6);
          addWire(nBusbarId, `N_${termIdx}`, loadId, 'N', 'NEUTRAL_BLUE', gauge);
        }

        // Ground: PE-Busbar -> Load PE (if load has PE)
        if (options.includeGroundBusbar && item.category !== 'LIGHTING') {
          const termIdx = Math.min((idx % 6) + 1, 6);
          addWire(peBusbarId, `PE_${termIdx}`, loadId, 'PE', 'GROUND_GREEN_YELLOW', gauge);
        }
      });
    } else {
      // 3-Phase Standard Topology
      if (options.includeMainInfeed && options.includeMainMcb) {
        addWire(infeedId, 'L1_out', mainMcbId, '1_in', 'PHASE_BROWN', 16.0);
        addWire(infeedId, 'L2_out', mainMcbId, '3_in', 'PHASE_BLACK', 16.0);
        addWire(infeedId, 'L3_out', mainMcbId, '5_in', 'PHASE_GREY', 16.0);
        if (options.includeGroundBusbar) {
          addWire(infeedId, 'PE_out', peBusbarId, 'PE_main', 'GROUND_GREEN_YELLOW', 16.0);
        }
        if (options.includeNeutralBusbar) {
          addWire(infeedId, 'N_out', nBusbarId, 'N_main', 'NEUTRAL_BLUE', 16.0);
        }
      }

      // Feed branch breakers according to phase
      items.forEach((item, idx) => {
        const breakerId = createdBreakerIds[idx];
        const loadId = createdLoadIds[idx];
        if (!breakerId) return;

        const mainOutTerm = item.phase === 'L2' ? '4_out' : item.phase === 'L3' ? '6_out' : '2_out';
        const color: WireColorType = item.phase === 'L2' ? 'PHASE_BLACK' : item.phase === 'L3' ? 'PHASE_GREY' : 'PHASE_BROWN';

        if (options.includeMainMcb) {
          addWire(mainMcbId, mainOutTerm, breakerId, '1_in', color, 6.0);
        }

        if (loadId) {
          const gauge = (item.wireGaugeMm2 as WireGauge) || 2.5;
          addWire(breakerId, '2_out', loadId, 'L', color, gauge);
          if (options.includeNeutralBusbar) {
            const termIdx = Math.min((idx % 9) + 1, 9);
            addWire(nBusbarId, `N_${termIdx}`, loadId, 'N', 'NEUTRAL_BLUE', gauge);
          }
          if (options.includeGroundBusbar && item.category !== 'LIGHTING') {
            const termIdx = Math.min((idx % 9) + 1, 9);
            addWire(peBusbarId, `PE_${termIdx}`, loadId, 'PE', 'GROUND_GREEN_YELLOW', gauge);
          }
        }
      });
    }
  }

  return {
    components,
    wires,
    circuitLoads,
    numRails: totalRails,
  };
}
