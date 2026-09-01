import { FloorPlanData } from '../types';

/**
 * Generates a 3D Wavefront OBJ file content.
 * Compatible directly with SketchUp (File -> Import -> .obj), ArchiCAD, Blender, 3ds Max, Revit.
 */
export function generateSketchUpOBJ(plan: FloorPlanData): string {
  const scale = plan.scalePxPerMeter || 50; // px per meter
  // In 3D: X is right/left (m), Y is height up (m), Z is depth forward/back (m)
  const pxToM = (px: number) => px / scale;

  const vertices: string[] = [];
  const faces: string[] = [];
  let vIndex = 1;

  const addBox = (
    name: string,
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number
  ) => {
    faces.push(`o ${name}`);
    faces.push(`g ${name}`);

    // 8 vertices of cuboid
    const vBase = vIndex;
    vertices.push(`v ${minX.toFixed(3)} ${minY.toFixed(3)} ${minZ.toFixed(3)}`); // 1: min min min
    vertices.push(`v ${maxX.toFixed(3)} ${minY.toFixed(3)} ${minZ.toFixed(3)}`); // 2: max min min
    vertices.push(`v ${maxX.toFixed(3)} ${maxY.toFixed(3)} ${minZ.toFixed(3)}`); // 3: max max min
    vertices.push(`v ${minX.toFixed(3)} ${maxY.toFixed(3)} ${minZ.toFixed(3)}`); // 4: min max min

    vertices.push(`v ${minX.toFixed(3)} ${minY.toFixed(3)} ${maxZ.toFixed(3)}`); // 5: min min max
    vertices.push(`v ${maxX.toFixed(3)} ${minY.toFixed(3)} ${maxZ.toFixed(3)}`); // 6: max min max
    vertices.push(`v ${maxX.toFixed(3)} ${maxY.toFixed(3)} ${maxZ.toFixed(3)}`); // 7: max max max
    vertices.push(`v ${minX.toFixed(3)} ${maxY.toFixed(3)} ${maxZ.toFixed(3)}`); // 8: min max max
    vIndex += 8;

    // 6 quad faces (CCW)
    faces.push(`f ${vBase + 0} ${vBase + 3} ${vBase + 2} ${vBase + 1}`); // Front (-Z)
    faces.push(`f ${vBase + 4} ${vBase + 5} ${vBase + 6} ${vBase + 7}`); // Back (+Z)
    faces.push(`f ${vBase + 0} ${vBase + 1} ${vBase + 5} ${vBase + 4}`); // Bottom (-Y)
    faces.push(`f ${vBase + 2} ${vBase + 3} ${vBase + 7} ${vBase + 6}`); // Top (+Y)
    faces.push(`f ${vBase + 0} ${vBase + 4} ${vBase + 7} ${vBase + 3}`); // Left (-X)
    faces.push(`f ${vBase + 1} ${vBase + 2} ${vBase + 6} ${vBase + 5}`); // Right (+X)
  };

  // Header
  const output: string[] = [
    `# Electrical Floor Plan 3D BIM Model`,
    `# Project: ${plan.name} ${plan.cadastralCode ? `[${plan.cadastralCode}]` : ''}`,
    `# Generated for SketchUp / ArchiCAD / Blender`,
    `# Units: Meters`,
    ``,
  ];

  // 1. Export Room Floors
  (plan.rooms || []).forEach((room, i) => {
    const rx1 = pxToM(room.x);
    const rz1 = pxToM(room.y);
    const rx2 = pxToM(room.x + room.width);
    const rz2 = pxToM(room.y + room.height);

    // Floor slab of 5cm thickness
    addBox(`Room_Floor_${i + 1}_${room.name.replace(/\s+/g, '_')}`, rx1, -0.05, rz1, rx2, 0.0, rz2);
  });

  // 2. Export 3D Extruded Walls
  (plan.walls || []).forEach((wall, i) => {
    const x1 = pxToM(wall.startX);
    const z1 = pxToM(wall.startY);
    const x2 = pxToM(wall.endX);
    const z2 = pxToM(wall.endY);

    const wallHeightM = wall.heightM || 2.7;
    const halfThick = (wall.thicknessCm || 20) / 200; // in meters

    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);

    if (len > 0.01) {
      const nx = (-dz / len) * halfThick;
      const nz = (dx / len) * halfThick;

      const vBase = vIndex;
      faces.push(`o Wall_${i + 1}_${wall.isOuter ? 'Outer' : 'Inner'}`);
      faces.push(`g Wall_${i + 1}`);

      // 4 Bottom vertices
      vertices.push(`v ${(x1 + nx).toFixed(3)} 0.000 ${(z1 + nz).toFixed(3)}`); // 1
      vertices.push(`v ${(x2 + nx).toFixed(3)} 0.000 ${(z2 + nz).toFixed(3)}`); // 2
      vertices.push(`v ${(x2 - nx).toFixed(3)} 0.000 ${(z2 - nz).toFixed(3)}`); // 3
      vertices.push(`v ${(x1 - nx).toFixed(3)} 0.000 ${(z1 - nz).toFixed(3)}`); // 4

      // 4 Top vertices
      vertices.push(`v ${(x1 + nx).toFixed(3)} ${wallHeightM.toFixed(3)} ${(z1 + nz).toFixed(3)}`); // 5
      vertices.push(`v ${(x2 + nx).toFixed(3)} ${wallHeightM.toFixed(3)} ${(z2 + nz).toFixed(3)}`); // 6
      vertices.push(`v ${(x2 - nx).toFixed(3)} ${wallHeightM.toFixed(3)} ${(z2 - nz).toFixed(3)}`); // 7
      vertices.push(`v ${(x1 - nx).toFixed(3)} ${wallHeightM.toFixed(3)} ${(z1 - nz).toFixed(3)}`); // 8
      vIndex += 8;

      // 6 quad faces
      faces.push(`f ${vBase + 0} ${vBase + 1} ${vBase + 2} ${vBase + 3}`); // bottom
      faces.push(`f ${vBase + 4} ${vBase + 7} ${vBase + 6} ${vBase + 5}`); // top
      faces.push(`f ${vBase + 0} ${vBase + 4} ${vBase + 5} ${vBase + 1}`); // side 1
      faces.push(`f ${vBase + 1} ${vBase + 5} ${vBase + 6} ${vBase + 2}`); // end 1
      faces.push(`f ${vBase + 2} ${vBase + 6} ${vBase + 7} ${vBase + 3}`); // side 2
      faces.push(`f ${vBase + 3} ${vBase + 7} ${vBase + 4} ${vBase + 0}`); // end 2
    }
  });

  // 3. Export 3D Electrical Device Boxes (Switches, Sockets, Panels)
  (plan.devices || []).forEach((dev, i) => {
    const x = pxToM(dev.x);
    const z = pxToM(dev.y);
    const y = (dev.heightCm || 90) / 100; // true mounting height in meters

    const isPanel = dev.type === 'PANEL_BOARD';
    const isLight = dev.type.includes('LIGHT');
    const isCook = dev.type === 'COOKTOP';

    const boxW = isPanel ? 0.35 : isLight ? 0.25 : isCook ? 0.6 : 0.08;
    const boxH = isPanel ? 0.45 : isLight ? 0.06 : isCook ? 0.05 : 0.08;
    const boxD = isPanel ? 0.12 : isLight ? 0.25 : isCook ? 0.5 : 0.05;

    addBox(
      `Device_${dev.label}_${dev.type}`,
      x - boxW / 2,
      y,
      z - boxD / 2,
      x + boxW / 2,
      y + boxH,
      z + boxD / 2
    );
  });

  return [...output, ...vertices, ``, ...faces].join('\n');
}
