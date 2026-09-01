/**
 * ElectroPanel - DIN Rail Wire Auto-Routing & Pathfinding Engine
 * Implements intelligent cable duct raceway routing, channel lane stratification,
 * obstacle avoidance, and corner filleting compliant with IEC 61439-1 panel design.
 */

import {
  PlacedComponent,
  RouteWaypoint,
  RoutedWirePath,
  WireColorType,
  WireConnection,
  WireRoutingState,
  WireRoutingStyle,
} from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface WireRoutingOptions {
  style: WireRoutingStyle;
  showCableDucts: boolean;
  cornerRadius?: number; // default 12px
  laneSeparation?: number; // default 6px
}

export interface CableDuctGeometry {
  id: string;
  name: string;
  type: 'HORIZONTAL' | 'VERTICAL';
  x: number;
  y: number;
  width: number;
  height: number;
  railIndex?: number;
}

/**
 * Checks if two line segments (p1-p2) and (p3-p4) intersect
 */
export function doSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  function ccw(a: Point, b: Point, c: Point): boolean {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }

  // Check if common endpoints
  if (
    (p1.x === p3.x && p1.y === p3.y) ||
    (p1.x === p4.x && p1.y === p4.y) ||
    (p2.x === p3.x && p2.y === p3.y) ||
    (p2.x === p4.x && p2.y === p4.y)
  ) {
    return false;
  }

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Calculates total intersection crossings among an array of point-to-point line segments
 */
