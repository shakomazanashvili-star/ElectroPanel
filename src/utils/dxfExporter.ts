import { FloorPlanData } from '../types';

/**
 * Generates an ASCII AutoCAD DXF (Release 12 / 2000 compliant) file content.
 * Can be opened natively in AutoCAD, ArchiCAD, SketchUp (Import CAD), Revit, LibreCAD, QCad.
 */
export function generateAutoCadDXF(plan: FloorPlanData): string {
  const scale = plan.scalePxPerMeter || 50; // px per meter
  // Convert px to meters for true 1:1 metric CAD drawing in meters or millimeters (standard mm: 1m = 1000mm)
  const pxToMm = (px: number) => Math.round((px / scale) * 1000);

  const lines: string[] = [];

  // DXF Header
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1009'); // AutoCAD R12 standard (broadest universal support)
  lines.push('9', '$INSUNITS', '70', '4'); // 4 = Millimeters
  lines.push('9', '$MEASUREMENT', '70', '1'); // 1 = Metric
  lines.push('0', 'ENDSEC');

  // DXF Tables (Layers & Line Types)
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '8');

  const layers = [
    { name: '0', color: 7 },
    { name: 'A-WALL-OUTER', color: 1 }, // Red
    { name: 'A-WALL-INNER', color: 2 }, // Yellow
    { name: 'A-DOOR', color: 4 }, // Cyan
    { name: 'A-WINDOW', color: 5 }, // Blue
    { name: 'A-ROOM-AREA', color: 8 }, // Gray
    { name: 'E-PANEL-BOARD', color: 1 }, // Red
    { name: 'E-SWITCHES', color: 3 }, // Green
    { name: 'E-SOCKETS', color: 6 }, // Magenta
    { name: 'E-LIGHTING', color: 2 }, // Yellow
    { name: 'E-APPLIANCES', color: 4 }, // Cyan
    { name: 'E-CONDUITS', color: 140 }, // Purple/Blue
    { name: 'E-ANNOTATIONS', color: 7 }, // White
  ];

  layers.forEach((l) => {
    lines.push('0', 'LAYER', '2', l.name, '70', '0', '62', String(l.color), '6', 'CONTINUOUS');
  });

  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // DXF Blocks (Symbols)
  lines.push('0', 'SECTION', '2', 'BLOCKS');
  lines.push('0', 'ENDSEC');

  // DXF Entities
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // 1. Export Walls
  (plan.walls || []).forEach((wall) => {
    const x1 = pxToMm(wall.startX);
    const y1 = -pxToMm(wall.startY); // DXF Y is upwards
    const x2 = pxToMm(wall.endX);
    const y2 = -pxToMm(wall.endY);

    const layer = wall.isOuter ? 'A-WALL-OUTER' : 'A-WALL-INNER';

    // Centerline / Wall vector
    lines.push('0', 'LINE');
    lines.push('8', layer);
    lines.push('10', String(x1), '20', String(y1), '30', '0');
    lines.push('11', String(x2), '21', String(y2), '31', '0');

    // Wall double line with thickness
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const halfThick = ((wall.thicknessCm || 20) * 10) / 2; // in mm
      const nx = (-dy / len) * halfThick;
      const ny = (dx / len) * halfThick;

      // Left boundary
      lines.push('0', 'LINE');
      lines.push('8', layer);
      lines.push('10', String(Math.round(x1 + nx)), '20', String(Math.round(y1 + ny)), '30', '0');
      lines.push('11', String(Math.round(x2 + nx)), '21', String(Math.round(y2 + ny)), '31', '0');

      // Right boundary
      lines.push('0', 'LINE');
      lines.push('8', layer);
      lines.push('10', String(Math.round(x1 - nx)), '20', String(Math.round(y1 - ny)), '30', '0');
      lines.push('11', String(Math.round(x2 - nx)), '21', String(Math.round(y2 - ny)), '31', '0');
    }
  });

  // 2. Export Rooms as polylines & text annotations
  (plan.rooms || []).forEach((room) => {
    const rx1 = pxToMm(room.x);
    const ry1 = -pxToMm(room.y);
    const rx2 = pxToMm(room.x + room.width);
    const ry2 = -pxToMm(room.y + room.height);

    // Bounding Box outline
    const pts = [
      [rx1, ry1],
      [rx2, ry1],
      [rx2, ry2],
      [rx1, ry2],
      [rx1, ry1],
    ];

    for (let i = 0; i < 4; i++) {
      lines.push('0', 'LINE');
      lines.push('8', 'A-ROOM-AREA');
      lines.push('10', String(pts[i][0]), '20', String(pts[i][1]), '30', '0');
      lines.push('11', String(pts[i + 1][0]), '21', String(pts[i + 1][1]), '31', '0');
    }

    // Room Label Text
    const cx = (rx1 + rx2) / 2;
    const cy = (ry1 + ry2) / 2;
    lines.push('0', 'TEXT');
    lines.push('8', 'A-ROOM-AREA');
    lines.push('10', String(cx), '20', String(cy), '30', '0');
    lines.push('40', '180'); // text height 180mm
    lines.push('1', `${room.name} (${room.areaM2} m2)`);
  });

  // 3. Export Doors
  (plan.doors || []).forEach((door) => {
    const dx = pxToMm(door.x);
    const dy = -pxToMm(door.y);
    const dWidthMm = (door.widthCm || 90) * 10;

    lines.push('0', 'CIRCLE');
    lines.push('8', 'A-DOOR');
    lines.push('10', String(dx), '20', String(dy), '30', '0');
    lines.push('40', String(dWidthMm / 2));

    lines.push('0', 'TEXT');
    lines.push('8', 'A-DOOR');
    lines.push('10', String(dx), '20', String(dy - 100), '30', '0');
    lines.push('40', '120');
    lines.push('1', `DOOR ${door.widthCm}cm`);
  });

  // 4. Export Windows
  (plan.windows || []).forEach((win) => {
    const wx = pxToMm(win.x);
    const wy = -pxToMm(win.y);
    const wWidthMm = (win.widthCm || 120) * 10;

    lines.push('0', 'LINE');
    lines.push('8', 'A-WINDOW');
    lines.push('10', String(wx - wWidthMm / 2), '20', String(wy), '30', '0');
    lines.push('11', String(wx + wWidthMm / 2), '21', String(wy), '31', '0');

    lines.push('0', 'TEXT');
    lines.push('8', 'A-WINDOW');
    lines.push('10', String(wx), '20', String(wy + 100), '30', '0');
    lines.push('40', '100');
    lines.push('1', `WIN ${win.widthCm}cm`);
  });

  // 5. Export Electrical Devices
  (plan.devices || []).forEach((dev) => {
    const x = pxToMm(dev.x);
    const y = -pxToMm(dev.y);
    const z = (dev.heightCm || 90) * 10; // 3D height in mm

    let layer = 'E-SOCKETS';
    if (dev.type.includes('SWITCH')) layer = 'E-SWITCHES';
    else if (dev.type.includes('LIGHT')) layer = 'E-LIGHTING';
    else if (dev.type === 'PANEL_BOARD') layer = 'E-PANEL-BOARD';
    else if (['COOKTOP', 'AC_UNIT', 'WATER_HEATER'].includes(dev.type)) layer = 'E-APPLIANCES';

    // 2D/3D Circle marker for the device point
    lines.push('0', 'CIRCLE');
    lines.push('8', layer);
    lines.push('10', String(x), '20', String(y), '30', String(z));
    lines.push('40', '100'); // Radius 100mm

    // Inner symbol marker
    lines.push('0', 'POINT');
    lines.push('8', layer);
    lines.push('10', String(x), '20', String(y), '30', String(z));

    // Device Label & Height Tag
    lines.push('0', 'TEXT');
    lines.push('8', 'E-ANNOTATIONS');
    lines.push('10', String(x + 120), '20', String(y + 60), '30', String(z));
    lines.push('40', '100'); // 100mm font size
    lines.push('1', `${dev.label} [${dev.circuitCode}] h=${dev.heightCm}cm`);
  });

  // 6. Export Conduits & Cables
  (plan.wireRoutes || []).forEach((route) => {
    const fromDev = plan.devices.find((d) => d.id === route.fromDeviceId);
    const toDev = plan.devices.find((d) => d.id === route.toDeviceId);
    if (!fromDev || !toDev) return;

    const z1 = (fromDev.heightCm || 90) * 10;
    const z2 = (toDev.heightCm || 90) * 10;

    const pts = (route.waypoints && route.waypoints.length >= 2)
      ? route.waypoints.map((p) => ({ x: pxToMm(p.x), y: -pxToMm(p.y) }))
      : [
          { x: pxToMm(fromDev.x), y: -pxToMm(fromDev.y) },
          { x: pxToMm(toDev.x), y: -pxToMm(toDev.y) },
        ];

    // Export each segment as LINE entity in DXF
    for (let i = 0; i < pts.length - 1; i++) {
      const segZ1 = i === 0 ? z1 : 2700; // Ceiling level for intermediate turns
      const segZ2 = i === pts.length - 2 ? z2 : 2700;

      lines.push('0', 'LINE');
      lines.push('8', 'E-CONDUITS');
      lines.push('10', String(Math.round(pts[i].x)), '20', String(Math.round(pts[i].y)), '30', String(segZ1));
      lines.push('11', String(Math.round(pts[i + 1].x)), '21', String(Math.round(pts[i + 1].y)), '31', String(segZ2));
    }

    // Midpoint annotation
    const midIdx = Math.floor(pts.length / 2);
    const mx = pts[midIdx]?.x || (pts[0].x + pts[pts.length - 1].x) / 2;
    const my = pts[midIdx]?.y || (pts[0].y + pts[pts.length - 1].y) / 2;

    lines.push('0', 'TEXT');
    lines.push('8', 'E-ANNOTATIONS');
    lines.push('10', String(Math.round(mx)), '20', String(Math.round(my)), '30', '2700');
    lines.push('40', '80');
    lines.push('1', `${route.circuitCode}: ${route.cableSpec}`);
  });

  // Project Info Cadastral Stamp in DXF
  if (plan.cadastralCode) {
    lines.push('0', 'TEXT');
    lines.push('8', 'E-ANNOTATIONS');
    lines.push('10', '0', '20', '500', '30', '0');
    lines.push('40', '250');
    lines.push('1', `CADASTRAL CODE: ${plan.cadastralCode} - ${plan.name}`);
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n');
}
