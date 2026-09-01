import * as XLSX from 'xlsx';
import { CircuitLoad, Language } from '../types';

export interface ExportScheduleOptions {
  projectName?: string;
  engineerName?: string;
  gridVoltage?: number;
  isThreePhase?: boolean;
}

/**
 * Exports the Circuit & Load Schedule to a formatted Microsoft Excel (.xlsx) file
 */
export function exportLoadsToExcel(
  loads: CircuitLoad[],
  lang: Language = 'ka',
  options: ExportScheduleOptions = {}
): void {
  const isKa = lang === 'ka';
  const projectName = options.projectName || (isKa ? 'საცხოვრებელი ბინის ელექტრო ფარი' : 'Electrical Distribution Board');
  const engineerName = options.engineerName || (isKa ? 'სერტიფიცირებული ინჟინერ-ელექტრიკოსი' : 'Certified Electrical Engineer');
  const dateStr = new Date().toLocaleDateString(isKa ? 'ka-GE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate Totals
  const totalInstalledPowerW = loads.reduce((sum, l) => sum + (l.powerW || 0), 0);
  const totalInstalledPowerKw = totalInstalledPowerW / 1000;
  const totalDesignPowerKw = loads.reduce((sum, l) => sum + ((l.powerW || 0) * (l.demandFactor || 1)) / 1000, 0);
  const totalCurrentA = loads.reduce((sum, l) => {
    const v = l.voltageV || 230;
    const cos = l.cosPhi || 0.95;
    return sum + (l.powerW || 0) / (v * cos);
  }, 0);

  // Category labels helper
  const getCatName = (cat: string) => {
    switch (cat) {
      case 'LIGHTING': return isKa ? 'განათება' : 'Lighting';
      case 'SOCKETS': return isKa ? 'როზეტები' : 'Power Sockets';
      case 'AC_CLIMATE': return isKa ? 'კლიმატი / HVAC' : 'AC / Climate';
      case 'HEATING_BOILER': return isKa ? 'გათბობა / ბოილერი' : 'Heating / Boiler';
      case 'KITCHEN': return isKa ? 'სამზარეულო' : 'Kitchen Appliance';
      case 'WET_ROOM': return isKa ? 'აბაზანა / სველი წერტ.' : 'Wet Room / Bath';
      case 'OUTDOOR': return isKa ? 'გარე პერიმეტრი' : 'Outdoor';
      default: return isKa ? 'ზოგადი' : 'General';
    }
  };

  // Recommended Main Breaker
  let recMainMcb = 'C25 (25A)';
  if (totalCurrentA > 63) recMainMcb = 'C80 (80A)';
  else if (totalCurrentA > 50) recMainMcb = 'C63 (63A)';
  else if (totalCurrentA > 40) recMainMcb = 'C50 (50A)';
  else if (totalCurrentA > 32) recMainMcb = 'C40 (40A)';
  else if (totalCurrentA > 25) recMainMcb = 'C32 (32A)';

  // Build 2D Sheet Rows Array
  const sheetData: (string | number)[][] = [
    // Header Banner
    [isKa ? 'ElectroPanel - ელექტრო ფარის მომხმარებლებისა და დატვირთვების გრაფა (ტექნიკური პასპორტი)' : 'ElectroPanel - Electrical Circuit & Load Schedule Matrix'],
    [isKa ? `პროექტი: ${projectName}` : `Project: ${projectName}`, '', isKa ? `თარიღი: ${dateStr}` : `Date: ${dateStr}`],
    [isKa ? `ინჟინერი: ${engineerName}` : `Engineer: ${engineerName}`, '', isKa ? 'სტანდარტი: IEC 60364-5-52 / IEC 61439-1' : 'Standard: IEC 60364 / IEC 61439-1'],
    [], // Empty row
    // Column Headers
    [
      isKa ? '№' : 'No.',
      isKa ? 'წრედის კოდი' : 'Circuit Code',
      isKa ? 'მომხმარებლის დასახელება' : 'Circuit / Consumer Description',
      isKa ? 'ოთახი / ლოკაცია' : 'Room / Location',
      isKa ? 'კატეგორია' : 'Category',
      isKa ? 'დადგმული სიმძლავრე (W)' : 'Installed Power (W)',
      isKa ? 'სიმძლავრე (kW)' : 'Power (kW)',
      isKa ? 'ძაბვა (V)' : 'Voltage (V)',
      'cos φ',
      isKa ? 'ნომინალური დენი (A)' : 'Nominal Current (A)',
      isKa ? 'კვების ავტომატი (MCB)' : 'Protective Breaker (MCB)',
      isKa ? 'კაბელის კვეთა (მმ²)' : 'Wire Gauge (mm²)',
      isKa ? 'კაბელის მარკა' : 'Cable Type',
      isKa ? 'მოთხოვნის კოეფ. (Kc)' : 'Demand Factor (Kc)',
      isKa ? 'გათვლილი სიმძლავრე (kW)' : 'Design Power (kW)',
      isKa ? 'სტატუსი' : 'Status',
      isKa ? 'შენიშვნა' : 'Notes',
    ],
  ];

  // Data rows
  loads.forEach((load, idx) => {
    const powerW = load.powerW || 0;
    const powerKw = Number((powerW / 1000).toFixed(3));
    const volt = load.voltageV || 230;
    const cosPhi = load.cosPhi || 0.95;
    const currentA = Number((powerW / (volt * cosPhi)).toFixed(2));
    const demandFactor = load.demandFactor || 1.0;
    const calcPowerKw = Number(((powerW * demandFactor) / 1000).toFixed(3));
    const statusText = load.isActive !== false ? (isKa ? 'აქტიური (ON)' : 'Active (ON)') : (isKa ? 'გათიშული (OFF)' : 'Inactive (OFF)');

    sheetData.push([
      idx + 1,
      load.circuitCode || `Q${idx + 1}`,
      load.name || (isKa ? `მომხმარებელი ${idx + 1}` : `Consumer ${idx + 1}`),
      load.room || (isKa ? 'მთავარი' : 'Main'),
      getCatName(load.category),
      powerW,
      powerKw,
      volt,
      cosPhi,
      currentA,
      load.breakerRatingA ? `C${load.breakerRatingA}` : (load.breakerId || 'C16'),
      load.wireGaugeMm2 || (powerW > 2500 ? 4.0 : powerW > 1500 ? 2.5 : 1.5),
      load.cableType || (powerW > 2500 ? 'NYM 3x4.0' : powerW > 1500 ? 'NYM 3x2.5' : 'NYM 3x1.5'),
      demandFactor,
      calcPowerKw,
      statusText,
      load.notes || '',
    ]);
  });

  // Summary Rows
  sheetData.push([]);
  sheetData.push([
    '',
    isKa ? 'ჯამური მაჩვენებლები:' : 'Summary Totals:',
    '',
    '',
    '',
    totalInstalledPowerW,
    Number(totalInstalledPowerKw.toFixed(2)),
    '',
    '',
    Number(totalCurrentA.toFixed(2)),
    '',
    '',
    '',
    '',
    Number(totalDesignPowerKw.toFixed(2)),
    '',
    '',
  ]);

  sheetData.push([
    '',
    isKa ? 'ჯამური დადგმული სიმძლავრე:' : 'Total Installed Capacity:',
    `${totalInstalledPowerKw.toFixed(2)} kW (${totalInstalledPowerW} W)`,
  ]);
  sheetData.push([
    '',
    isKa ? 'გათვლილი სიმძლავრე (ერთდროულობის კოეფიციენტით):' : 'Total Design Power (with Demand Factor):',
    `${totalDesignPowerKw.toFixed(2)} kW`,
  ]);
  sheetData.push([
    '',
    isKa ? 'ჯამური მაქსიმალური დენი:' : 'Total Operating Current Draw:',
    `${totalCurrentA.toFixed(2)} A`,
  ]);
  sheetData.push([
    '',
    isKa ? 'რეკომენდებული მთავარი შემავალი ავტომატი:' : 'Recommended Main Incomer Breaker:',
    recMainMcb,
  ]);

  // Create workbook & worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // №
    { wch: 12 }, // Code
    { wch: 32 }, // Name
    { wch: 18 }, // Room
    { wch: 18 }, // Category
    { wch: 22 }, // Power W
    { wch: 16 }, // Power kW
    { wch: 12 }, // Volt
    { wch: 10 }, // cos phi
    { wch: 18 }, // Current A
    { wch: 22 }, // Breaker
    { wch: 18 }, // Wire mm2
    { wch: 16 }, // Cable type
    { wch: 18 }, // Demand factor
    { wch: 22 }, // Calc power
    { wch: 16 }, // Status
    { wch: 24 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, isKa ? 'დატვირთვების ცხრილი' : 'Load Schedule');

  // Generate file name & write
  const safeDate = new Date().toISOString().slice(0, 10);
  const fileName = `ElectroPanel_Load_Schedule_${safeDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports the Circuit & Load Schedule to a UTF-8 encoded CSV file
 */
export function exportLoadsToCsv(
  loads: CircuitLoad[],
  lang: Language = 'ka'
): void {
  const isKa = lang === 'ka';

  const headers = [
    isKa ? '№' : 'No.',
    isKa ? 'წრედის კოდი' : 'Circuit Code',
    isKa ? 'მომხმარებელი / დანიშნულება' : 'Description',
    isKa ? 'ოთახი / ლოკაცია' : 'Room',
    isKa ? 'კატეგორია' : 'Category',
    isKa ? 'სიმძლავრე (W)' : 'Power (W)',
    isKa ? 'სიმძლავრე (kW)' : 'Power (kW)',
    isKa ? 'ძაბვა (V)' : 'Voltage (V)',
    'cos phi',
    isKa ? 'დენი (A)' : 'Current (A)',
    isKa ? 'ავტომატი' : 'Breaker',
    isKa ? 'სადენის კვეთა (მმ²)' : 'Wire mm2',
    isKa ? 'კაბელის მარკა' : 'Cable Type',
    isKa ? 'მოთხოვნის კოეფ. (Kc)' : 'Demand Factor (Kc)',
    isKa ? 'გათვლილი სიმძლავრე (kW)' : 'Design kW',
    isKa ? 'სტატუსი' : 'Status',
    isKa ? 'შენიშვნა' : 'Notes',
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
      `"${l.circuitCode || `Q${idx + 1}`}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.room || '').replace(/"/g, '""')}"`,
      `"${l.category}"`,
      powerW,
      powerKw,
      volt,
      cosPhi,
      currentA,
      `"${l.breakerRatingA ? `C${l.breakerRatingA}` : l.breakerId || 'C16'}"`,
      l.wireGaugeMm2 || 2.5,
      `"${l.cableType || 'NYM 3x2.5'}"`,
      demandFactor,
      calcPowerKw,
      l.isActive !== false ? 'ON' : 'OFF',
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ElectroPanel_Load_Schedule_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Splits a CSV line into tokens, respecting quotes, escaped quotes, and delimiter.
 */