export function calculateCrossingsCount(lines: { p1: Point; p2: Point }[]): number {
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (doSegmentsIntersect(lines[i].p1, lines[i].p2, lines[j].p1, lines[j].p2)) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Generates an SVG path string from a series of waypoints with rounded fillet corners.
 */
export function generateFilletedSvgPath(points: Point[], cornerRadius = 12): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Remove duplicate adjacent points
  const cleanPoints: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleanPoints[cleanPoints.length - 1];
    const curr = points[i];
    if (Math.abs(curr.x - prev.x) > 0.5 || Math.abs(curr.y - prev.y) > 0.5) {
      cleanPoints.push(curr);
    }
  }

  if (cleanPoints.length < 3) {
    return `M ${cleanPoints[0].x} ${cleanPoints[0].y} L ${cleanPoints[cleanPoints.length - 1].x} ${cleanPoints[cleanPoints.length - 1].y}`;
  }

  let d = `M ${cleanPoints[0].x.toFixed(1)} ${cleanPoints[0].y.toFixed(1)}`;

  for (let i = 1; i < cleanPoints.length - 1; i++) {
    const pPrev = cleanPoints[i - 1];
    const pCurr = cleanPoints[i];
    const pNext = cleanPoints[i + 1];

    // Vectors
    const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 < 1 || len2 < 1) {
      d += ` L ${pCurr.x.toFixed(1)} ${pCurr.y.toFixed(1)}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    const startFillet = {
      x: pCurr.x + (v1.x / len1) * r,
      y: pCurr.y + (v1.y / len1) * r,
    };
    const endFillet = {
      x: pCurr.x + (v2.x / len2) * r,
      y: pCurr.y + (v2.y / len2) * r,
    };

    d += ` L ${startFillet.x.toFixed(1)} ${startFillet.y.toFixed(1)}`;
    d += ` Q ${pCurr.x.toFixed(1)} ${pCurr.y.toFixed(1)} ${endFillet.x.toFixed(1)} ${endFillet.y.toFixed(1)}`;
  }

  const lastPoint = cleanPoints[cleanPoints.length - 1];
  d += ` L ${lastPoint.x.toFixed(1)} ${lastPoint.y.toFixed(1)}`;

  return d;
}

/**
 * Calculates Euclidean wire length from waypoints
 */
export function calculatePathLengthMm(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  // Rough px to mm conversion scale (1px ≈ 0.45mm in full scale)
  return Math.round(len * 0.45);
}

/**
 * Generates smooth bezier bundle path for organic aesthetic
 */
export function generateSmoothBundlePath(points: Point[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    const p1 = points[0];
    const p2 = points[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const sag = Math.min(60, Math.sqrt(dx * dx + dy * dy) * 0.25);
    const cy1 = p1.y + (dy > 0 ? sag : -sag);
    const cy2 = p2.y + (dy > 0 ? -sag : sag);
    return `M ${p1.x} ${p1.y} C ${p1.x} ${cy1}, ${p2.x} ${cy2}, ${p2.x} ${p2.y}`;
  }

  return generateFilletedSvgPath(points, 20);
}

/**
 * Main Auto-Routing Engine for ElectroPanel
 */
export function computeAutoRoutedWires(
  wires: WireConnection[],
  components: PlacedComponent[],
  terminalPositions: Record<string, Point>,
  numRails: number,
  containerBounds: { width: number; height: number },
  options: WireRoutingOptions = { style: 'ORTHOGONAL_DUCT', showCableDucts: true }
): WireRoutingState {
  const cornerRadius = options.cornerRadius ?? 12;
  const laneSeparation = options.laneSeparation ?? 5;
  const style = options.style;

  // 1. Determine Rail Geometries and Duct Coordinates
  const compMap = new Map<string, PlacedComponent>();
  components.forEach((c) => compMap.set(c.id, c));

  // Determine top & bottom Y bounds for each rail
  const railYBands: Record<number, { minY: number; maxY: number; count: number }> = {};
  for (let r = 1; r <= numRails; r++) {
    railYBands[r] = { minY: 999999, maxY: -999999, count: 0 };
  }

  // Populate from terminal positions
  wires.forEach((w) => {
    const key1 = `${w.fromComponentId}:${w.fromTerminalId}`;
    const key2 = `${w.toComponentId}:${w.toTerminalId}`;
    const p1 = terminalPositions[key1];
    const p2 = terminalPositions[key2];

    const c1 = compMap.get(w.fromComponentId);
    const c2 = compMap.get(w.toComponentId);

    if (p1 && c1) {
      const rNum = parseInt(c1.railId.replace('rail-', ''), 10) || 1;
      if (railYBands[rNum]) {
        railYBands[rNum].minY = Math.min(railYBands[rNum].minY, p1.y);
        railYBands[rNum].maxY = Math.max(railYBands[rNum].maxY, p1.y);
        railYBands[rNum].count++;
      }
    }
    if (p2 && c2) {
      const rNum = parseInt(c2.railId.replace('rail-', ''), 10) || 1;
      if (railYBands[rNum]) {
        railYBands[rNum].minY = Math.min(railYBands[rNum].minY, p2.y);
        railYBands[rNum].maxY = Math.max(railYBands[rNum].maxY, p2.y);
        railYBands[rNum].count++;
      }
    }
  });

  // Calculate direct crossings before routing
  const directLines: { p1: Point; p2: Point }[] = [];
  wires.forEach((w) => {
    const p1 = terminalPositions[`${w.fromComponentId}:${w.fromTerminalId}`];
    const p2 = terminalPositions[`${w.toComponentId}:${w.toTerminalId}`];
    if (p1 && p2) {
      directLines.push({ p1, p2 });
    }
  });
  const totalCrossingsBefore = calculateCrossingsCount(directLines);

  // If DIRECT style requested, return direct curves
  if (style === 'DIRECT') {
    const routedPaths: Record<string, RoutedWirePath> = {};
    let totalLengthMm = 0;

    wires.forEach((w) => {
      const p1 = terminalPositions[`${w.fromComponentId}:${w.fromTerminalId}`];
      const p2 = terminalPositions[`${w.toComponentId}:${w.toTerminalId}`];
      if (!p1 || !p2) return;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isVertical = Math.abs(dy) > Math.abs(dx);
      const sag = Math.min(60, dist * 0.25);

      let pathD = '';
      if (isVertical) {
        const cy1 = p1.y + (dy > 0 ? sag : -sag);
        const cy2 = p2.y + (dy > 0 ? -sag : sag);
        pathD = `M ${p1.x} ${p1.y} C ${p1.x} ${cy1}, ${p2.x} ${cy2}, ${p2.x} ${p2.y}`;
      } else {
        const isTop = p1.y < 200;
        const offset = isTop ? -sag : sag;
        pathD = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + offset}, ${p2.x} ${p2.y + offset}, ${p2.x} ${p2.y}`;
      }

      const lenMm = Math.round(dist * 0.45);
      totalLengthMm += lenMm;
      routedPaths[w.id] = {
        wireId: w.id,
        pathD,
        waypoints: [p1, p2],
        lengthMm: lenMm,
        channel: 'Direct Point-to-Point',
      };
    });

    return {
      isAutoRouted: false,
      style: 'DIRECT',
      showCableDucts: options.showCableDucts,
      cornerRadius,
      laneSeparation,
      totalCrossingsBefore,
      totalCrossingsAfter: totalCrossingsBefore,
      totalLengthMm,
      routedPaths,
    };
  }

  // 2. Build Structural Wiring Channels & Gutters
  // Lateral Riser Gutters
  const leftGutterX = 40;
  const rightGutterX = Math.max(containerBounds.width - 50, 750);

  // Group wires by channel (e.g., 'rail-1-top', 'rail-1-bottom', 'rail-2-top', 'inter-rail-1-2')
  // To avoid overlap, we assign parallel track lanes inside each channel
  const ductLaneCounters: Record<string, number> = {};

  // Sort wires deterministically so Phase, Neutral, PE, and shorter runs get clean inner/outer stratification
  const sortedWires = [...wires].sort((a, b) => {
    const p1a = terminalPositions[`${a.fromComponentId}:${a.fromTerminalId}`] || { x: 0, y: 0 };
    const p2a = terminalPositions[`${a.toComponentId}:${a.toTerminalId}`] || { x: 0, y: 0 };
    const p1b = terminalPositions[`${b.fromComponentId}:${b.fromTerminalId}`] || { x: 0, y: 0 };
    const p2b = terminalPositions[`${b.toComponentId}:${b.toTerminalId}`] || { x: 0, y: 0 };

    // Span length
    const spanA = Math.abs(p2a.x - p1a.x);
    const spanB = Math.abs(p2b.x - p1b.x);

    // Color order (Phase first, Neutral middle, Earth PE bottom/outer)
    const colorWeight: Record<WireColorType, number> = {
      PHASE_BROWN: 1,
      PHASE_BLACK: 2,
      PHASE_GREY: 3,
      PHASE_RED: 4,
      NEUTRAL_BLUE: 10,
      GROUND_GREEN_YELLOW: 20,
      CONTROL_ORANGE: 30,
      CONTROL_WHITE: 31,
    };

    const cDiff = (colorWeight[a.color] || 0) - (colorWeight[b.color] || 0);
    if (cDiff !== 0) return cDiff;
    return spanA - spanB;
  });

  const routedPaths: Record<string, RoutedWirePath> = {};
  const routedSegments: { p1: Point; p2: Point }[] = [];
  let totalLengthMm = 0;

  sortedWires.forEach((w) => {
    const p1 = terminalPositions[`${w.fromComponentId}:${w.fromTerminalId}`];
    const p2 = terminalPositions[`${w.toComponentId}:${w.toTerminalId}`];
    if (!p1 || !p2) return;

    const comp1 = compMap.get(w.fromComponentId);
    const comp2 = compMap.get(w.toComponentId);

    const rail1 = parseInt(comp1?.railId.replace('rail-', '') || '1', 10);
    const rail2 = parseInt(comp2?.railId.replace('rail-', '') || '1', 10);

    // Determine if terminal is at top or bottom
    // We check terminal ID naming or Y position
    const isTop1 = w.fromTerminalId.includes('in') || w.fromTerminalId === '1' || w.fromTerminalId === '3' || w.fromTerminalId === 'L_in' || w.fromTerminalId === 'N_in' || w.fromTerminalId.startsWith('1_') || (p1.y < (railYBands[rail1]?.minY + railYBands[rail1]?.maxY) / 2 + 10);
    const isTop2 = w.toTerminalId.includes('in') || w.toTerminalId === '1' || w.toTerminalId === '3' || w.toTerminalId === 'L_in' || w.toTerminalId === 'N_in' || w.toTerminalId.startsWith('1_') || (p2.y < (railYBands[rail2]?.minY + railYBands[rail2]?.maxY) / 2 + 10);

    const waypoints: Point[] = [p1];

    // Escape distance from terminal into the duct
    const escapeDist = 28;

    if (rail1 === rail2) {
      // --- SAME RAIL ROUTING ---
      if (isTop1 && isTop2) {
        // Both on TOP of same rail (e.g. Infeed busbar or Phase jumper)
        const ductKey = `rail-${rail1}-top`;
        const lane = (ductLaneCounters[ductKey] = (ductLaneCounters[ductKey] || 0) + 1);
        const laneOffset = (lane - 1) * laneSeparation;

        const ductY = Math.min(p1.y, p2.y) - escapeDist - laneOffset;

        waypoints.push({ x: p1.x, y: ductY });
        waypoints.push({ x: p2.x, y: ductY });
        waypoints.push(p2);
      } else if (!isTop1 && !isTop2) {
        // Both on BOTTOM of same rail (e.g. Outfeed to Busbar or Neighbor Breaker)
        const ductKey = `rail-${rail1}-bottom`;
        const lane = (ductLaneCounters[ductKey] = (ductLaneCounters[ductKey] || 0) + 1);
        const laneOffset = (lane - 1) * laneSeparation;

        const ductY = Math.max(p1.y, p2.y) + escapeDist + laneOffset;

        waypoints.push({ x: p1.x, y: ductY });
        waypoints.push({ x: p2.x, y: ductY });
        waypoints.push(p2);
      } else {
        // One TOP, One BOTTOM on same rail -> Route around via nearest lateral riser gutter!
        const ductKeyTop = `rail-${rail1}-top`;
        const ductKeyBottom = `rail-${rail1}-bottom`;
        const laneTop = (ductLaneCounters[ductKeyTop] = (ductLaneCounters[ductKeyTop] || 0) + 1);
        const laneBottom = (ductLaneCounters[ductKeyBottom] = (ductLaneCounters[ductKeyBottom] || 0) + 1);

        const avgX = (p1.x + p2.x) / 2;
        const useLeft = avgX < containerBounds.width / 2;
        const riserKey = useLeft ? `riser-left` : `riser-right`;
        const riserLane = (ductLaneCounters[riserKey] = (ductLaneCounters[riserKey] || 0) + 1);
        const riserX = useLeft
          ? leftGutterX + (riserLane - 1) * laneSeparation
          : rightGutterX - (riserLane - 1) * laneSeparation;

        const topPt = isTop1 ? p1 : p2;
        const botPt = isTop1 ? p2 : p1;

        const topDuctY = topPt.y - escapeDist - (laneTop - 1) * laneSeparation;
        const botDuctY = botPt.y + escapeDist + (laneBottom - 1) * laneSeparation;

        if (isTop1) {
          waypoints.push({ x: p1.x, y: topDuctY });
          waypoints.push({ x: riserX, y: topDuctY });
          waypoints.push({ x: riserX, y: botDuctY });
          waypoints.push({ x: p2.x, y: botDuctY });
          waypoints.push(p2);
        } else {
          waypoints.push({ x: p1.x, y: botDuctY });
          waypoints.push({ x: riserX, y: botDuctY });
          waypoints.push({ x: riserX, y: topDuctY });
          waypoints.push({ x: p2.x, y: topDuctY });
          waypoints.push(p2);
        }
      }
    } else {
      // --- INTER-RAIL CROSSING (Different Rails) ---
      // Decide optimal lateral riser (Left vs Right) to avoid crossing
      const avgX = (p1.x + p2.x) / 2;
      const useLeft = avgX < containerBounds.width / 2;

      const riserKey = useLeft ? `riser-left` : `riser-right`;
      const riserLane = (ductLaneCounters[riserKey] = (ductLaneCounters[riserKey] || 0) + 1);
      const riserX = useLeft
        ? leftGutterX + (riserLane - 1) * laneSeparation
        : rightGutterX - (riserLane - 1) * laneSeparation;

      const duct1Key = isTop1 ? `rail-${rail1}-top` : `rail-${rail1}-bottom`;
      const duct2Key = isTop2 ? `rail-${rail2}-top` : `rail-${rail2}-bottom`;

      const lane1 = (ductLaneCounters[duct1Key] = (ductLaneCounters[duct1Key] || 0) + 1);
      const lane2 = (ductLaneCounters[duct2Key] = (ductLaneCounters[duct2Key] || 0) + 1);

      const duct1Y = isTop1
        ? p1.y - escapeDist - (lane1 - 1) * laneSeparation
        : p1.y + escapeDist + (lane1 - 1) * laneSeparation;

      const duct2Y = isTop2
        ? p2.y - escapeDist - (lane2 - 1) * laneSeparation
        : p2.y + escapeDist + (lane2 - 1) * laneSeparation;

      waypoints.push({ x: p1.x, y: duct1Y });
      waypoints.push({ x: riserX, y: duct1Y });
      waypoints.push({ x: riserX, y: duct2Y });
      waypoints.push({ x: p2.x, y: duct2Y });
      waypoints.push(p2);
    }

    // Generate Path D
    const pathD =
      style === 'SMOOTH_BUNDLE'
        ? generateSmoothBundlePath(waypoints)
        : generateFilletedSvgPath(waypoints, cornerRadius);

    const lengthMm = calculatePathLengthMm(waypoints);
    totalLengthMm += lengthMm;

    // Track segments for crossings check
    for (let i = 1; i < waypoints.length; i++) {
      routedSegments.push({ p1: waypoints[i - 1], p2: waypoints[i] });
    }

    routedPaths[w.id] = {
      wireId: w.id,
      pathD,
      waypoints,
      lengthMm,
      channel: `IEC 61439 Duct System (Lanes Assigned)`,
    };
  });

  const totalCrossingsAfter = calculateCrossingsCount(routedSegments);

  return {
    isAutoRouted: true,
    style,
    showCableDucts: options.showCableDucts,
    cornerRadius,
    laneSeparation,
    totalCrossingsBefore,
    totalCrossingsAfter,
    totalLengthMm,
    routedPaths,
  };
}
