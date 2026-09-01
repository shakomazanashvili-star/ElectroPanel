import { FloorPlanWall, FloorPlanRoom, FloorPlanWireRoute, FloorPlanDevice } from '../types';

export type WireRoutingMode = 'WALL_SNAP' | 'ORTHO_90' | 'DIRECT';

export interface Point2D {
  x: number;
  y: number;
}

export interface RoutingResult {
  waypoints: Point2D[];
  lengthMeters: number;
  routingMode: WireRoutingMode;
  snapType: 'WALL' | 'GRID' | 'DIRECT';
  snappedWallId?: string;
  guideLines?: Array<{ x1: number; y1: number; x2: number; y2: number; label?: string }>;
}

/**
 * Finds the closest point on a line segment to a given point.
 */
function closestPointOnSegment(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y };

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };
}

/**
 * Calculates distance from point to segment.
 */
function distToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const cp = closestPointOnSegment(p, a, b);
  return Math.hypot(p.x - cp.x, p.y - cp.y);
}

/**
 * Computes Manhattan / Orthogonal 90-degree waypoints between start and end.
 * Determines whether H-then-V or V-then-H is optimal based on nearby walls.
 */
export function calculateOrtho90Route(
  start: Point2D,
  end: Point2D,
  walls: FloorPlanWall[] = [],
  gridSnap: number = 10
): Point2D[] {
  // Snap points to grid
  const sx = Math.round(start.x / gridSnap) * gridSnap;
  const sy = Math.round(start.y / gridSnap) * gridSnap;
  const ex = Math.round(end.x / gridSnap) * gridSnap;
  const ey = Math.round(end.y / gridSnap) * gridSnap;

  // If points are already aligned horizontally or vertically
  if (Math.abs(sx - ex) < 2 || Math.abs(sy - ey) < 2) {
    return [{ x: start.x, y: start.y }, { x: end.x, y: end.y }];
  }

  // Option 1: Horizontal then Vertical: (sx, sy) -> (ex, sy) -> (ex, ey)
  const corner1: Point2D = { x: ex, y: sy };
  // Option 2: Vertical then Horizontal: (sx, sy) -> (sx, ey) -> (ex, ey)
  const corner2: Point2D = { x: sx, y: ey };

  // Score both options by checking proximity to existing walls (closer to walls is better in electrical drafting)
  let score1 = 0;
  let score2 = 0;

  for (const wall of walls) {
    const wa = { x: wall.startX, y: wall.startY };
    const wb = { x: wall.endX, y: wall.endY };

    // Check distance of corner1 segments to wall
    const d1_seg1 = distToSegment(corner1, wa, wb);
    const d1_seg2 = distToSegment({ x: (sx + ex) / 2, y: sy }, wa, wb);
    const d1_seg3 = distToSegment({ x: ex, y: (sy + ey) / 2 }, wa, wb);
    score1 += Math.min(d1_seg1, d1_seg2, d1_seg3);

    // Check distance of corner2 segments to wall
    const d2_seg1 = distToSegment(corner2, wa, wb);
    const d2_seg2 = distToSegment({ x: sx, y: (sy + ey) / 2 }, wa, wb);
    const d2_seg3 = distToSegment({ x: (sx + ex) / 2, y: ey }, wa, wb);
    score2 += Math.min(d2_seg1, d2_seg2, d2_seg3);
  }

  const chosenCorner = score1 <= score2 ? corner1 : corner2;

  return [
    { x: start.x, y: start.y },
    chosenCorner,
    { x: end.x, y: end.y },
  ];
}

/**
 * Calculates a magnetic 90-degree route along nearby walls or room boundaries.
 */
