import { jsPDF } from 'jspdf';
import { CircuitLoad, Language } from '../types';

export interface SchedulePdfExportOptions {
  projectName?: string;
  engineerName?: string;
  gridVoltage?: number;
}

/**
 * Generates a clean, technical PDF passport document for the Circuit & Load Schedule
 */
export function exportLoadsToPdf(
  loads: CircuitLoad[],
  lang: Language = 'ka',
  options: SchedulePdfExportOptions = {}
): void {
  const isKa = lang === 'ka';
  const projectName = options.projectName || (isKa ? 'საცხოვრებელი ბინის ელექტრო ფარი' : 'Electrical Distribution Board');
  const engineerName = options.engineerName || (isKa ? 'სერტიფიცირებული ინჟინერ-ელექტრიკოსი' : 'Certified Electrical Engineer');
  const dateStr = new Date().toLocaleDateString(isKa ? 'ka-GE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate totals
  const totalPowerW = loads.reduce((sum, l) => sum + (l.powerW || 0), 0);
  const totalPowerKw = totalPowerW / 1000;
  const totalDesignPowerKw = loads.reduce((sum, l) => sum + ((l.powerW || 0) * (l.demandFactor || 1)) / 1000, 0);
  const totalCurrentA = loads.reduce((sum, l) => {
    const v = l.voltageV || 230;
    const cos = l.cosPhi || 0.95;
    return sum + (l.powerW || 0) / (v * cos);
  }, 0);

  let recMainMcb = 'C25 (25A)';
  if (totalCurrentA > 63) recMainMcb = 'C80 (80A)';
  else if (totalCurrentA > 50) recMainMcb = 'C63 (63A)';
  else if (totalCurrentA > 40) recMainMcb = 'C50 (50A)';
  else if (totalCurrentA > 32) recMainMcb = 'C40 (40A)';
  else if (totalCurrentA > 25) recMainMcb = 'C32 (32A)';

  // Initialize jsPDF (Landscape A4: 297 x 210 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 12;
  let cursorY = 14;

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginX, cursorY, pageWidth - marginX * 2, 22, 'F');

  doc.setTextColor(245, 158, 11); // amber-500
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ElectroPanel - Circuit & Load Schedule (Technical Passport)', marginX + 6, cursorY + 8);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Project: ${projectName}   |   Date: ${dateStr}   |   Standard: IEC 60364 / IEC 61439-1`,
    marginX + 6,
    cursorY + 16
  );

  cursorY += 26;

  // 2. Summary KPI Metric Cards Row
  const cardWidth = (pageWidth - marginX * 2 - 12) / 4;
  const cardHeight = 16;

  const kpis = [
    { label: 'Installed Power', value: `${totalPowerKw.toFixed(2)} kW (${totalPowerW} W)` },
    { label: 'Design Power (with Kc)', value: `${totalDesignPowerKw.toFixed(2)} kW` },
    { label: 'Total Current Draw', value: `${totalCurrentA.toFixed(2)} A` },
    { label: 'Recommended Main MCB', value: recMainMcb },
  ];

  kpis.forEach((kpi, i) => {
    const cardX = marginX + i * (cardWidth + 4);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cardX, cursorY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, cardX + 3, cursorY + 5.5);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, cardX + 3, cursorY + 12);
  });

  cursorY += 20;

  // 3. Technical Table Header
  const colWidths = [10, 14, 60, 32, 24, 18, 14, 14, 18, 22, 16, 14, 17];
  const tableHeaders = [
    'No.',
    'Code',
    'Circuit / Appliance Name',
    'Room / Location',
    'Power (W)',
    'Power (kW)',
    'Volt',
    'cos phi',
    'Current (A)',
    'Breaker',
    'Cable mm²',
    'Kc',
    'Design kW',
  ];

  // Draw Table Header Bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(marginX, cursorY, pageWidth - marginX * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');

  let curX = marginX;
  tableHeaders.forEach((th, idx) => {
    doc.text(th, curX + 2, cursorY + 5.5);
    curX += colWidths[idx];
  });

  cursorY += 8;

  // 4. Data Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  loads.forEach((load, idx) => {
    if (cursorY > pageHeight - 25) {
      doc.addPage();
      cursorY = 15;
    }

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(marginX, cursorY, pageWidth - marginX * 2, 6.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, cursorY + 6.5, pageWidth - marginX, cursorY + 6.5);

    const powerW = load.powerW || 0;
    const powerKw = (powerW / 1000).toFixed(2);
    const volt = load.voltageV || 230;
    const cosPhi = load.cosPhi || 0.95;
    const currentA = (powerW / (volt * cosPhi)).toFixed(2);
    const demandFactor = load.demandFactor || 1.0;
    const calcPowerKw = ((powerW * demandFactor) / 1000).toFixed(2);

    const rowValues = [
      `${idx + 1}`,
      load.circuitCode || `Q${idx + 1}`,
      load.name || `Circuit ${idx + 1}`,
      load.room || 'Main',
      `${powerW} W`,
      `${powerKw}`,
      `${volt}V`,
      `${cosPhi}`,
      `${currentA} A`,
      load.breakerRatingA ? `C${load.breakerRatingA}` : (load.breakerId || 'C16'),
      `${load.wireGaugeMm2 || (powerW > 2500 ? 4.0 : powerW > 1500 ? 2.5 : 1.5)} mm²`,
      `${demandFactor}`,
      `${calcPowerKw} kW`,
    ];

    let rowX = marginX;
    doc.setTextColor(15, 23, 42);
    rowValues.forEach((val, cIdx) => {
      // Bold the name and current
      if (cIdx === 1 || cIdx === 2) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(val, rowX + 2, cursorY + 4.5);
      rowX += colWidths[cIdx];
    });

    cursorY += 6.5;
  });

  // 5. Bottom Sign-off Footer
  cursorY = Math.max(cursorY + 6, pageHeight - 20);
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Lead Inspector / Engineer: ${engineerName}`, marginX, cursorY + 6);
  doc.text(`Signature / Stamp: ______________________`, pageWidth - marginX - 70, cursorY + 6);
  doc.text(`Generated via ElectroPanel Workbench v2.5 (IEC Standard)`, marginX, cursorY + 12);

  // Save PDF
  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`ElectroPanel_Load_Schedule_${safeDate}.pdf`);
}