export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses a CSV string (from export or external electrical calculation tools)
 * into typed CircuitLoad array.
 */
export function parseLoadsFromCsv(csvText: string): { loads: CircuitLoad[]; error?: string } {
  if (!csvText || !csvText.trim()) {
    return { loads: [], error: 'Empty file' };
  }

  // Remove potential UTF-8 BOM
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const rawLines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { loads: [], error: 'No data rows found' };
  }

  // Auto-detect delimiter from first row (comma, semicolon, or tab)
  const sampleLine = rawLines[0];
  let delimiter = ',';
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const semicolonCount = (sampleLine.match(/;/g) || []).length;
  const tabCount = (sampleLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  // Column index map
  const colIndex = {
    num: -1,
    code: -1,
    name: -1,
    room: -1,
    category: -1,
    powerW: -1,
    powerKw: -1,
    voltage: -1,
    cosPhi: -1,
    current: -1,
    breaker: -1,
    wireGauge: -1,
    cableType: -1,
    demandFactor: -1,
    status: -1,
    notes: -1,
  };

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u10A0-\u10FF]/g, '');
  let headerRowIndex = -1;

  // Scan first 5 lines for a recognizable table header
  for (let r = 0; r < Math.min(rawLines.length, 5); r++) {
    const tokens = parseCsvLine(rawLines[r], delimiter);
    let matchedKeywords = 0;

    tokens.forEach((rawCol, idx) => {
      const col = normalize(rawCol);
      if (col.includes('circuit') || col.includes('code') || col.includes('კოდი') || col === 'q' || col === 'id') {
        colIndex.code = idx;
        matchedKeywords++;
      } else if (
        col.includes('name') ||
        col.includes('desc') ||
        col.includes('მომხმარებელ') ||
        col.includes('დანიშნულებ') ||
        col.includes('appliance') ||
        col.includes('load')
      ) {
        colIndex.name = idx;
        matchedKeywords++;
      } else if (col.includes('room') || col.includes('ოთახი') || col.includes('ლოკაცი') || col.includes('area') || col.includes('loc')) {
        colIndex.room = idx;
        matchedKeywords++;
      } else if (col.includes('category') || col.includes('კატეგორი') || col.includes('type') || col.includes('ტიპი')) {
        colIndex.category = idx;
        matchedKeywords++;
      } else if (
        col.includes('powerw') ||
        col.includes('ვატი') ||
        col.includes('watt') ||
        col.includes('w') ||
        (col.includes('power') && !col.includes('kw')) ||
        (col.includes('სიმძლავრ') && !col.includes('კვტ') && !col.includes('kw'))
      ) {
        colIndex.powerW = idx;
        matchedKeywords++;
      } else if (col.includes('kw') || col.includes('კვტ')) {
        colIndex.powerKw = idx;
        matchedKeywords++;
      } else if (col.includes('volt') || col.includes('ძაბვ') || col === 'v') {
        colIndex.voltage = idx;
        matchedKeywords++;
      } else if (col.includes('cos') || col.includes('phi') || col.includes('pf')) {
        colIndex.cosPhi = idx;
        matchedKeywords++;
      } else if (col.includes('current') || col.includes('დენი') || col.includes('amp') || col === 'a') {
        colIndex.current = idx;
        matchedKeywords++;
      } else if (col.includes('breaker') || col.includes('ავტომატ') || col.includes('mcb') || col.includes('fuse') || col.includes('rcd')) {
        colIndex.breaker = idx;
        matchedKeywords++;
      } else if (col.includes('gauge') || col.includes('კვეთ') || col.includes('mm2') || col.includes('მმ')) {
        colIndex.wireGauge = idx;
        matchedKeywords++;
      } else if (col.includes('cable') || col.includes('მარკ') || col.includes('wiretype')) {
        colIndex.cableType = idx;
        matchedKeywords++;
      } else if (col.includes('demand') || col.includes('kc') || col.includes('ერთდრ') || col.includes('factor') || col.includes('კოეფ')) {
        colIndex.demandFactor = idx;
        matchedKeywords++;
      } else if (col.includes('status') || col.includes('სტატუს')) {
        colIndex.status = idx;
        matchedKeywords++;
      } else if (col.includes('note') || col.includes('შენიშვნ') || col.includes('comment')) {
        colIndex.notes = idx;
        matchedKeywords++;
      }
    });

    if (matchedKeywords >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const parsedLoads: CircuitLoad[] = [];

  for (let i = startRow; i < rawLines.length; i++) {
    const tokens = parseCsvLine(rawLines[i], delimiter);
    if (tokens.length < 2) continue;

    // Skip summary / banner lines
    const lineJoined = tokens.join(' ').toLowerCase();
    if (
      lineJoined.includes('summary') ||
      lineJoined.includes('ჯამურ') ||
      lineJoined.includes('totals') ||
      lineJoined.includes('iec 60364')
    ) {
      continue;
    }

    let code = '';
    let name = '';
    let room = 'მისაღები';
    let categoryStr = 'GENERAL';
    let powerW = 0;
    let voltageV = 230;
    let cosPhi = 0.95;
    let breakerStr = 'C16';
    let breakerRatingA = 16;
    let wireGaugeMm2 = 2.5;
    let cableType = 'NYM 3x2.5';
    let demandFactor = 1.0;
    let isActive = true;
    let notes = '';

    if (headerRowIndex >= 0) {
      if (colIndex.code >= 0 && tokens[colIndex.code]) code = tokens[colIndex.code];
      if (colIndex.name >= 0 && tokens[colIndex.name]) name = tokens[colIndex.name];
      if (colIndex.room >= 0 && tokens[colIndex.room]) room = tokens[colIndex.room];
      if (colIndex.category >= 0 && tokens[colIndex.category]) categoryStr = tokens[colIndex.category];

      if (colIndex.powerW >= 0 && tokens[colIndex.powerW]) {
        const val = parseFloat(tokens[colIndex.powerW].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) powerW = val;
      } else if (colIndex.powerKw >= 0 && tokens[colIndex.powerKw]) {
        const val = parseFloat(tokens[colIndex.powerKw].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) powerW = Math.round(val * 1000);
      }

      if (colIndex.voltage >= 0 && tokens[colIndex.voltage]) {
        const val = parseFloat(tokens[colIndex.voltage].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && val > 50) voltageV = val;
      }
      if (colIndex.cosPhi >= 0 && tokens[colIndex.cosPhi]) {
        const val = parseFloat(tokens[colIndex.cosPhi].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && val > 0 && val <= 1) cosPhi = val;
      }
      if (colIndex.breaker >= 0 && tokens[colIndex.breaker]) breakerStr = tokens[colIndex.breaker];
      if (colIndex.wireGauge >= 0 && tokens[colIndex.wireGauge]) {
        const val = parseFloat(tokens[colIndex.wireGauge].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && val > 0) wireGaugeMm2 = val;
      }
      if (colIndex.cableType >= 0 && tokens[colIndex.cableType]) cableType = tokens[colIndex.cableType];
      if (colIndex.demandFactor >= 0 && tokens[colIndex.demandFactor]) {
        let val = parseFloat(tokens[colIndex.demandFactor].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) {
          if (val > 1 && val <= 100) val = val / 100;
          if (val > 0 && val <= 1.5) demandFactor = val;
        }
      }
      if (colIndex.status >= 0 && tokens[colIndex.status]) {
        const s = tokens[colIndex.status].toLowerCase();
        isActive = !s.includes('off') && !s.includes('გათიშ') && !s.includes('false') && s !== '0';
      }
      if (colIndex.notes >= 0 && tokens[colIndex.notes]) notes = tokens[colIndex.notes];
    } else {
      // Positional parsing fallback
      if (tokens.length >= 3) {
        code = tokens[1] || `Q${parsedLoads.length + 1}`;
        name = tokens[2] || `Consumer ${parsedLoads.length + 1}`;
        if (tokens[3]) room = tokens[3];
        if (tokens[4]) categoryStr = tokens[4];
        if (tokens[5]) {
          const val = parseFloat(tokens[5].replace(/[^0-9.-]/g, ''));
          if (!isNaN(val)) powerW = val;
        }
        if (tokens[7]) {
          const val = parseFloat(tokens[7].replace(/[^0-9.-]/g, ''));
          if (!isNaN(val) && val > 50) voltageV = val;
        }
        if (tokens[8]) {
          const val = parseFloat(tokens[8].replace(/[^0-9.-]/g, ''));
          if (!isNaN(val)) cosPhi = val;
        }
        if (tokens[10]) breakerStr = tokens[10];
        if (tokens[11]) {
          const val = parseFloat(tokens[11].replace(/[^0-9.-]/g, ''));
          if (!isNaN(val)) wireGaugeMm2 = val;
        }
        if (tokens[12]) cableType = tokens[12];
        if (tokens[13]) {
          const val = parseFloat(tokens[13].replace(/[^0-9.-]/g, ''));
          if (!isNaN(val)) demandFactor = val;
        }
        if (tokens[15]) {
          isActive = !tokens[15].toLowerCase().includes('off');
        }
        if (tokens[16]) notes = tokens[16];
      }
    }

    // Default clean names and codes
    if (!name && code) name = `Circuit ${code}`;
    if (!name && !code) name = `Load ${parsedLoads.length + 1}`;
    if (!code) code = `Q${parsedLoads.length + 1}`;

    const cleanBreakerStr = (breakerStr || '').replace(/^"|"$/g, '').trim();
    const breakerNum = parseInt(cleanBreakerStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(breakerNum) && breakerNum > 0) {
      breakerRatingA = breakerNum;
    } else {
      breakerRatingA = powerW > 3500 ? 25 : powerW > 2000 ? 20 : powerW > 1500 ? 16 : 10;
    }

    // Category mapping
    let normalizedCategory: CircuitLoad['category'] = 'GENERAL';
    const catLower = categoryStr.toLowerCase();
    if (catLower.includes('light') || catLower.includes('განათებ')) normalizedCategory = 'LIGHTING';
    else if (catLower.includes('socket') || catLower.includes('როზეტ') || catLower.includes('outlet')) normalizedCategory = 'SOCKETS';
    else if (catLower.includes('ac') || catLower.includes('climat') || catLower.includes('კონდიცი') || catLower.includes('hvac')) normalizedCategory = 'AC_CLIMATE';
    else if (catLower.includes('boiler') || catLower.includes('heat') || catLower.includes('ბოილერ') || catLower.includes('გათბობ')) normalizedCategory = 'HEATING_BOILER';
    else if (catLower.includes('kitchen') || catLower.includes('სამზარეულ') || catLower.includes('cook') || catLower.includes('oven')) normalizedCategory = 'KITCHEN';
    else if (catLower.includes('wet') || catLower.includes('bath') || catLower.includes('აბაზან') || catLower.includes('wash')) normalizedCategory = 'WET_ROOM';
    else if (catLower.includes('outdoor') || catLower.includes('გარე') || catLower.includes('yard')) normalizedCategory = 'OUTDOOR';

    parsedLoads.push({
      id: `load-imported-${Date.now()}-${parsedLoads.length + 1}`,
      circuitCode: code.replace(/^"|"$/g, '').trim(),
      name: name.replace(/^"|"$/g, '').trim(),
      room: (room || 'მისაღები').replace(/^"|"$/g, '').trim(),
      category: normalizedCategory,
      powerW: powerW || 1000,
      voltageV: voltageV || 230,
      cosPhi: cosPhi || 0.95,
      breakerId: cleanBreakerStr.includes('mcb') ? cleanBreakerStr : 'mcb-sockets',
      breakerRatingA: breakerRatingA,
      wireGaugeMm2: wireGaugeMm2 || 2.5,
      cableType: (cableType || 'NYM 3x2.5').replace(/^"|"$/g, '').trim(),
      demandFactor: demandFactor || 1.0,
      isActive: isActive,
      notes: notes.replace(/^"|"$/g, '').trim(),
    });
  }

  if (parsedLoads.length === 0) {
    return { loads: [], error: 'No valid circuit rows parsed' };
  }

  return { loads: parsedLoads };
}