export function calculateMagneticWallRoute(
  start: Point2D,
  end: Point2D,
  walls: FloorPlanWall[] = [],
  rooms: FloorPlanRoom[] = [],
  gridSnap: number = 10,
  magneticRadius: number = 70
): { waypoints: Point2D[]; snappedWallId?: string; guideLines: Array<{ x1: number; y1: number; x2: number; y2: number; label?: string }> } {
  const guideLines: Array<{ x1: number; y1: number; x2: number; y2: number; label?: string }> = [];

  // Find nearest wall for start and end
  let nearestWallStart: { wall: FloorPlanWall; dist: number; cp: Point2D } | null = null;
  let nearestWallEnd: { wall: FloorPlanWall; dist: number; cp: Point2D } | null = null;

  for (const wall of walls) {
    const wa = { x: wall.startX, y: wall.startY };
    const wb = { x: wall.endX, y: wall.endY };

    const cpStart = closestPointOnSegment(start, wa, wb);
    const distStart = Math.hypot(start.x - cpStart.x, start.y - cpStart.y);
    if (distStart < magneticRadius && (!nearestWallStart || distStart < nearestWallStart.dist)) {
      nearestWallStart = { wall, dist: distStart, cp: cpStart };
    }

    const cpEnd = closestPointOnSegment(end, wa, wb);
    const distEnd = Math.hypot(end.x - cpEnd.x, end.y - cpEnd.y);
    if (distEnd < magneticRadius && (!nearestWallEnd || distEnd < nearestWallEnd.dist)) {
      nearestWallEnd = { wall, dist: distEnd, cp: cpEnd };
    }
  }

  // Case 1: Both devices are near the same wall or collinear walls
  if (nearestWallStart && nearestWallEnd && nearestWallStart.wall.id === nearestWallEnd.wall.id) {
    const wall = nearestWallStart.wall;
    const isHorizontal = Math.abs(wall.startY - wall.endY) < 10;
    const isVertical = Math.abs(wall.startX - wall.endX) < 10;

    guideLines.push({
      x1: wall.startX,
      y1: wall.startY,
      x2: wall.endX,
      y2: wall.endY,
      label: 'Wall Snap Alignment',
    });

    if (isHorizontal) {
      const wallY = (wall.startY + wall.endY) / 2;
      return {
        waypoints: [
          { x: start.x, y: start.y },
          { x: start.x, y: wallY },
          { x: end.x, y: wallY },
          { x: end.x, y: end.y },
        ],
        snappedWallId: wall.id,
        guideLines,
      };
    } else if (isVertical) {
      const wallX = (wall.startX + wall.endX) / 2;
      return {
        waypoints: [
          { x: start.x, y: start.y },
          { x: wallX, y: start.y },
          { x: wallX, y: end.y },
          { x: end.x, y: end.y },
        ],
        snappedWallId: wall.id,
        guideLines,
      };
    }
  }

  // Case 2: One device is near a wall and the other is near an intersecting or perpendicular wall
  if (nearestWallStart && nearestWallEnd) {
    const w1 = nearestWallStart.wall;
    const w2 = nearestWallEnd.wall;

    const w1IsH = Math.abs(w1.startY - w1.endY) < 15;
    const w1IsV = Math.abs(w1.startX - w1.endX) < 15;
    const w2IsH = Math.abs(w2.startY - w2.endY) < 15;
    const w2IsV = Math.abs(w2.startX - w2.endX) < 15;

    // If w1 is Horizontal and w2 is Vertical -> Corner junction at (w2.x, w1.y)
    if (w1IsH && w2IsV) {
      const cornerY = (w1.startY + w1.endY) / 2;
      const cornerX = (w2.startX + w2.endX) / 2;
      guideLines.push({ x1: w1.startX, y1: cornerY, x2: w1.endX, y2: cornerY, label: 'Wall H' });
      guideLines.push({ x1: cornerX, y1: w2.startY, x2: cornerX, y2: w2.endY, label: 'Wall V' });

      return {
        waypoints: [
          { x: start.x, y: start.y },
          { x: start.x, y: cornerY },
          { x: cornerX, y: cornerY },
          { x: cornerX, y: end.y },
          { x: end.x, y: end.y },
        ],
        snappedWallId: w1.id,
        guideLines,
      };
    }

    // If w1 is Vertical and w2 is Horizontal -> Corner junction at (w1.x, w2.y)
    if (w1IsV && w2IsH) {
      const cornerX = (w1.startX + w1.endX) / 2;
      const cornerY = (w2.startY + w2.endY) / 2;
      guideLines.push({ x1: cornerX, y1: w1.startY, x2: cornerX, y2: w1.endY, label: 'Wall V' });
      guideLines.push({ x1: w2.startX, y1: cornerY, x2: w2.endX, y2: cornerY, label: 'Wall H' });

      return {
        waypoints: [
          { x: start.x, y: start.y },
          { x: cornerX, y: start.y },
          { x: cornerX, y: cornerY },
          { x: end.x, y: cornerY },
          { x: end.x, y: end.y },
        ],
        snappedWallId: w1.id,
        guideLines,
      };
    }
  }

  // Case 3: Start device is on wall, target is ceiling/room center (or vice versa)
  if (nearestWallStart && !nearestWallEnd) {
    const wall = nearestWallStart.wall;
    const isH = Math.abs(wall.startY - wall.endY) < 15;
    const isV = Math.abs(wall.startX - wall.endX) < 15;

    if (isH) {
      const wallY = (wall.startY + wall.endY) / 2;
      guideLines.push({ x1: wall.startX, y1: wallY, x2: wall.endX, y2: wallY, label: 'Wall Alignment' });
      return {
        waypoints: [
          { x: start.x, y: start.y },
          { x: start.x, y: wallY },
          { x: end.x, y: wallY },
          { x: end.x, y: end.y },
        ],
        snappedWallId: wall.id,
        guideLines,
      };
    } else if (isV) {
      const wallX = (wall.startX + wall.endX) / 2;
      guideLines.push({ x1: wallX, y1: wall.startY, x2: wallX, y2: wall.endY, label: 'Wall Alignment' });
      return {
        waypoints: [
          { x: start.x, y: start.y },
          { x: wallX, y: start.y },
          { x: wallX, y: end.y },
          { x: end.x, y: end.y },
        ],
        snappedWallId: wall.id,
        guideLines,
      };
    }
  }

  // Fallback to Orthogonal 90 route
  const orthoWaypoints = calculateOrtho90Route(start, end, walls, gridSnap);
  return {
    waypoints: orthoWaypoints,
    guideLines,
  };
}

