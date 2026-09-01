import { jsPDF } from 'jspdf';
import { FloorPlanData } from '../types';
import { DEVICE_DEFINITIONS } from '../data/floorPlanPresets';

/**
 * Generates an Architectural & Electrical Engineering Blueprint PDF sheet.
 */
export async function exportFloorPlanToPDF(
  plan: FloorPlanData,
  svgElement: SVGSVGElement | null,
  lang: 'ka' | 'en'
): Promise<void> {
  const isKa = lang === 'ka';
  // A3 Landscape for high detail blueprint (420mm x 297mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 420
  const pageHeight = doc.internal.pageSize.getHeight(); // 297

  // Background blueprint border & sheet outline
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border & Grid margins (5mm margin standard)
  doc.setDrawColor(56, 189, 248); // sky-400
  doc.setLineWidth(0.8);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14);

  // Top Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(7, 7, pageWidth - 14, 18, 'F');

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    isKa
      ? `ელექტრო გაყვანილობის არქიტექტურული ნახაზი - ${plan.name}`
      : `ELECTRICAL INSTALLATION ARCHITECTURAL BLUEPRINT - ${plan.name}`,
    12,
    18
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const cadastralLabel = plan.cadastralCode ? (isKa ? `საკადასტრო კოდი: ${plan.cadastralCode} | ` : `Cadastral Code: ${plan.cadastralCode} | `) : '';
  doc.text(
    `${cadastralLabel}${isKa ? 'მასშტაბი: 1:50 | სტანდარტი: IEC 60364 / GOST 21.614' : 'Scale: 1:50 | Standard: IEC 60364'}`,
    12,
    22
  );

  // Draw Title Block (Stamp / შტამპი) in bottom-right corner
  const stampW = 120;
  const stampH = 45;
  const stampX = pageWidth - 7 - stampW;
  const stampY = pageHeight - 7 - stampH;

  doc.setFillColor(15, 23, 42);
  doc.rect(stampX, stampY, stampW, stampH, 'FD');
  doc.setDrawColor(56, 189, 248);
  doc.rect(stampX, stampY, stampW, stampH);

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isKa ? 'საპროექტო ორგანიზაცია / შემსრულებელი' : 'DESIGN & ENGINEERING SPECIFICATION', stampX + 4, stampY + 6);

  doc.setDrawColor(51, 65, 85);
  doc.line(stampX, stampY + 8, stampX + stampW, stampY + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);

  const stampRows = [
    [isKa ? 'ობიექტი:' : 'Project:', plan.name],
    [isKa ? 'საკადასტრო №:' : 'Cadastral ID:', plan.cadastralCode || '-'],
    [isKa ? 'დამპროექტებელი:' : 'Engineer:', plan.designerName || 'Electrical Eng. Studio'],
    [isKa ? 'თარიღი:' : 'Date:', new Date().toLocaleDateString()],
    [isKa ? 'ნახაზის ფურცელი:' : 'Sheet:', 'EL-01 / 01'],
  ];

  stampRows.forEach(([lbl, val], idx) => {
    doc.text(lbl, stampX + 4, stampY + 14 + idx * 6);
    doc.setFont('helvetica', 'bold');
    doc.text(val, stampX + 42, stampY + 14 + idx * 6);
    doc.setFont('helvetica', 'normal');
  });

  // Render SVG Blueprint Image to Canvas
  if (svgElement) {
    try {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.src = blobURL;

      await new Promise((resolve) => {
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1600;
          canvas.height = 1000;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            // Draw into PDF main workspace
            doc.addImage(imgData, 'JPEG', 10, 28, 275, 175);
          }
          URL.revokeObjectURL(blobURL);
          resolve(true);
        };
        image.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('Could not rasterize SVG for PDF directly', e);
    }
  }

  // Right Side Tables: 1. Electrical Legend (პირობითი აღნიშვნები)
  const legendX = 290;
  const legendY = 28;
  const legendW = 122;

  doc.setFillColor(30, 41, 59);
  doc.rect(legendX, legendY, legendW, 8, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isKa ? 'ელექტრო წერტილების სპეციფიკაცია & პირობითი ნიშნები' : 'ELECTRICAL SYMBOLS & LEGEND', legendX + 4, legendY + 5.5);

  // Group devices present in plan
  const activeDeviceTypes = Array.from(new Set(plan.devices.map((d) => d.type)));
  let currentTableY = legendY + 12;

  activeDeviceTypes.slice(0, 10).forEach((type) => {
    const def = DEVICE_DEFINITIONS[type];
    if (!def) return;
    const count = plan.devices.filter((d) => d.type === type).length;

    doc.setFillColor(15, 23, 42);
    doc.rect(legendX, currentTableY - 3, legendW, 5.5, 'F');
    doc.setDrawColor(30, 41, 59);
    doc.rect(legendX, currentTableY - 3, legendW, 5.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(248, 250, 252);
    doc.text(isKa ? def.labelKa : def.labelEn, legendX + 4, currentTableY + 1);

    doc.setTextColor(251, 191, 36);
    doc.text(`h=${def.defaultHeightCm}cm`, legendX + 80, currentTableY + 1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(56, 189, 248);
    doc.text(`${count} ${isKa ? 'ც' : 'pcs'}`, legendX + 105, currentTableY + 1);

    currentTableY += 6;
  });

  // 2. Cables & Conduits Table
  currentTableY += 4;
  doc.setFillColor(30, 41, 59);
  doc.rect(legendX, currentTableY, legendW, 7, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isKa ? 'საკაბელო ტრასების მეტრაჟი' : 'CABLE SCHEDULE & LENGTHS', legendX + 4, currentTableY + 5);

  currentTableY += 9;

  // Calculate cable lengths
  const cablesSummary: Record<string, number> = {};
  plan.wireRoutes.forEach((r) => {
    const spec = r.cableSpec || 'NYM 3x1.5';
    cablesSummary[spec] = (cablesSummary[spec] || 0) + 12.5; // average segment length in meters with height drops
  });

  Object.entries(cablesSummary).forEach(([spec, meters]) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(legendX, currentTableY - 3, legendW, 5.5, 'F');
    doc.setDrawColor(30, 41, 59);
    doc.rect(legendX, currentTableY - 3, legendW, 5.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(spec, legendX + 4, currentTableY + 1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text(`~ ${meters.toFixed(1)} m`, legendX + 95, currentTableY + 1);

    currentTableY += 6;
  });

  // 3. Room Schedule at bottom
  const roomTableX = 10;
  const roomTableY = 210;
  const roomTableW = 275;

  doc.setFillColor(30, 41, 59);
  doc.rect(roomTableX, roomTableY, roomTableW, 7, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isKa ? 'ოთახების ექსპლიკაცია & ფართობები' : 'ROOM SCHEDULE & AREAS', roomTableX + 4, roomTableY + 5);

  let rX = roomTableX;
  let rY = roomTableY + 10;

  plan.rooms.forEach((room, idx) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(rX, rY, 65, 12, 'FD');
    doc.setDrawColor(51, 65, 85);
    doc.rect(rX, rY, 65, 12);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(248, 250, 252);
    doc.text(`${idx + 1}. ${room.name}`, rX + 3, rY + 5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(56, 189, 248);
    doc.text(
      `S = ${room.areaM2} m² | ${(room.width / plan.scalePxPerMeter).toFixed(1)}x${(
        room.height / plan.scalePxPerMeter
      ).toFixed(1)}m`,
      rX + 3,
      rY + 9.5
    );

    rX += 68;
    if (rX > roomTableX + roomTableW - 65) {
      rX = roomTableX;
      rY += 14;
    }
  });

  // Save PDF
  doc.save(`Electrical-Blueprint-${plan.name.replace(/\s+/g, '_')}-${Date.now()}.pdf`);
}