/**
 * Cleans up and simplifies waypoints by removing redundant collinear points.
 */
export function simplifyWaypoints(points: Point2D[], tolerance: number = 2): Point2D[] {
  if (points.length <= 2) return points;

  const result: Point2D[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Check if points are too close
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) < tolerance) {
      continue;
    }

    // Check if prev, curr, next are collinear (same vertical or horizontal line)
    const isCollinearH = Math.abs(prev.y - curr.y) < tolerance && Math.abs(curr.y - next.y) < tolerance;
    const isCollinearV = Math.abs(prev.x - curr.x) < tolerance && Math.abs(curr.x - next.x) < tolerance;

    if (isCollinearH || isCollinearV) {
      continue; // Skip middle collinear point
    }

    result.push(curr);
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Calculates total 2D route length in meters based on canvas scale (px per meter).
 */
export function calculateRouteLengthMeters(
  waypoints: Point2D[],
  scalePxPerMeter: number = 45
): number {
  if (waypoints.length < 2) return 0;
  let totalPx = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalPx += Math.hypot(
      waypoints[i + 1].x - waypoints[i].x,
      waypoints[i + 1].y - waypoints[i].y
    );
  }
  return totalPx / scalePxPerMeter;
}

/**
 * Master function to calculate a wire route between two points with magnetic snapping.
 */
export function calculateWireRoute(
  start: Point2D,
  end: Point2D,
  mode: WireRoutingMode = 'WALL_SNAP',
  walls: FloorPlanWall[] = [],
  rooms: FloorPlanRoom[] = [],
  scalePxPerMeter: number = 45,
  gridSnap: number = 10
): RoutingResult {
  if (mode === 'DIRECT') {
    const waypoints = [start, end];
    return {
      waypoints,
      lengthMeters: calculateRouteLengthMeters(waypoints, scalePxPerMeter),
      routingMode: 'DIRECT',
      snapType: 'DIRECT',
    };
  }

  if (mode === 'WALL_SNAP') {
    const { waypoints: rawPts, snappedWallId, guideLines } = calculateMagneticWallRoute(
      start,
      end,
      walls,
      rooms,
      gridSnap
    );
    const waypoints = simplifyWaypoints(rawPts);
    return {
      waypoints,
      lengthMeters: calculateRouteLengthMeters(waypoints, scalePxPerMeter),
      routingMode: 'WALL_SNAP',
      snapType: snappedWallId ? 'WALL' : 'GRID',
      snappedWallId,
      guideLines,
    };
  }

  // Default ORTHO_90
  const rawPts = calculateOrtho90Route(start, end, walls, gridSnap);
  const waypoints = simplifyWaypoints(rawPts);
  return {
    waypoints,
    lengthMeters: calculateRouteLengthMeters(waypoints, scalePxPerMeter),
    routingMode: 'ORTHO_90',
    snapType: 'GRID',
  };
}

/**
 * Generates an SVG `<path d="...">` string with rounded CAD fillets at 90-degree corners.
 */
export function generateCADPathData(waypoints: Point2D[], cornerRadius: number = 6): string {
  if (!waypoints || waypoints.length === 0) return '';
  if (waypoints.length === 1) return `M ${waypoints[0].x} ${waypoints[0].y}`;
  if (waypoints.length === 2) {
    return `M ${waypoints[0].x} ${waypoints[0].y} L ${waypoints[1].x} ${waypoints[1].y}`;
  }

  let d = `M ${waypoints[0].x} ${waypoints[0].y}`;

  for (let i = 1; i < waypoints.length - 1; i++) {
    const pPrev = waypoints[i - 1];
    const pCurr = waypoints[i];
    const pNext = waypoints[i + 1];

    const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r <= 1 || len1 === 0 || len2 === 0) {
      d += ` L ${pCurr.x} ${pCurr.y}`;
      continue;
    }

    const startX = pCurr.x + (v1.x / len1) * r;
    const startY = pCurr.y + (v1.y / len1) * r;
    const endX = pCurr.x + (v2.x / len2) * r;
    const endY = pCurr.y + (v2.y / len2) * r;

    d += ` L ${startX} ${startY}`;
    d += ` Q ${pCurr.x} ${pCurr.y} ${endX} ${endY}`;
  }

  const last = waypoints[waypoints.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

/**
 * Finds the midpoint of a multi-segment wire route (for placing circuit tag badges).
 */
export function getRouteMidpoint(waypoints: Point2D[]): Point2D {
  if (!waypoints || waypoints.length === 0) return { x: 0, y: 0 };
  if (waypoints.length === 1) return waypoints[0];
  if (waypoints.length === 2) {
    return {
      x: (waypoints[0].x + waypoints[1].x) / 2,
      y: (waypoints[0].y + waypoints[1].y) / 2,
    };
  }

  // Find total length
  let totalLen = 0;
  const segLengths: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const len = Math.hypot(
      waypoints[i + 1].x - waypoints[i].x,
      waypoints[i + 1].y - waypoints[i].y
    );
    segLengths.push(len);
    totalLen += len;
  }

  const halfLen = totalLen / 2;
  let accumulated = 0;

  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= halfLen) {
      const remaining = halfLen - accumulated;
      const t = segLengths[i] > 0 ? remaining / segLengths[i] : 0;
      return {
        x: waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * t,
        y: waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * t,
      };
    }
    accumulated += segLengths[i];
  }

  const midIdx = Math.floor(waypoints.length / 2);
  return waypoints[midIdx];
}
