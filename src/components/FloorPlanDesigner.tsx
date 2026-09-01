import React, { useState, useRef, useMemo } from 'react';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Layers,
  Info,
  CheckCircle2,
  MousePointer,
  Cable,
  FolderSync,
  Sliders,
  Settings,
  Eye,
  EyeOff,
  Move,
  Home,
  Check,
  ChevronRight,
  ChevronDown,
  X,
  Compass,
  Upload,
  Ruler,
  FileCode2,
  Box,
  FileText,
  FileJson,
  FolderOpen,
  Square,
  DoorOpen,
  PanelsTopLeft,
  Magnet,
} from 'lucide-react';
import {
  FloorPlanData,
  FloorPlanDevice,
  FloorPlanDeviceType,
  FloorPlanRoom,
  FloorPlanWall,
  FloorPlanDoor,
  FloorPlanWindow,
  FloorPlanWireRoute,
  FloorPlanConduitType,
  FloorPlanBackgroundImage,
  Language,
  CircuitLoad,
} from '../types';
import { TRANSLATIONS } from '../data/translations';
import {
  DEVICE_DEFINITIONS,
  DEFAULT_FLOOR_PLAN_PRESET,
  CADASTRAL_NAPR_HOUSE_PRESET,
  BLANK_FLOOR_PLAN_PRESET,
  ALL_FLOOR_PLAN_PRESETS,
} from '../data/floorPlanPresets';
import { FloorPlanDeviceIcon } from './FloorPlanDeviceIcon';
import { CadExportModal } from './CadExportModal';
import { BackgroundPlanModal } from './BackgroundPlanModal';
import {
  calculateWireRoute,
  generateCADPathData,
  getRouteMidpoint,
  WireRoutingMode,
  RoutingResult,
} from '../utils/wireRoutingEngine';
import {
  ROOM_PRESETS,
  RoomPreset,
  generatePerimeterWallsForRoom,
  autoEquipRoom,
  autoRouteRoomCables,
} from '../utils/roomPlannerEngine';

interface FloorPlanDesignerProps {
  lang: Language;
  onSyncToCircuitSchedule?: (loads: CircuitLoad[]) => void;
  existingLoads?: CircuitLoad[];
}

export type FloorPlanToolMode =
  | 'SELECT'
  | 'DRAW_ROOM'
  | 'WALL_OUTER'
  | 'WALL_INNER'
  | 'DOOR'
  | 'WINDOW'
  | 'ROOM'
  | 'PLACE'
  | 'CONDUIT'
  | 'MEASURE'
  | 'DELETE';

export const FloorPlanDesigner: React.FC<FloorPlanDesignerProps> = ({
  lang,
  onSyncToCircuitSchedule,
  existingLoads = [],
}) => {
  const t = TRANSLATIONS[lang];
  const isKa = lang === 'ka';

  // Floor Plan Data State
  const [planData, setPlanData] = useState<FloorPlanData>(CADASTRAL_NAPR_HOUSE_PRESET);

  // Selection states
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Active Tool Mode
  const [toolMode, setToolMode] = useState<FloorPlanToolMode>('SELECT');
  const [pendingDeviceType, setPendingDeviceType] = useState<FloorPlanDeviceType>('SWITCH_1G');
  const [conduitStartDeviceId, setConduitStartDeviceId] = useState<string | null>(null);

  // Room Planner State
  const [selectedRoomPreset, setSelectedRoomPreset] = useState<RoomPreset>(ROOM_PRESETS[0]);
  const [autoGenerateWallsOnRoom, setAutoGenerateWallsOnRoom] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'DEVICES' | 'ROOMS'>('DEVICES');
  const [isQuickRoomMenuOpen, setIsQuickRoomMenuOpen] = useState<boolean>(false);
  const [resizingRoom, setResizingRoom] = useState<{
    id: string;
    handle: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startMouseX: number;
    startMouseY: number;
  } | null>(null);

  // Magnetic Wire Routing Engine State
  const [wireRoutingMode, setWireRoutingMode] = useState<WireRoutingMode>('WALL_SNAP');
  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);
  const [activeSnapResult, setActiveSnapResult] = useState<RoutingResult | null>(null);

  // Interactive Drawing states (Walls, Rooms, Measure, etc.)
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);

  // Canvas Viewport & Zoom State
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // View Display Options
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showHeights, setShowHeights] = useState<boolean>(true);
  const [showCircuitTags, setShowCircuitTags] = useState<boolean>(true);
  const [showConduits, setShowConduits] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [orthoSnap, setOrthoSnap] = useState<boolean>(true);

  // Palette Category Filter
  const [paletteCategory, setPaletteCategory] = useState<
    'ALL' | 'SWITCHES' | 'SOCKETS' | 'DISTRIBUTION' | 'LIGHTING' | 'APPLIANCES'
  >('ALL');

  // Dragging device state
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modals
  const [isCadExportOpen, setIsCadExportOpen] = useState<boolean>(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState<boolean>(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('ახალი ოთახი');
  const [newRoomWidthM, setNewRoomWidthM] = useState<number>(4.0);
  const [newRoomHeightM, setNewRoomHeightM] = useState<number>(3.5);

  // File input for opening JSON projects
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const svgRef = useRef<SVGSVGElement>(null);

  // Calculated Device Summary
  const deviceCounts: Record<FloorPlanDeviceType, number> = useMemo(() => {
    const counts = {} as Record<FloorPlanDeviceType, number>;
    (Object.keys(DEVICE_DEFINITIONS) as FloorPlanDeviceType[]).forEach((k) => {
      counts[k] = 0;
    });
    planData.devices.forEach((d) => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    return counts;
  }, [planData.devices]);

  // Calculated Cable Lengths by Specification
  const cableEstimates: Record<string, { meters: number; count: number; color: string }> = useMemo(() => {
    const cables: Record<string, { meters: number; count: number; color: string }> = {};

    planData.wireRoutes.forEach((route) => {
      const fromDev = planData.devices.find((d) => d.id === route.fromDeviceId);
      const toDev = planData.devices.find((d) => d.id === route.toDeviceId);

      if (!fromDev || !toDev) return;

      const scale = planData.scalePxPerMeter || 45;
      let horizontalDistanceM = route.lengthMeters || 0;

      if (!horizontalDistanceM) {
        if (route.waypoints && route.waypoints.length >= 2) {
          let pxLen = 0;
          for (let i = 0; i < route.waypoints.length - 1; i++) {
            pxLen += Math.hypot(
              route.waypoints[i + 1].x - route.waypoints[i].x,
              route.waypoints[i + 1].y - route.waypoints[i].y
            );
          }
          horizontalDistanceM = pxLen / scale;
        } else {
          const dx = (toDev.x - fromDev.x) / scale;
          const dy = (toDev.y - fromDev.y) / scale;
          horizontalDistanceM = Math.sqrt(dx * dx + dy * dy);
        }
      }

      const ceilingHeightCm = 270;
      const dropFromCm = Math.abs(ceilingHeightCm - (fromDev.heightCm || 90));
      const dropToCm = Math.abs(ceilingHeightCm - (toDev.heightCm || 90));
      const verticalDropsM = (dropFromCm + dropToCm) / 100;

      const totalRouteM = (horizontalDistanceM + verticalDropsM) * 1.15;

      const spec = route.cableSpec || 'NYM 3x1.5';
      if (!cables[spec]) {
        cables[spec] = { meters: 0, count: 0, color: route.color };
      }
      cables[spec].meters += totalRouteM;
      cables[spec].count += 1;
    });

    return cables;
  }, [planData]);

  const totalCableMeters = useMemo(() => {
    return Object.values(cableEstimates).reduce((sum, c) => sum + (c?.meters || 0), 0);
  }, [cableEstimates]);

  const totalInstalledPowerW = useMemo(() => {
    return planData.devices.reduce((sum, d) => sum + (d.powerW || 0), 0);
  }, [planData.devices]);

  // Total Wall Length in meters
  const totalWallLengthM = useMemo(() => {
    const scale = planData.scalePxPerMeter || 45;
    return (planData.walls || []).reduce((sum, w) => {
      const dx = (w.endX - w.startX) / scale;
      const dy = (w.endY - w.startY) / scale;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0);
  }, [planData.walls, planData.scalePxPerMeter]);

  // Selected device object
  const selectedDevice = useMemo(() => {
    return planData.devices.find((d) => d.id === selectedDeviceId) || null;
  }, [planData.devices, selectedDeviceId]);

  // Selected Room
  const selectedRoom = useMemo(() => {
    return planData.rooms.find((r) => r.id === selectedRoomId) || null;
  }, [planData.rooms, selectedRoomId]);

  // Selected Wall
  const selectedWall = useMemo(() => {
    return (planData.walls || []).find((w) => w.id === selectedWallId) || null;
  }, [planData.walls, selectedWallId]);

  // Selected Route
  const selectedRoute = useMemo(() => {
    return planData.wireRoutes.find((r) => r.id === selectedRouteId) || null;
  }, [planData.wireRoutes, selectedRouteId]);

  // 1-Click Quick Room Stamp Placement
  const handleAddRoomPreset = (preset: RoomPreset) => {
    const scale = planData.scalePxPerMeter || 45;
    const widthPx = Math.round(preset.defaultWidthM * scale);
    const heightPx = Math.round(preset.defaultHeightM * scale);
    const areaM2 = parseFloat((preset.defaultWidthM * preset.defaultHeightM).toFixed(2));

    const offset = (planData.rooms.length * 35) % 250;
    const newRoom: FloorPlanRoom = {
      id: `room-${Date.now()}`,
      name: isKa ? preset.nameKa : preset.nameEn,
      x: 90 + offset,
      y: 90 + offset,
      width: widthPx,
      height: heightPx,
      areaM2,
      color: preset.color,
      ceilingHeightM: 2.7,
    };

    const newWalls = autoGenerateWallsOnRoom
      ? generatePerimeterWallsForRoom(newRoom, scale, false, 20)
      : [];

    setPlanData((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
      walls: [...(prev.walls || []), ...newWalls],
    }));

    setSelectedRoomId(newRoom.id);
    setSelectedDeviceId(null);
    setSelectedWallId(null);
    setIsQuickRoomMenuOpen(false);
    showToast(
      isKa
        ? `✨ დაემატა: ${newRoom.name} (${areaM2} მ²)`
        : `✨ Added: ${newRoom.name} (${areaM2} m²)`
    );
  };

  // Smart Auto-Equip Room
  const handleAutoEquipSelectedRoom = () => {
    if (!selectedRoom) return;
    const { devices, toastMessage } = autoEquipRoom(selectedRoom, planData.devices.length, lang);
    setPlanData((prev) => ({
      ...prev,
      devices: [...prev.devices, ...devices],
    }));
    showToast(toastMessage);
  };

  // Smart Auto-Route Cables for Room
  const handleAutoRouteSelectedRoom = () => {
    if (!selectedRoom) return;
    const newRoutes = autoRouteRoomCables(
      selectedRoom,
      planData.devices,
      planData.walls || [],
      planData.rooms || [],
      planData.scalePxPerMeter || 45
    );
    if (newRoutes.length === 0) {
      showToast(
        isKa
          ? 'ოთახში წერტილები არ მოიძებნა ტრასების გასაყვანად'
          : 'No devices found in room to route'
      );
      return;
    }
    setPlanData((prev) => ({
      ...prev,
      wireRoutes: [...prev.wireRoutes, ...newRoutes],
    }));
    showToast(
      isKa
        ? `⚡ გაყვანილია ${newRoutes.length} კაბელის ტრასა (90° კედლის მიბმით)!`
        : `⚡ Auto-routed ${newRoutes.length} conduits with 90° wall snap!`
    );
  };

  // Generate Perimeter Walls for Room
  const handleGenerateWallsForSelectedRoom = () => {
    if (!selectedRoom) return;
    const scale = planData.scalePxPerMeter || 45;
    const walls = generatePerimeterWallsForRoom(selectedRoom, scale, false, 20);
    setPlanData((prev) => ({
      ...prev,
      walls: [...(prev.walls || []), ...walls],
    }));
    showToast(
      isKa
        ? `🧱 ოთახის პერიმეტრზე დაემატა 4 კედელი (20სმ)`
        : `🧱 Generated 4 perimeter walls (20cm) for room`
    );
  };

  // Delete Selected Room
  const handleDeleteSelectedRoom = (deleteDevices: boolean = false) => {
    if (!selectedRoomId) return;
    const room = planData.rooms.find((r) => r.id === selectedRoomId);
    if (!room) return;

    setPlanData((prev) => {
      let updatedDevices = prev.devices;
      if (deleteDevices) {
        updatedDevices = prev.devices.filter(
          (d) =>
            d.roomName !== room.name &&
            !(d.x >= room.x && d.x <= room.x + room.width && d.y >= room.y && d.y <= room.y + room.height)
        );
      }
      return {
        ...prev,
        rooms: prev.rooms.filter((r) => r.id !== selectedRoomId),
        devices: updatedDevices,
      };
    });
    setSelectedRoomId(null);
    showToast(isKa ? `ოთახი წაიშალა: ${room.name}` : `Room deleted: ${room.name}`);
  };

  // Convert client mouse event to canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;

    // Grid snap
    const snap = planData.gridSnapPx || 10;
    let snappedX = Math.round(rawX / snap) * snap;
    let snappedY = Math.round(rawY / snap) * snap;

    // Orthogonal snap if drawing wall and drawingStart is set
    if (orthoSnap && drawingStart && toolMode !== 'DRAW_ROOM' && toolMode !== 'ROOM') {
      const dx = Math.abs(snappedX - drawingStart.x);
      const dy = Math.abs(snappedY - drawingStart.y);
      if (dx > dy * 2) {
        snappedY = drawingStart.y; // horizontal lock
      } else if (dy > dx * 2) {
        snappedX = drawingStart.x; // vertical lock
      }
    }

    return { x: snappedX, y: snappedY };
  };

  // Handle Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCanvasCoords(e);

    // 0. INTERACTIVE DRAW ROOM (DRAG & DROP CAD BOX)
    if (toolMode === 'DRAW_ROOM' || toolMode === 'ROOM') {
      setDrawingStart(coords);
      setCurrentMousePos(coords);
      return;
    }

    // 1. PLACE ELECTRICAL DEVICE
    if (toolMode === 'PLACE') {
      const room = planData.rooms.find(
        (r) =>
          coords.x >= r.x &&
          coords.x <= r.x + r.width &&
          coords.y >= r.y &&
          coords.y <= r.y + r.height
      );

      const def = DEVICE_DEFINITIONS[pendingDeviceType];
      const newDev: FloorPlanDevice = {
        id: `dev-${Date.now()}`,
        type: pendingDeviceType,
        x: coords.x,
        y: coords.y,
        rotation: 0,
        label: `${def.category.substring(0, 2)}-${planData.devices.length + 1}`,
        customName: isKa ? def.labelKa : def.labelEn,
        roomName: room ? room.name : isKa ? 'ოთახი' : 'Room',
        circuitCode: def.defaultCircuit,
        powerW: def.defaultPowerW,
        heightCm: def.defaultHeightCm,
        cableGaugeMm2: def.defaultGauge,
        cableType: def.defaultCable,
        ipRating: def.ipRating,
      };

      setPlanData((prev) => ({
        ...prev,
        devices: [...prev.devices, newDev],
      }));
      setSelectedDeviceId(newDev.id);
      setToolMode('SELECT');
      showToast(isKa ? `დაემატა: ${def.labelKa}` : `Added: ${def.labelEn}`);
      return;
    }

    // 2. DRAW WALL (OUTER / INNER)
    if (toolMode === 'WALL_OUTER' || toolMode === 'WALL_INNER') {
      if (!drawingStart) {
        setDrawingStart(coords);
        setCurrentMousePos(coords);
      } else {
        // Complete wall segment
        const isOuter = toolMode === 'WALL_OUTER';
        const newWall: FloorPlanWall = {
          id: `wall-${Date.now()}`,
          startX: drawingStart.x,
          startY: drawingStart.y,
          endX: coords.x,
          endY: coords.y,
          thicknessCm: isOuter ? 25 : 12,
          heightM: 2.7,
          isOuter,
        };

        setPlanData((prev) => ({
          ...prev,
          walls: [...(prev.walls || []), newWall],
        }));

        // Chain drawing next wall start
        setDrawingStart(coords);
        setCurrentMousePos(coords);
        showToast(
          isKa
            ? `კედელი დაემატა (${((Math.hypot(coords.x - drawingStart.x, coords.y - drawingStart.y) / planData.scalePxPerMeter)).toFixed(2)} მ)`
            : 'Wall segment added'
        );
      }
      return;
    }

    // 3. PLACE DOOR
    if (toolMode === 'DOOR') {
      const newDoor: FloorPlanDoor = {
        id: `door-${Date.now()}`,
        x: coords.x,
        y: coords.y,
        widthCm: 90,
        rotation: 0,
        swingDirection: 'RIGHT',
      };
      setPlanData((prev) => ({
        ...prev,
        doors: [...(prev.doors || []), newDoor],
      }));
      setSelectedDoorId(newDoor.id);
      setToolMode('SELECT');
      showToast(isKa ? 'კარი ჩაისვა' : 'Door inserted');
      return;
    }

    // 4. PLACE WINDOW
    if (toolMode === 'WINDOW') {
      const newWin: FloorPlanWindow = {
        id: `win-${Date.now()}`,
        x: coords.x,
        y: coords.y,
        widthCm: 140,
        rotation: 0,
      };
      setPlanData((prev) => ({
        ...prev,
        windows: [...(prev.windows || []), newWin],
      }));
      setSelectedWindowId(newWin.id);
      setToolMode('SELECT');
      showToast(isKa ? 'ფანჯარა ჩაისვა' : 'Window inserted');
      return;
    }

    // 5. MEASURE TAPE
    if (toolMode === 'MEASURE') {
      if (!drawingStart) {
        setDrawingStart(coords);
        setCurrentMousePos(coords);
      } else {
        const distM = Math.hypot(coords.x - drawingStart.x, coords.y - drawingStart.y) / planData.scalePxPerMeter;
        showToast(isKa ? `მანძილი: ${distM.toFixed(2)} მეტრი` : `Distance: ${distM.toFixed(2)} meters`);
        setDrawingStart(null);
        setCurrentMousePos(null);
      }
      return;
    }

    // Clicked empty background
    if (
      e.target === svgRef.current ||
      (e.target as HTMLElement).id === 'blueprint-canvas-bg' ||
      (e.target as HTMLElement).id === 'cad-grid-pattern'
    ) {
      setSelectedDeviceId(null);
      setSelectedWallId(null);
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      setSelectedRoomId(null);
      setSelectedRouteId(null);
      setConduitStartDeviceId(null);

      // Start Panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Handle Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const coords = getCanvasCoords(e);
    if (drawingStart) {
      setCurrentMousePos(coords);
    }

    // Live Room Resizing
    if (resizingRoom) {
      const { id, handle, startX, startY, startW, startH, startMouseX, startMouseY } = resizingRoom;
      const dx = coords.x - startMouseX;
      const dy = coords.y - startMouseY;
      const scale = planData.scalePxPerMeter || 45;

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      if (handle.includes('r')) newW = Math.max(40, startW + dx);
      if (handle.includes('b')) newH = Math.max(40, startH + dy);
      if (handle.includes('l')) {
        const potentialW = startW - dx;
        if (potentialW >= 40) {
          newX = startX + dx;
          newW = potentialW;
        }
      }
      if (handle.includes('t')) {
        const potentialH = startH - dy;
        if (potentialH >= 40) {
          newY = startY + dy;
          newH = potentialH;
        }
      }

      const areaM2 = parseFloat(((newW / scale) * (newH / scale)).toFixed(2));

      setPlanData((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) =>
          r.id === id
            ? {
                ...r,
                x: newX,
                y: newY,
                width: newW,
                height: newH,
                areaM2,
              }
            : r
        ),
      }));
      return;
    }

    // Live preview for Conduit routing
    if (toolMode === 'CONDUIT' && conduitStartDeviceId) {
      const fromDev = planData.devices.find((d) => d.id === conduitStartDeviceId);
      if (fromDev) {
        let targetPt = coords;
        if (hoveredDeviceId) {
          const hDev = planData.devices.find((d) => d.id === hoveredDeviceId);
          if (hDev) targetPt = { x: hDev.x, y: hDev.y };
        }
        const liveRoute = calculateWireRoute(
          { x: fromDev.x, y: fromDev.y },
          targetPt,
          wireRoutingMode,
          planData.walls || [],
          planData.rooms || [],
          planData.scalePxPerMeter || 45,
          planData.gridSnapPx || 10
        );
        setActiveSnapResult(liveRoute);
        setCurrentMousePos(coords);
      }
    }

    if (draggingDeviceId) {
      const snap = planData.gridSnapPx || 10;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clientX = (e.clientX - rect.left - pan.x) / zoom;
      const clientY = (e.clientY - rect.top - pan.y) / zoom;

      const newX = Math.round((clientX - dragOffset.x) / snap) * snap;
      const newY = Math.round((clientY - dragOffset.y) / snap) * snap;

      const currentRoom = planData.rooms.find(
        (r) => newX >= r.x && newX <= r.x + r.width && newY >= r.y && newY <= r.y + r.height
      );

      setPlanData((prev) => {
        const updatedDevices = prev.devices.map((d) =>
          d.id === draggingDeviceId
            ? {
                ...d,
                x: newX,
                y: newY,
                roomName: currentRoom ? currentRoom.name : d.roomName,
              }
            : d
        );

        // Dynamically recalculate connected wire routes' 90-degree paths while dragging
        const updatedRoutes = prev.wireRoutes.map((r) => {
          if (r.fromDeviceId === draggingDeviceId || r.toDeviceId === draggingDeviceId) {
            const fromD = updatedDevices.find((d) => d.id === r.fromDeviceId);
            const toD = updatedDevices.find((d) => d.id === r.toDeviceId);
            if (fromD && toD) {
              const res = calculateWireRoute(
                { x: fromD.x, y: fromD.y },
                { x: toD.x, y: toD.y },
                r.routingMode || 'WALL_SNAP',
                prev.walls || [],
                prev.rooms || [],
                prev.scalePxPerMeter || 45,
                prev.gridSnapPx || 10
              );
              return {
                ...r,
                waypoints: res.waypoints,
                lengthMeters: res.lengthMeters,
              };
            }
          }
          return r;
        });

        return {
          ...prev,
          devices: updatedDevices,
          wireRoutes: updatedRoutes,
        };
      });
    }
  };

  // Handle Canvas Mouse Up
  const handleCanvasMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsPanning(false);
    setDraggingDeviceId(null);
    setResizingRoom(null);

    // Complete Interactive Draw Room
    if ((toolMode === 'DRAW_ROOM' || toolMode === 'ROOM') && drawingStart) {
      const coords = getCanvasCoords(e);
      const minX = Math.min(drawingStart.x, coords.x);
      const minY = Math.min(drawingStart.y, coords.y);
      const width = Math.abs(coords.x - drawingStart.x);
      const height = Math.abs(coords.y - drawingStart.y);
      const scale = planData.scalePxPerMeter || 45;
      const areaM2 = parseFloat(((width / scale) * (height / scale)).toFixed(2));

      if (width >= 35 && height >= 35) {
        const newRoom: FloorPlanRoom = {
          id: `room-${Date.now()}`,
          name: isKa ? selectedRoomPreset.nameKa : selectedRoomPreset.nameEn,
          x: minX,
          y: minY,
          width,
          height,
          areaM2,
          color: selectedRoomPreset.color,
          ceilingHeightM: 2.7,
        };

        let newWalls: FloorPlanWall[] = [];
        if (autoGenerateWallsOnRoom) {
          newWalls = generatePerimeterWallsForRoom(newRoom, scale, false, 20);
        }

        setPlanData((prev) => ({
          ...prev,
          rooms: [...prev.rooms, newRoom],
          walls: [...(prev.walls || []), ...newWalls],
        }));

        setSelectedRoomId(newRoom.id);
        setSelectedDeviceId(null);
        setSelectedWallId(null);
        setToolMode('SELECT');
        showToast(
          isKa
            ? `✨ ოთახი დაემატა: ${newRoom.name} (${areaM2} მ²)`
            : `✨ Room created: ${newRoom.name} (${areaM2} m²)`
        );
      }
      setDrawingStart(null);
      setCurrentMousePos(null);
    }
  };

  // Double click to finish continuous wall drawing
  const handleCanvasDoubleClick = () => {
    if (drawingStart) {
      setDrawingStart(null);
      setCurrentMousePos(null);
      showToast(isKa ? 'კედლის ხაზვა დასრულდა' : 'Wall drawing finished');
    }
  };

  // Device Click handler
  const handleDeviceClick = (e: React.MouseEvent, dev: FloorPlanDevice) => {
    e.stopPropagation();

    if (toolMode === 'DELETE') {
      deleteDevice(dev.id);
      return;
    }

    if (toolMode === 'CONDUIT') {
      if (!conduitStartDeviceId) {
        setConduitStartDeviceId(dev.id);
        showToast(
          isKa
            ? `საწყისი: ${dev.label} -> აირჩიეთ სამიზნე (🧲 90° კედელზე მიბმა)`
            : `Start: ${dev.label} -> Select target device (🧲 90° Wall Snap)`
        );
      } else if (conduitStartDeviceId !== dev.id) {
        // Create Conduit with 90-degree magnetic route
        const fromDev = planData.devices.find((d) => d.id === conduitStartDeviceId);
        if (!fromDev) return;

        let conduitType: FloorPlanConduitType = 'LIGHTING';
        let cableSpec = 'NYM 3x1.5';
        let color = '#f59e0b';

        if (
          dev.type.includes('SOCKET') ||
          fromDev.type.includes('SOCKET') ||
          dev.type === 'AC_UNIT' ||
          dev.type === 'WATER_HEATER'
        ) {
          conduitType = 'POWER';
          cableSpec = 'NYM 3x2.5';
          color = '#3b82f6';
        } else if (dev.type === 'COOKTOP' || fromDev.type === 'COOKTOP') {
          conduitType = 'HEAVY';
          cableSpec = 'NYM 3x4.0';
          color = '#ef4444';
        } else if (dev.type === 'SOCKET_INTERNET' || fromDev.type === 'SOCKET_INTERNET') {
          conduitType = 'DATA';
          cableSpec = 'UTP Cat6';
          color = '#10b981';
        }

        // Calculate precision 90-degree route
        const routeResult = calculateWireRoute(
          { x: fromDev.x, y: fromDev.y },
          { x: dev.x, y: dev.y },
          wireRoutingMode,
          planData.walls || [],
          planData.rooms || [],
          planData.scalePxPerMeter || 45,
          planData.gridSnapPx || 10
        );

        const newRoute: FloorPlanWireRoute = {
          id: `route-${Date.now()}`,
          fromDeviceId: conduitStartDeviceId,
          toDeviceId: dev.id,
          circuitCode: fromDev.circuitCode || dev.circuitCode || 'Q1',
          wireType: conduitType,
          cableSpec,
          color,
          lineStyle: conduitType === 'DATA' ? 'dashed' : 'solid',
          routingMode: wireRoutingMode,
          waypoints: routeResult.waypoints,
          lengthMeters: routeResult.lengthMeters,
        };

        setPlanData((prev) => ({
          ...prev,
          wireRoutes: [...prev.wireRoutes, newRoute],
        }));

        setConduitStartDeviceId(null);
        setActiveSnapResult(null);
        setSelectedRouteId(newRoute.id);
        showToast(
          isKa
            ? `ტრასა გაყვანილია 90°-ით: ${fromDev.label} <-> ${dev.label} (${routeResult.lengthMeters.toFixed(2)} მ)`
            : `90° Route created: ${fromDev.label} <-> ${dev.label} (${routeResult.lengthMeters.toFixed(2)} m)`
        );
      }
      return;
    }

    // Default SELECT
    setSelectedDeviceId(dev.id);
    setSelectedWallId(null);
    setSelectedDoorId(null);
    setSelectedWindowId(null);
    setSelectedRoomId(null);
    setSelectedRouteId(null);

    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const clientX = (e.clientX - rect.left - pan.x) / zoom;
      const clientY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({ x: clientX - dev.x, y: clientY - dev.y });
    }
    setDraggingDeviceId(dev.id);
  };

  // Delete Handlers
  const deleteDevice = (id: string) => {
    setPlanData((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== id),
      wireRoutes: prev.wireRoutes.filter((r) => r.fromDeviceId !== id && r.toDeviceId !== id),
    }));
    if (selectedDeviceId === id) setSelectedDeviceId(null);
  };

  const deleteWall = (id: string) => {
    setPlanData((prev) => ({
      ...prev,
      walls: (prev.walls || []).filter((w) => w.id !== id),
    }));
    if (selectedWallId === id) setSelectedWallId(null);
  };

  const deleteDoor = (id: string) => {
    setPlanData((prev) => ({
      ...prev,
      doors: (prev.doors || []).filter((d) => d.id !== id),
    }));
    if (selectedDoorId === id) setSelectedDoorId(null);
  };

  const deleteWindow = (id: string) => {
    setPlanData((prev) => ({
      ...prev,
      windows: (prev.windows || []).filter((w) => w.id !== id),
    }));
    if (selectedWindowId === id) setSelectedWindowId(null);
  };

  const rotateSelectedDevice = (degrees: number) => {
    if (!selectedDeviceId) return;
    setPlanData((prev) => ({
      ...prev,
      devices: prev.devices.map((d) =>
        d.id === selectedDeviceId ? { ...d, rotation: (d.rotation + degrees + 360) % 360 } : d
      ),
    }));
  };

  // Handle Project JSON File Import
  const handleOpenProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.devices && (parsed.rooms || parsed.walls)) {
          setPlanData(parsed);
          showToast(isKa ? 'პროექტი წარმატებით გაიხსნა!' : 'Project opened successfully!');
        } else {
          showToast(isKa ? 'არასწორი პროექტის ფაილი' : 'Invalid project JSON format');
        }
      } catch (err) {
        showToast(isKa ? 'ფაილის წაკითხვის შეცდომა' : 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Sync to Circuit Schedule
  const handleSyncLoads = () => {
    if (!onSyncToCircuitSchedule) return;

    const circuitGroups: Record<string, CircuitLoad> = {};

    planData.devices.forEach((dev) => {
      const code = dev.circuitCode || 'Q1';
      if (!circuitGroups[code]) {
        let cat: any = 'SOCKETS';
        if (dev.type.includes('SWITCH') || dev.type.includes('LIGHT')) cat = 'LIGHTING';
        else if (dev.type === 'AC_UNIT') cat = 'AC_CLIMATE';
        else if (dev.type === 'COOKTOP') cat = 'KITCHEN';
        else if (dev.type === 'WATER_HEATER') cat = 'HEATING_BOILER';
        else if (dev.type.includes('IP44')) cat = 'WET_ROOM';

        circuitGroups[code] = {
          id: `load-sync-${code}-${Date.now()}`,
          circuitCode: code,
          name: `${dev.roomName} - ${dev.customName}`,
          room: dev.roomName,
          category: cat,
          powerW: 0,
          voltageV: 230,
          cosPhi: 0.95,
          breakerRatingA: dev.type === 'COOKTOP' ? 25 : dev.type.includes('SOCKET') ? 16 : 10,
          wireGaugeMm2: dev.cableGaugeMm2 || 2.5,
          cableType: dev.cableType || 'NYM 3x2.5',
          demandFactor: 0.8,
          isActive: true,
        };
      }
      circuitGroups[code].powerW += dev.powerW || 50;
    });

    const newLoadsList = Object.values(circuitGroups);
    onSyncToCircuitSchedule(newLoadsList);
    showToast(
      isKa
        ? `სინქრონიზებულია ${newLoadsList.length} ელექტრული ჯგუფი დატვირთვების გრაფაში!`
        : `Synced ${newLoadsList.length} circuits to Load Schedule!`
    );
  };

  // Add Room Handler
  const handleAddRoom = () => {
    const scale = planData.scalePxPerMeter || 45;
    const widthPx = Math.round(newRoomWidthM * scale);
    const heightPx = Math.round(newRoomHeightM * scale);

    const newRoom: FloorPlanRoom = {
      id: `room-${Date.now()}`,
      name: newRoomName || 'ახალი ოთახი',
      x: 60 + planData.rooms.length * 30,
      y: 60 + planData.rooms.length * 30,
      width: widthPx,
      height: heightPx,
      areaM2: Number((newRoomWidthM * newRoomHeightM).toFixed(1)),
      color: '#1e293b',
      ceilingHeightM: 2.7,
    };

    setPlanData((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }));

    setIsAddRoomOpen(false);
    showToast(isKa ? `დაემატა ოთახი: ${newRoom.name}` : `Added room: ${newRoom.name}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2.5 bg-sky-600 text-white font-medium text-xs rounded-xl shadow-2xl flex items-center gap-2 border border-sky-400/40 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Hidden File Input for Open Project */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json"
        onChange={handleOpenProjectJson}
        className="hidden"
      />

      {/* TOP ARCHITECTURAL TOOLBAR & PRESET BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 z-20">
        {/* Left: Presets & Plan Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Compass className="w-4 h-4 text-sky-400" />
            <select
              value={planData.id}
              onChange={(e) => {
                const found = ALL_FLOOR_PLAN_PRESETS.find((p) => p.id === e.target.value);
                if (found) {
                  setPlanData(found);
                  showToast(isKa ? `ჩაიტვირთა: ${found.name}` : `Loaded: ${found.name}`);
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="napr-cadastral-house" className="bg-slate-900 text-slate-200">
                {isKa ? 'საკადასტრო სახლი 01/1 (154.17 მ²)' : 'Cadastral House 01/1 (154.17 m²)'}
              </option>
              <option value="apartment-preset-standard" className="bg-slate-900 text-slate-200">
                {isKa ? '3-ოთახიანი თანამედროვე ბინა' : '3-Room Modern Apartment'}
              </option>
              <option value="blank-plan-blueprint" className="bg-slate-900 text-slate-200">
                {isKa ? '+ ახალი ცარიელი ტილო' : '+ New Blank Canvas'}
              </option>
            </select>
          </div>

          {/* Cadastral ID Badge */}
          {planData.cadastralCode && (
            <span className="hidden sm:inline-flex px-2 py-1 text-[11px] font-mono bg-sky-950/80 text-sky-300 border border-sky-800/60 rounded-lg">
              {planData.cadastralCode}
            </span>
          )}
        </div>

        {/* Center: Primary Mode Tools (Select, Wall, Door, Window, Measure, Conduit) */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
          <button
            id="tool-select"
            onClick={() => {
              setToolMode('SELECT');
              setDrawingStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolMode === 'SELECT'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={isKa ? 'მონიშვნა & გადაადგილება' : 'Select & Move'}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isKa ? 'მონიშვნა' : 'Select'}</span>
          </button>

          {/* DRAW ROOM TOOL BUTTON */}
          <button
            id="tool-draw-room"
            onClick={() => {
              setToolMode('DRAW_ROOM');
              setDrawingStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolMode === 'DRAW_ROOM' || toolMode === 'ROOM'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md ring-1 ring-sky-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
            title={isKa ? 'ოთახის ხაზვა (მაუსის გადატარებით ზონის მონიშვნა)' : 'Draw Room (Interactive Box Drag)'}
          >
            <Box className="w-3.5 h-3.5 text-sky-300" />
            <span>{isKa ? '📐 ოთახის ხაზვა' : '📐 Draw Room'}</span>
          </button>

          {/* QUICK ROOM STAMP DROPDOWN */}
          <div className="relative">
            <button
              id="btn-quick-room-menu"
              onClick={() => setIsQuickRoomMenuOpen(!isQuickRoomMenuOpen)}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
              title={isKa ? 'სწრაფი ოთახის შტამპები' : 'Quick Room Presets'}
            >
              <span>{selectedRoomPreset.icon}</span>
              <span className="hidden xl:inline">{isKa ? selectedRoomPreset.nameKa : selectedRoomPreset.nameEn}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isQuickRoomMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex justify-between items-center">
                  <span>{isKa ? 'სწრაფი ოთახები' : 'Room Presets'}</span>
                  <span className="text-[10px] text-sky-400">{isKa ? '1-კლიკით ჩასმა' : '1-click drop'}</span>
                </div>
                {ROOM_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleAddRoomPreset(preset)}
                    className="w-full px-2.5 py-2 hover:bg-slate-800 rounded-lg text-left flex items-center justify-between text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{preset.icon}</span>
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-sky-400">
                          {isKa ? preset.nameKa : preset.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {preset.defaultWidthM} × {preset.defaultHeightM} მ ({(preset.defaultWidthM * preset.defaultHeightM).toFixed(1)} მ²)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded group-hover:text-emerald-400 group-hover:bg-slate-900 border border-slate-800">
                      + {isKa ? 'ჩასმა' : 'Drop'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <button
            id="tool-wall-outer"
            onClick={() => {
              setToolMode('WALL_OUTER');
              setDrawingStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolMode === 'WALL_OUTER'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={isKa ? 'გარე კედელი (25სმ)' : 'Outer Wall (25cm)'}
          >
            <Square className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">{isKa ? 'გარე კედელი' : 'Outer Wall'}</span>
          </button>

          <button
            id="tool-wall-inner"
            onClick={() => {
              setToolMode('WALL_INNER');
              setDrawingStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolMode === 'WALL_INNER'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={isKa ? 'შიდა ტიხარი (12სმ)' : 'Partition Wall (12cm)'}
          >
            <PanelsTopLeft className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isKa ? 'ტიხარი' : 'Partition'}</span>
          </button>

          <button
            id="tool-door"
            onClick={() => {
              setToolMode('DOOR');
              setDrawingStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolMode === 'DOOR'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={isKa ? 'კარის ჩასმა (90სმ)' : 'Insert Door'}
          >
            <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isKa ? 'კარი' : 'Door'}</span>
          </button>

          <button
            id="tool-window"
            onClick={() => {
              setToolMode('WINDOW');
              setDrawingStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolMode === 'WINDOW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={isKa ? 'ფანჯრის ჩასმა' : 'Insert Window'}
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">{isKa ? 'ფანჯარა' : 'Window'}</span>
          </button>

          <button
            id="tool-conduit"
            onClick={() => {
              setToolMode('CONDUIT');
              setDrawingStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              toolMode === 'CONDUIT'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={isKa ? 'კაბელის ტრასის გაყვანა' : 'Conduit Routing'}
          >
            <Cable className="w-3.5 h-3.5 text-purple-400" />
            <span>{isKa ? 'ტრასა' : 'Conduit'}</span>
          </button>

          <button
            id="tool-measure"
            onClick={() => {
              setToolMode('MEASURE');
              setDrawingStart(null);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              toolMode === 'MEASURE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={isKa ? 'საზომი ლენტი (მანძილის გაზომვა)' : 'Measure Tape'}
          >
            <Ruler className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{isKa ? 'საზომი' : 'Measure'}</span>
          </button>
        </div>

        {/* Right: Upload Plan, CAD Export, Load Sync */}
        <div className="flex items-center gap-2">
          {/* Upload Background Plan Button */}
          <button
            id="btn-open-bg-modal"
            onClick={() => setIsBgModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{isKa ? 'ნახაზის ატვირთვა' : 'Upload Plan'}</span>
          </button>

          {/* Open Project File */}
          <button
            id="btn-open-json-file"
            onClick={() => jsonFileInputRef.current?.click()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title={isKa ? 'პროექტის გახსნა (.JSON)' : 'Open Project (.JSON)'}
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          {/* CAD / BIM / PDF Export Center Button */}
          <button
            id="btn-open-cad-export"
            onClick={() => setIsCadExportOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-900/30 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CAD / BIM / PDF</span>
          </button>

          {/* Sync to Circuit Schedule */}
          {onSyncToCircuitSchedule && (
            <button
              id="btn-sync-to-schedule"
              onClick={handleSyncLoads}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              title={isKa ? 'დატვირთვების ცხრილში გადატანა' : 'Sync to Load Schedule'}
            >
              <FolderSync className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isKa ? 'სინქრონიზაცია' : 'Sync Loads'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE ROOM DRAWING SUB-BAR (WHEN DRAW_ROOM OR ROOM MODE ACTIVE) */}
      {(toolMode === 'DRAW_ROOM' || toolMode === 'ROOM') && (
        <div className="px-4 py-2 bg-gradient-to-r from-sky-950/90 via-slate-900 to-indigo-950/90 border-b border-sky-500/30 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              {isKa ? 'ოთახის ხაზვის რეჟიმი:' : 'Room Drawing Mode:'}
            </span>

            {/* Room Type Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-sky-500/40">
              <span className="text-slate-400">{isKa ? 'ტიპი:' : 'Type:'}</span>
              <select
                value={selectedRoomPreset.id}
                onChange={(e) => {
                  const p = ROOM_PRESETS.find((r) => r.id === e.target.value);
                  if (p) setSelectedRoomPreset(p);
                }}
                className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer"
              >
                {ROOM_PRESETS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                    {p.icon} {isKa ? p.nameKa : p.nameEn} ({p.defaultWidthM} × {p.defaultHeightM} მ)
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Perimeter Wall Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={autoGenerateWallsOnRoom}
                onChange={(e) => setAutoGenerateWallsOnRoom(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-950 border-slate-700 focus:ring-sky-500"
              />
              <span className="font-medium">
                {isKa ? '🧱 კედლების ავტო-გენერირება (20სმ)' : '🧱 Auto-generate walls (20cm)'}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[11px]">
              {isKa
                ? '👉 დააჭირეთ და გადაატარეთ მაუსი ტილოზე ოთახის დასახაზად'
                : '👉 Click & drag on canvas to draw room'}
            </span>
            <button
              onClick={() => setToolMode('SELECT')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px]"
            >
              {isKa ? 'გამოსვლა' : 'Exit'}
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE: LEFT PALETTE + CENTER CANVAS + RIGHT INSPECTOR */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. LEFT SIDEBAR: DEVICES & ROOMS PALETTE */}
        <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
          {/* Main Sidebar Top Tabs: [Devices] vs [Rooms] */}
          <div className="p-2 border-b border-slate-800 grid grid-cols-2 gap-1 bg-slate-950/60">
            <button
              onClick={() => setSidebarTab('DEVICES')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                sidebarTab === 'DEVICES'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{isKa ? 'წერტილები' : 'Symbols'}</span>
            </button>
            <button
              onClick={() => setSidebarTab('ROOMS')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                sidebarTab === 'ROOMS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <PanelsTopLeft className="w-3.5 h-3.5" />
              <span>{isKa ? 'ოთახები' : 'Rooms'}</span>
            </button>
          </div>

          {sidebarTab === 'DEVICES' ? (
            <>
              {/* Palette Category Tabs */}
              <div className="p-3 border-b border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isKa ? 'ელექტრო წერტილები' : 'Electrical Symbols'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-sky-400 rounded-full font-mono">
                    IEC / GOST
                  </span>
                </div>

                {/* Category Filter Pills */}
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['ALL', isKa ? 'ყველა' : 'All'],
                      ['SWITCHES', isKa ? 'ჩამრთველი' : 'Switches'],
                      ['SOCKETS', isKa ? 'შტეფსელი' : 'Sockets'],
                      ['LIGHTING', isKa ? 'განათება' : 'Lighting'],
                      ['APPLIANCES', isKa ? 'ტექნიკა' : 'Appliances'],
                      ['DISTRIBUTION', isKa ? 'ფარი/კოლოფი' : 'Boards'],
                    ] as const
                  ).map(([cat, lbl]) => (
                    <button
                      key={cat}
                      onClick={() => setPaletteCategory(cat)}
                      className={`py-1 px-1.5 text-[10px] font-medium rounded-md truncate transition-colors ${
                        paletteCategory === cat
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Device Items Grid */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                {(Object.entries(DEVICE_DEFINITIONS) as [FloorPlanDeviceType, (typeof DEVICE_DEFINITIONS)[FloorPlanDeviceType]][])
                  .filter(([_, def]) => paletteCategory === 'ALL' || def.category === paletteCategory)
                  .map(([type, def]) => {
                    const isSelectedForPlacement = toolMode === 'PLACE' && pendingDeviceType === type;
                    return (
                      <div
                        key={type}
                        onClick={() => {
                          setPendingDeviceType(type);
                          setToolMode('PLACE');
                          showToast(
                            isKa
                              ? `დააკლიკეთ ნახაზზე ${def.labelKa}-ს ჩასასმელად`
                              : `Click canvas to place ${def.labelEn}`
                          );
                        }}
                        className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isSelectedForPlacement
                            ? 'bg-sky-950/70 border-sky-500 shadow-md ring-1 ring-sky-400'
                            : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner"
                          style={{ backgroundColor: `${def.color}20`, borderColor: `${def.color}50` }}
                        >
                          <FloorPlanDeviceIcon type={type} size={20} color={def.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {isKa ? def.labelKa : def.labelEn}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>h={def.defaultHeightCm}სმ</span>
                            {def.defaultPowerW > 0 && (
                              <span className="text-amber-400 font-mono">{def.defaultPowerW}W</span>
                            )}
                            <span className="text-sky-400 font-mono">{def.defaultCircuit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            /* ROOM PLANNER PALETTE */
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Freeform Draw Room Button */}
              <button
                onClick={() => {
                  setToolMode('DRAW_ROOM');
                  setDrawingStart(null);
                  showToast(
                    isKa
                      ? 'დააჭირეთ და გადაატარეთ მაუსი ტილოზე ოთახის დასახაზად'
                      : 'Click & drag on canvas to draw room'
                  );
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 transition-all"
              >
                <Box className="w-4 h-4" />
                <span>{isKa ? '📐 ოთახის თავისუფალი ხაზვა' : '📐 Draw Room on Canvas'}</span>
              </button>

              {/* Auto Wall Generation Option */}
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/60">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateWallsOnRoom}
                    onChange={(e) => setAutoGenerateWallsOnRoom(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 bg-slate-950 border-slate-700"
                  />
                  <span>{isKa ? 'კედლების ავტო-გენერირება' : 'Auto Perimeter Walls'}</span>
                </label>
              </div>

              {/* Room Presets Catalog */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {isKa ? 'ოთახების კატალოგი (1-კლიკით)' : 'Room Catalog (1-click)'}
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">{ROOM_PRESETS.length} ტიპი</span>
                </div>

                {ROOM_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-2.5 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl border border-slate-700/60 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{preset.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {isKa ? preset.nameKa : preset.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {preset.defaultWidthM} × {preset.defaultHeightM} მ •{' '}
                          <span className="text-emerald-400 font-mono font-semibold">
                            {(preset.defaultWidthM * preset.defaultHeightM).toFixed(1)} მ²
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddRoomPreset(preset)}
                      className="px-2.5 py-1 bg-sky-600/80 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                      title={isKa ? 'ტილოზე ჩასმა' : 'Place on canvas'}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isKa ? 'ჩასმა' : 'Drop'}</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Current Rooms in Project List */}
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {isKa ? 'პროექტის ოთახები' : 'Rooms in Plan'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {planData.rooms.length} ოთახი
                  </span>
                </div>

                {planData.rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setSelectedDeviceId(null);
                      setSelectedWallId(null);
                    }}
                    className={`p-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      selectedRoomId === room.id
                        ? 'bg-sky-950/80 border-sky-500 shadow-md'
                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border"
                        style={{ backgroundColor: room.color || '#0f172a', borderColor: '#38bdf8' }}
                      />
                      <span className="font-semibold text-slate-200 truncate">{room.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-sky-400 font-bold shrink-0">
                      {room.areaM2} m²
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick Room Add Button at Bottom of Sidebar */}
              <div className="pt-2">
                <button
                  onClick={() => setIsAddRoomOpen(true)}
                  className="w-full py-2 bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isKa ? '+ ზომების ხელით მითითება' : '+ Custom Room Dimensions'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. CENTER: ARCHITECTURAL & ELECTRICAL SVG CANVAS */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden flex flex-col">
          {/* Floating Canvas Overlay Controls (Zoom, Pan, Display Toggles) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={isKa ? 'გადიდება (+)' : 'Zoom In'}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] text-sky-400 min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={isKa ? 'დაპატარავება (-)' : 'Zoom Out'}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1.0);
                setPan({ x: 30, y: 30 });
              }}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={isKa ? 'მასშტაბის განულება' : 'Reset View'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            {/* Display Toggles */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg text-[11px] flex items-center gap-1 ${
                showGrid ? 'text-sky-400 bg-sky-950/60' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title={isKa ? 'ბადის ჩართვა/გამორთვა' : 'Toggle Grid'}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{isKa ? 'ბადე' : 'Grid'}</span>
            </button>

            <button
              onClick={() => setOrthoSnap(!orthoSnap)}
              className={`p-1.5 rounded-lg text-[11px] flex items-center gap-1 ${
                orthoSnap ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title={isKa ? 'ორთოგონალური ბმა (90° / 45°)' : 'Ortho Angle Lock'}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{isKa ? 'Ortho 90°' : 'Ortho'}</span>
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            {/* Magnetic Wire Routing Mode Quick Toggles */}
            <div className="flex items-center bg-slate-950/70 p-0.5 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setWireRoutingMode('WALL_SNAP')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  wireRoutingMode === 'WALL_SNAP'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isKa ? 'მაგნიტური მიბმა კედლებზე (90°)' : 'Magnetic Snap to Walls (90°)'}
              >
                <Magnet className="w-3 h-3 text-purple-300" />
                <span>{isKa ? 'კედელი 90°' : 'Wall 90°'}</span>
              </button>

              <button
                onClick={() => setWireRoutingMode('ORTHO_90')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  wireRoutingMode === 'ORTHO_90'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isKa ? 'ორთოგონალური ბადეზე მიბმა (90°)' : 'Orthogonal Grid Routing (90°)'}
              >
                <Square className="w-3 h-3 text-sky-300" />
                <span>{isKa ? 'ბადე 90°' : 'Grid 90°'}</span>
              </button>

              <button
                onClick={() => setWireRoutingMode('DIRECT')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  wireRoutingMode === 'DIRECT'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isKa ? 'პირდაპირი ხაზი' : 'Direct Line'}
              >
                <span>{isKa ? 'პირდაპირი' : 'Direct'}</span>
              </button>
            </div>
          </div>

          {/* Active Drawing Tool Hint Banner */}
          {(toolMode === 'WALL_OUTER' ||
            toolMode === 'WALL_INNER' ||
            toolMode === 'PLACE' ||
            toolMode === 'CONDUIT' ||
            toolMode === 'MEASURE') && (
            <div className="absolute top-4 right-4 z-20 px-3.5 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-xl flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300 font-medium">
                {toolMode === 'WALL_OUTER' &&
                  (drawingStart
                    ? isKa
                      ? 'დააკლიკეთ კედლის დასასრულებლად (ორმაგი კლიკი - მორჩენა)'
                      : 'Click to set wall end (Double click to finish)'
                    : isKa
                    ? 'დააკლიკეთ გარე კედლის დასაწყებად'
                    : 'Click to start outer wall')}
                {toolMode === 'WALL_INNER' &&
                  (drawingStart
                    ? isKa
                      ? 'დააკლიკეთ ტიხრის დასასრულებლად'
                      : 'Click to set partition wall end'
                    : isKa
                    ? 'დააკლიკეთ ტიხრის დასაწყებად'
                    : 'Click to start partition wall')}
                {toolMode === 'PLACE' &&
                  (isKa
                    ? `დააკლიკეთ ნახაზზე ${DEVICE_DEFINITIONS[pendingDeviceType]?.labelKa}-ს დასასმელად`
                    : `Click to place ${DEVICE_DEFINITIONS[pendingDeviceType]?.labelEn}`)}
                {toolMode === 'CONDUIT' &&
                  (conduitStartDeviceId
                    ? isKa
                      ? `აირჩიეთ სამიზნე წერტილი (რეჟიმი: ${
                          wireRoutingMode === 'WALL_SNAP'
                            ? '🧲 კედელზე მიბმა 90°'
                            : wireRoutingMode === 'ORTHO_90'
                            ? '📐 ბადე 90°'
                            : '📏 პირდაპირი'
                        })`
                      : `Select target device (${
                          wireRoutingMode === 'WALL_SNAP'
                            ? '🧲 Wall Snap 90°'
                            : wireRoutingMode === 'ORTHO_90'
                            ? '📐 Grid 90°'
                            : '📏 Direct'
                        })`
                    : isKa
                    ? 'აირჩიეთ საწყისი წერტილი ტრასის გასაყვანად'
                    : 'Click starting device for conduit')}
                {toolMode === 'MEASURE' &&
                  (drawingStart
                    ? isKa
                      ? 'დააკლიკეთ მეორე წერტილზე მანძილის გასაზომად'
                      : 'Click second point'
                    : isKa
                    ? 'დააკლიკეთ პირველ წერტილზე'
                    : 'Click first point')}
              </span>
              <button
                onClick={() => {
                  setToolMode('SELECT');
                  setDrawingStart(null);
                  setConduitStartDeviceId(null);
                  setActiveSnapResult(null);
                }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SVG Vector Drawing Canvas */}
          <div className="flex-1 w-full h-full cursor-crosshair relative">
            <svg
              ref={svgRef}
              id="blueprint-svg-root"
              className="w-full h-full block"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
            >
              <defs>
                {/* Architectural Metric Grid Pattern (1 meter = 45px, 0.2m minor subdivisions) */}
                <pattern id="cad-grid-minor" width="9" height="9" patternUnits="userSpaceOnUse">
                  <path d="M 9 0 L 0 0 0 9" fill="none" stroke="#1e293b" strokeWidth="0.4" />
                </pattern>
                <pattern id="cad-grid-major" width="45" height="45" patternUnits="userSpaceOnUse">
                  <rect width="45" height="45" fill="url(#cad-grid-minor)" />
                  <path d="M 45 0 L 0 0 0 45" fill="none" stroke="#334155" strokeWidth="0.8" />
                </pattern>

                {/* Diagonal Cadastral Grid Pattern (NAPR Style) */}
                <pattern id="napr-diagonal-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 0 20 L 20 0 M 0 0 L 20 20"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="0.5"
                    strokeOpacity="0.2"
                  />
                </pattern>

                {/* Wall Hatch Pattern */}
                <pattern id="wall-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#64748b" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Pan and Zoom Layer */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Background Blueprint Canvas */}
                <rect
                  id="blueprint-canvas-bg"
                  x="-2000"
                  y="-2000"
                  width="6000"
                  height="6000"
                  fill="#090d16"
                />

                {/* Grid Overlay */}
                {showGrid && (
                  <rect
                    id="cad-grid-pattern"
                    x="-2000"
                    y="-2000"
                    width="6000"
                    height="6000"
                    fill="url(#cad-grid-major)"
                  />
                )}

                {/* 1. TRACING BACKGROUND IMAGE LAYER (If Uploaded) */}
                {planData.backgroundImage && planData.backgroundImage.visible && (
                  <g
                    transform={`translate(${planData.backgroundImage.x}, ${planData.backgroundImage.y}) rotate(${
                      planData.backgroundImage.rotation
                    }) scale(${planData.backgroundImage.scale})`}
                    opacity={planData.backgroundImage.opacity}
                  >
                    <image
                      href={planData.backgroundImage.url}
                      x="0"
                      y="0"
                      width={planData.backgroundImage.naturalWidth || 800}
                      height={planData.backgroundImage.naturalHeight || 600}
                    />
                  </g>
                )}

                {/* 2. ROOM ZONES & POLYGONS */}
                {planData.rooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;
                  const roomDevs = planData.devices.filter(
                    (d) =>
                      d.x >= room.x &&
                      d.x <= room.x + room.width &&
                      d.y >= room.y &&
                      d.y <= room.y + room.height
                  );
                  const roomLoadW = roomDevs.reduce((sum, d) => sum + (d.powerW || 0), 0);

                  const scale = planData.scalePxPerMeter || 45;
                  const widthM = (room.width / scale).toFixed(2);
                  const heightM = (room.height / scale).toFixed(2);

                  return (
                    <g key={room.id} className="cursor-pointer group">
                      {/* Room Floor Background */}
                      <rect
                        x={room.x}
                        y={room.y}
                        width={room.width}
                        height={room.height}
                        fill={room.color || '#0f172a'}
                        fillOpacity={isSelected ? '0.5' : '0.35'}
                        stroke={isSelected ? '#38bdf8' : '#334155'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        strokeDasharray={isSelected ? '6 3' : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoomId(room.id);
                          setSelectedDeviceId(null);
                          setSelectedWallId(null);
                          setSelectedRouteId(null);
                        }}
                      />

                      {/* Dimension lines & measurements for Selected Room */}
                      {isSelected && (
                        <g className="pointer-events-none">
                          {/* Top Width Dimension */}
                          <g transform={`translate(${room.x + room.width / 2}, ${room.y - 12})`}>
                            <rect
                              x="-32"
                              y="-9"
                              width="64"
                              height="18"
                              rx="4"
                              fill="#0f172a"
                              stroke="#38bdf8"
                              strokeWidth="1"
                            />
                            <text
                              x="0"
                              y="3.5"
                              fill="#38bdf8"
                              fontSize="9.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              ↔ {widthM} მ
                            </text>
                          </g>

                          {/* Right Height Dimension */}
                          <g transform={`translate(${room.x + room.width + 12}, ${room.y + room.height / 2})`}>
                            <rect
                              x="-6"
                              y="-9"
                              width="58"
                              height="18"
                              rx="4"
                              fill="#0f172a"
                              stroke="#38bdf8"
                              strokeWidth="1"
                            />
                            <text
                              x="23"
                              y="3.5"
                              fill="#38bdf8"
                              fontSize="9.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              ↕ {heightM} მ
                            </text>
                          </g>
                        </g>
                      )}

                      {/* Room Label, Area & Load Badge */}
                      <g
                        transform={`translate(${room.x + room.width / 2}, ${room.y + room.height / 2})`}
                        className="pointer-events-none select-none"
                      >
                        <rect
                          x="-55"
                          y="-24"
                          width="110"
                          height="48"
                          rx="8"
                          fill="#090d16"
                          fillOpacity="0.85"
                          stroke={isSelected ? '#38bdf8' : '#334155'}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="-8"
                          fill="#f8fafc"
                          fontSize="11.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {room.name}
                        </text>
                        <text
                          x="0"
                          y="6"
                          fill="#38bdf8"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {room.areaM2} m²
                        </text>
                        <text
                          x="0"
                          y="18"
                          fill={roomDevs.length > 0 ? '#10b981' : '#64748b'}
                          fontSize="8.5"
                          fontWeight="semibold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {roomDevs.length > 0
                            ? `${(roomLoadW / 1000).toFixed(1)} kW • ${roomDevs.length} წერტ.`
                            : isKa ? 'ცარიელი' : 'Empty'}
                        </text>
                      </g>

                      {/* Selected Room Interactive Resize Handles (8 directions) */}
                      {isSelected && (
                        <g>
                          {/* NW */}
                          <circle
                            cx={room.x}
                            cy={room.y}
                            r="6"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-nwse-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 'nw',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />
                          {/* NE */}
                          <circle
                            cx={room.x + room.width}
                            cy={room.y}
                            r="6"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-nesw-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 'ne',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />
                          {/* SE */}
                          <circle
                            cx={room.x + room.width}
                            cy={room.y + room.height}
                            r="6"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-nwse-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 'se',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />
                          {/* SW */}
                          <circle
                            cx={room.x}
                            cy={room.y + room.height}
                            r="6"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-nesw-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 'sw',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />
                          {/* N (Top edge) */}
                          <rect
                            x={room.x + room.width / 2 - 8}
                            y={room.y - 4}
                            width="16"
                            height="8"
                            rx="2"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-ns-resize hover:scale-110 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 'n',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />
                          {/* S (Bottom edge) */}
                          <rect
                            x={room.x + room.width / 2 - 8}
                            y={room.y + room.height - 4}
                            width="16"
                            height="8"
                            rx="2"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-ns-resize hover:scale-110 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 's',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />
                          {/* E (Right edge) */}
                          <rect
                            x={room.x + room.width - 4}
                            y={room.y + room.height / 2 - 8}
                            width="8"
                            height="16"
                            rx="2"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-ew-resize hover:scale-110 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 'e',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />
                          {/* W (Left edge) */}
                          <rect
                            x={room.x - 4}
                            y={room.y + room.height / 2 - 8}
                            width="8"
                            height="16"
                            rx="2"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-ew-resize hover:scale-110 transition-transform"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setResizingRoom({
                                roomId: room.id,
                                handle: 'w',
                                startMouseX: coords.x,
                                startMouseY: coords.y,
                                origX: room.x,
                                origY: room.y,
                                origW: room.width,
                                origH: room.height,
                              });
                            }}
                          />

                          {/* Quick Floating Action Bar on Canvas for Selected Room */}
                          <g transform={`translate(${room.x + room.width / 2}, ${room.y - 34})`}>
                            {/* Backdrop pill */}
                            <rect
                              x="-140"
                              y="-14"
                              width="280"
                              height="28"
                              rx="14"
                              fill="#090d16"
                              fillOpacity="0.95"
                              stroke="#38bdf8"
                              strokeWidth="1"
                              className="shadow-xl"
                            />
                            {/* Auto Equip Button */}
                            <g
                              transform="translate(-100, 0)"
                              className="cursor-pointer hover:opacity-80"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoEquipSelectedRoom();
                              }}
                            >
                              <text
                                x="0"
                                y="4"
                                fill="#38bdf8"
                                fontSize="9.5"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                🪄 {isKa ? 'აღჭურვა' : 'Equip'}
                              </text>
                            </g>
                            <line x1="-55" y1="-8" x2="-55" y2="8" stroke="#334155" />
                            {/* Auto Route Button */}
                            <g
                              transform="translate(-15, 0)"
                              className="cursor-pointer hover:opacity-80"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoRouteSelectedRoom();
                              }}
                            >
                              <text
                                x="0"
                                y="4"
                                fill="#a855f7"
                                fontSize="9.5"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                ⚡ {isKa ? 'ტრასები' : 'Route'}
                              </text>
                            </g>
                            <line x1="25" y1="-8" x2="25" y2="8" stroke="#334155" />
                            {/* Generate Walls Button */}
                            <g
                              transform="translate(60, 0)"
                              className="cursor-pointer hover:opacity-80"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateWallsForSelectedRoom();
                              }}
                            >
                              <text
                                x="0"
                                y="4"
                                fill="#f59e0b"
                                fontSize="9.5"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                🧱 {isKa ? 'კედლები' : 'Walls'}
                              </text>
                            </g>
                            <line x1="100" y1="-8" x2="100" y2="8" stroke="#334155" />
                            {/* Delete Room Button */}
                            <g
                              transform="translate(120, 0)"
                              className="cursor-pointer hover:opacity-80"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSelectedRoom();
                              }}
                            >
                              <text
                                x="0"
                                y="4"
                                fill="#ef4444"
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                🗑️
                              </text>
                            </g>
                          </g>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 3. ARCHITECTURAL WALLS (Double lines with thickness) */}
                {(planData.walls || []).map((wall) => {
                  const isSelected = selectedWallId === wall.id;
                  const dx = wall.endX - wall.startX;
                  const dy = wall.endY - wall.startY;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  const wallThickPx = (wall.thicknessCm / 100) * planData.scalePxPerMeter;

                  // Normal vector for double line thickness
                  const nx = len > 0 ? (-dy / len) * (wallThickPx / 2) : 0;
                  const ny = len > 0 ? (dx / len) * (wallThickPx / 2) : 0;

                  const p1x = wall.startX + nx;
                  const p1y = wall.startY + ny;
                  const p2x = wall.endX + nx;
                  const p2y = wall.endY + ny;
                  const p3x = wall.endX - nx;
                  const p3y = wall.endY - ny;
                  const p4x = wall.startX - nx;
                  const p4y = wall.startY - ny;

                  const wallLengthM = (len / planData.scalePxPerMeter).toFixed(2);

                  return (
                    <g
                      key={wall.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toolMode === 'DELETE') {
                          deleteWall(wall.id);
                          return;
                        }
                        setSelectedWallId(wall.id);
                        setSelectedDeviceId(null);
                        setSelectedDoorId(null);
                        setSelectedWindowId(null);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Wall Solid Body */}
                      <polygon
                        points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`}
                        fill={wall.isOuter ? '#1e293b' : '#0f172a'}
                        stroke={
                          isSelected ? '#38bdf8' : wall.isOuter ? '#64748b' : '#475569'
                        }
                        strokeWidth={isSelected ? '2' : '1.5'}
                      />

                      {/* Wall Outer Hatch */}
                      {wall.isOuter && (
                        <polygon
                          points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`}
                          fill="url(#wall-hatch)"
                          opacity="0.3"
                          className="pointer-events-none"
                        />
                      )}

                      {/* Dimension Text on Wall */}
                      {showDimensions && len > 40 && (
                        <text
                          x={(wall.startX + wall.endX) / 2}
                          y={(wall.startY + wall.endY) / 2 - 6}
                          fill={isSelected ? '#38bdf8' : '#94a3b8'}
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                        >
                          {wallLengthM} m
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* 4. ARCHITECTURAL DOORS */}
                {(planData.doors || []).map((door) => {
                  const isSelected = selectedDoorId === door.id;
                  const dWidthPx = (door.widthCm / 100) * planData.scalePxPerMeter;

                  return (
                    <g
                      key={door.id}
                      transform={`translate(${door.x}, ${door.y}) rotate(${door.rotation})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toolMode === 'DELETE') {
                          deleteDoor(door.id);
                          return;
                        }
                        setSelectedDoorId(door.id);
                      }}
                      className="cursor-pointer"
                    >
                      {/* Door Leaf */}
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2={-dWidthPx}
                        stroke={isSelected ? '#38bdf8' : '#38bdf8'}
                        strokeWidth="2.5"
                      />
                      {/* Door Swing Arc */}
                      <path
                        d={`M 0 0 A ${dWidthPx} ${dWidthPx} 0 0 1 ${dWidthPx} 0`}
                        fill="none"
                        stroke={isSelected ? '#38bdf8' : '#0284c7'}
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.8"
                      />
                      {/* Frame Points */}
                      <rect x="-3" y="-3" width="6" height="6" fill="#f8fafc" />
                      <rect x={dWidthPx - 3} y="-3" width="6" height="6" fill="#f8fafc" />
                    </g>
                  );
                })}

                {/* 5. ARCHITECTURAL WINDOWS */}
                {(planData.windows || []).map((win) => {
                  const isSelected = selectedWindowId === win.id;
                  const wWidthPx = (win.widthCm / 100) * planData.scalePxPerMeter;

                  return (
                    <g
                      key={win.id}
                      transform={`translate(${win.x}, ${win.y}) rotate(${win.rotation})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toolMode === 'DELETE') {
                          deleteWindow(win.id);
                          return;
                        }
                        setSelectedWindowId(win.id);
                      }}
                      className="cursor-pointer"
                    >
                      {/* Window Sill Box */}
                      <rect
                        x={-wWidthPx / 2}
                        y="-6"
                        width={wWidthPx}
                        height="12"
                        fill="#0f172a"
                        stroke={isSelected ? '#38bdf8' : '#3b82f6'}
                        strokeWidth="1.5"
                      />
                      {/* Window Glass Glazing Lines */}
                      <line
                        x1={-wWidthPx / 2}
                        y1="-2"
                        x2={wWidthPx / 2}
                        y2="-2"
                        stroke="#60a5fa"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={-wWidthPx / 2}
                        y1="2"
                        x2={wWidthPx / 2}
                        y2="2"
                        stroke="#60a5fa"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

                {/* 6. CONDUITS & CABLE ROUTES (CAD 90-Degree Orthogonal & Magnetic Wall Paths) */}
                {showConduits &&
                  planData.wireRoutes.map((route) => {
                    const fromDev = planData.devices.find((d) => d.id === route.fromDeviceId);
                    const toDev = planData.devices.find((d) => d.id === route.toDeviceId);
                    if (!fromDev || !toDev) return null;

                    const isSelected = selectedRouteId === route.id;
                    const strokeDash =
                      route.lineStyle === 'dashed'
                        ? '6 4'
                        : route.lineStyle === 'dotted'
                        ? '2 3'
                        : undefined;

                    // Resolve waypoints: use precomputed waypoints or calculate clean 90-degree route
                    const waypoints =
                      route.waypoints && route.waypoints.length >= 2
                        ? route.waypoints
                        : calculateWireRoute(
                            { x: fromDev.x, y: fromDev.y },
                            { x: toDev.x, y: toDev.y },
                            route.routingMode || 'WALL_SNAP',
                            planData.walls || [],
                            planData.rooms || [],
                            planData.scalePxPerMeter || 45,
                            planData.gridSnapPx || 10
                          ).waypoints;

                    const pathD = generateCADPathData(waypoints, 8);
                    const midPt = getRouteMidpoint(waypoints);

                    return (
                      <g
                        key={route.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (toolMode === 'DELETE') {
                            setPlanData((prev) => ({
                              ...prev,
                              wireRoutes: prev.wireRoutes.filter((r) => r.id !== route.id),
                            }));
                            if (selectedRouteId === route.id) setSelectedRouteId(null);
                            return;
                          }
                          setSelectedRouteId(route.id);
                          setSelectedDeviceId(null);
                          setSelectedWallId(null);
                          setSelectedDoorId(null);
                          setSelectedWindowId(null);
                          setSelectedRoomId(null);
                        }}
                        className="cursor-pointer group"
                      >
                        {/* Invisible thick hit area for easy selection */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="14"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Selection glow backdrop */}
                        {isSelected && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="8"
                            strokeOpacity="0.45"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Main 90-degree CAD Wire Route Path */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={isSelected ? '#ffffff' : route.color || '#3b82f6'}
                          strokeWidth={isSelected ? '3' : '2'}
                          strokeDasharray={strokeDash}
                          strokeOpacity={isSelected ? 1.0 : 0.88}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Bend corner junction beads */}
                        {waypoints.slice(1, -1).map((pt, pIdx) => (
                          <circle
                            key={pIdx}
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected ? 3.5 : 2.5}
                            fill={isSelected ? '#ffffff' : route.color || '#3b82f6'}
                            stroke="#0f172a"
                            strokeWidth="1"
                            className="pointer-events-none"
                          />
                        ))}

                        {/* Circuit & Specification Badge at Route Midpoint */}
                        <g
                          transform={`translate(${midPt.x}, ${midPt.y})`}
                          className="pointer-events-none transition-transform group-hover:scale-110"
                        >
                          <rect
                            x="-16"
                            y="-7"
                            width="32"
                            height="14"
                            rx="3"
                            fill="#0f172a"
                            fillOpacity="0.95"
                            stroke={isSelected ? '#38bdf8' : route.color || '#3b82f6'}
                            strokeWidth={isSelected ? '1.2' : '0.6'}
                          />
                          <text
                            x="0"
                            y="3"
                            fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {route.circuitCode}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                {/* 7. ELECTRICAL DEVICES (Switches, Sockets, Lighting, DB Board) */}
                {planData.devices.map((dev) => {
                  const isSelected = selectedDeviceId === dev.id;
                  const isConduitSource = conduitStartDeviceId === dev.id;
                  const isHoveredTarget = hoveredDeviceId === dev.id && toolMode === 'CONDUIT';
                  const def = DEVICE_DEFINITIONS[dev.type];

                  return (
                    <g
                      key={dev.id}
                      transform={`translate(${dev.x}, ${dev.y}) rotate(${dev.rotation})`}
                      onMouseDown={(e) => handleDeviceClick(e, dev)}
                      onMouseEnter={() => setHoveredDeviceId(dev.id)}
                      onMouseLeave={() => setHoveredDeviceId(null)}
                      className="cursor-pointer"
                    >
                      {/* Selection / Conduit Glow Halo */}
                      {(isSelected || isConduitSource || isHoveredTarget) && (
                        <circle
                          r="22"
                          fill={isConduitSource ? '#a855f7' : isHoveredTarget ? '#10b981' : '#38bdf8'}
                          fillOpacity="0.25"
                          stroke={isConduitSource ? '#a855f7' : isHoveredTarget ? '#10b981' : '#38bdf8'}
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Device SVG Symbol */}
                      <g transform="translate(-14, -14)">
                        <FloorPlanDeviceIcon
                          type={dev.type}
                          size={28}
                          color={def?.color || '#f59e0b'}
                        />
                      </g>

                      {/* Device Circuit Code & Label Badge */}
                      {showCircuitTags && (
                        <g transform="translate(16, -10)" className="pointer-events-none">
                          <rect
                            x="-2"
                            y="-9"
                            width="34"
                            height="13"
                            rx="3"
                            fill="#0f172a"
                            fillOpacity="0.9"
                            stroke="#334155"
                            strokeWidth="0.5"
                          />
                          <text
                            x="15"
                            y="1"
                            fill="#38bdf8"
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {dev.circuitCode}
                          </text>
                        </g>
                      )}

                      {/* Mounting Height Badge */}
                      {showHeights && dev.heightCm && (
                        <g transform="translate(16, 6)" className="pointer-events-none">
                          <text
                            x="0"
                            y="2"
                            fill="#fbbf24"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            h={dev.heightCm}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 8. INTERACTIVE PREVIEW WHEN ROUTING CONDUIT WITH MAGNETIC SNAP */}
                {toolMode === 'CONDUIT' && conduitStartDeviceId && activeSnapResult && (
                  <g className="pointer-events-none">
                    {/* Magnetic Snap Guidelines along Walls */}
                    {(activeSnapResult.guideLines || []).map((gl, gIdx) => (
                      <g key={gIdx}>
                        <line
                          x1={gl.x1}
                          y1={gl.y1}
                          x2={gl.x2}
                          y2={gl.y2}
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          strokeOpacity="0.8"
                        />
                        {gl.label && (
                          <text
                            x={(gl.x1 + gl.x2) / 2}
                            y={(gl.y1 + gl.y2) / 2 - 4}
                            fill="#38bdf8"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {gl.label}
                          </text>
                        )}
                      </g>
                    ))}

                    {/* Rubberband 90-Degree CAD Wire Path */}
                    <path
                      d={generateCADPathData(activeSnapResult.waypoints, 8)}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="3.5"
                      strokeOpacity="0.9"
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-pulse"
                    />

                    {/* Intermediate Waypoint Dots */}
                    {activeSnapResult.waypoints.map((pt, pIdx) => (
                      <circle
                        key={pIdx}
                        cx={pt.x}
                        cy={pt.y}
                        r={pIdx === 0 || pIdx === activeSnapResult.waypoints.length - 1 ? 5 : 4}
                        fill={pIdx === 0 ? '#a855f7' : '#38bdf8'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}

                    {/* Live Length and Snap Indicator Badge */}
                    {currentMousePos && (
                      <g transform={`translate(${currentMousePos.x + 16}, ${currentMousePos.y - 18})`}>
                        <rect
                          x="-6"
                          y="-13"
                          width="125"
                          height="24"
                          rx="6"
                          fill="#0f172a"
                          fillOpacity="0.95"
                          stroke={activeSnapResult.snapType === 'WALL' ? '#c084fc' : '#38bdf8'}
                          strokeWidth="1"
                        />
                        <text
                          x="5"
                          y="3"
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {activeSnapResult.snapType === 'WALL'
                            ? `🧲 კედელი: ${activeSnapResult.lengthMeters.toFixed(2)}მ`
                            : activeSnapResult.snapType === 'ORTHO_GRID'
                            ? `📐 ბადე: ${activeSnapResult.lengthMeters.toFixed(2)}მ`
                            : `📏 ${activeSnapResult.lengthMeters.toFixed(2)}მ`}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* 8. INTERACTIVE PREVIEW WHEN DRAWING WALL OR MEASURING */}
                {drawingStart && currentMousePos && (toolMode === 'WALL_OUTER' || toolMode === 'WALL_INNER' || toolMode === 'MEASURE') && (
                  <g className="pointer-events-none">
                    <line
                      x1={drawingStart.x}
                      y1={drawingStart.y}
                      x2={currentMousePos.x}
                      y2={currentMousePos.y}
                      stroke={toolMode === 'MEASURE' ? '#10b981' : '#38bdf8'}
                      strokeWidth="2.5"
                      strokeDasharray={toolMode === 'MEASURE' ? '4 3' : undefined}
                    />
                    <circle cx={drawingStart.x} cy={drawingStart.y} r="5" fill="#38bdf8" />
                    <circle cx={currentMousePos.x} cy={currentMousePos.y} r="5" fill="#38bdf8" />

                    {/* Real-time Length Badge */}
                    <g
                      transform={`translate(${(drawingStart.x + currentMousePos.x) / 2}, ${
                        (drawingStart.y + currentMousePos.y) / 2 - 14
                      })`}
                    >
                      <rect
                        x="-30"
                        y="-10"
                        width="60"
                        height="18"
                        rx="4"
                        fill="#0284c7"
                        stroke="#bae6fd"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {(
                          Math.hypot(
                            currentMousePos.x - drawingStart.x,
                            currentMousePos.y - drawingStart.y
                          ) / planData.scalePxPerMeter
                        ).toFixed(2)}{' '}
                        m
                      </text>
                    </g>
                  </g>
                )}

                {/* 8B. INTERACTIVE PREVIEW WHEN DRAWING ROOM ZONE */}
                {drawingStart && currentMousePos && (toolMode === 'DRAW_ROOM' || toolMode === 'ROOM') && (
                  <g className="pointer-events-none">
                    {(() => {
                      const minX = Math.min(drawingStart.x, currentMousePos.x);
                      const minY = Math.min(drawingStart.y, currentMousePos.y);
                      const width = Math.abs(currentMousePos.x - drawingStart.x);
                      const height = Math.abs(currentMousePos.y - drawingStart.y);
                      const scale = planData.scalePxPerMeter || 45;
                      const widthM = (width / scale).toFixed(2);
                      const heightM = (height / scale).toFixed(2);
                      const areaM2 = ((width / scale) * (height / scale)).toFixed(2);

                      return (
                        <g>
                          {/* Room Boundary Box */}
                          <rect
                            x={minX}
                            y={minY}
                            width={width}
                            height={height}
                            fill={selectedRoomPreset.color || '#38bdf8'}
                            fillOpacity="0.35"
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                            strokeDasharray="6 3"
                            className="animate-pulse"
                          />

                          {/* 4 Corner Markers */}
                          <circle cx={minX} cy={minY} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx={minX + width} cy={minY} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx={minX + width} cy={minY + height} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx={minX} cy={minY + height} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />

                          {/* Width Callout */}
                          <g transform={`translate(${minX + width / 2}, ${minY - 12})`}>
                            <rect x="-35" y="-10" width="70" height="20" rx="4" fill="#090d16" stroke="#38bdf8" strokeWidth="1" />
                            <text x="0" y="4" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                              ↔ {widthM} მ
                            </text>
                          </g>

                          {/* Height Callout */}
                          <g transform={`translate(${minX + width + 14}, ${minY + height / 2})`}>
                            <rect x="-6" y="-10" width="65" height="20" rx="4" fill="#090d16" stroke="#38bdf8" strokeWidth="1" />
                            <text x="26" y="4" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                              ↕ {heightM} მ
                            </text>
                          </g>

                          {/* Center Floating Badge */}
                          <g transform={`translate(${minX + width / 2}, ${minY + height / 2})`}>
                            <rect x="-65" y="-22" width="130" height="44" rx="8" fill="#090d16" fillOpacity="0.95" stroke="#38bdf8" strokeWidth="1.5" />
                            <text x="0" y="-4" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">
                              {selectedRoomPreset.icon} {isKa ? selectedRoomPreset.nameKa : selectedRoomPreset.nameEn}
                            </text>
                            <text x="0" y="14" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                              {areaM2} m²
                            </text>
                          </g>
                        </g>
                      );
                    })()}
                  </g>
                )}
              </g>
            </svg>
          </div>
        </div>

        {/* 3. RIGHT SIDEBAR: INSPECTOR & BILL OF MATERIALS */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-10 overflow-y-auto">
          {/* Header Summary */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isKa ? 'პროექტის მაჩვენებლები' : 'Project Summary'}
              </span>
              <span className="px-2 py-0.5 text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full">
                1:50 Metric
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">{isKa ? 'ჯამური სიმძლავრე' : 'Total Power'}</span>
                <span className="text-amber-400 font-bold font-mono text-sm">
                  {(totalInstalledPowerW / 1000).toFixed(2)} kW
                </span>
              </div>
              <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">{isKa ? 'კაბელის მეტრაჟი' : 'Cable Length'}</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  ~ {totalCableMeters.toFixed(0)} m
                </span>
              </div>
            </div>
          </div>

          {/* Selected Element Property Editor */}
          {selectedRoom ? (
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-800/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedRoom.color || '#38bdf8' }}
                  />
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    {isKa ? 'ოთახის ინსპექტორი' : 'Room Inspector'}
                  </span>
                </div>
                <button
                  onClick={handleDeleteSelectedRoom}
                  className="p-1.5 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                  title={isKa ? 'ოთახის წაშლა' : 'Delete Room'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Room Name */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">{isKa ? 'ოთახის სახელი' : 'Room Name'}</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) =>
                    setPlanData((prev) => ({
                      ...prev,
                      rooms: prev.rooms.map((r) =>
                        r.id === selectedRoom.id ? { ...r, name: e.target.value } : r
                      ),
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>

              {/* Dimensions (Width & Height in meters) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isKa ? 'სიგანე (მ)' : 'Width (m)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={((selectedRoom.width || 0) / (planData.scalePxPerMeter || 45)).toFixed(2)}
                    onChange={(e) => {
                      const newWM = parseFloat(e.target.value) || 1;
                      const scale = planData.scalePxPerMeter || 45;
                      const newW = newWM * scale;
                      const newArea = ((newW / scale) * (selectedRoom.height / scale)).toFixed(1);
                      setPlanData((prev) => ({
                        ...prev,
                        rooms: prev.rooms.map((r) =>
                          r.id === selectedRoom.id ? { ...r, width: newW, areaM2: parseFloat(newArea) } : r
                        ),
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isKa ? 'სიგრძე (მ)' : 'Height (m)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={((selectedRoom.height || 0) / (planData.scalePxPerMeter || 45)).toFixed(2)}
                    onChange={(e) => {
                      const newHM = parseFloat(e.target.value) || 1;
                      const scale = planData.scalePxPerMeter || 45;
                      const newH = newHM * scale;
                      const newArea = ((selectedRoom.width / scale) * (newH / scale)).toFixed(1);
                      setPlanData((prev) => ({
                        ...prev,
                        rooms: prev.rooms.map((r) =>
                          r.id === selectedRoom.id ? { ...r, height: newH, areaM2: parseFloat(newArea) } : r
                        ),
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-400 font-mono"
                  />
                </div>
              </div>

              {/* Area & Electrical Load Summary */}
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-700/60 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">{isKa ? 'ფართობი' : 'Area'}</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">{selectedRoom.areaM2} m²</span>
                </div>
                {(() => {
                  const roomDevs = planData.devices.filter(
                    (d) =>
                      d.x >= selectedRoom.x &&
                      d.x <= selectedRoom.x + selectedRoom.width &&
                      d.y >= selectedRoom.y &&
                      d.y <= selectedRoom.y + selectedRoom.height
                  );
                  const roomLoadW = roomDevs.reduce((sum, d) => sum + (d.powerW || 0), 0);
                  return (
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">{isKa ? 'სიმძლავრე / წერტილები' : 'Load / Devices'}</span>
                      <span className="font-mono text-amber-400 font-bold text-sm">
                        {(roomLoadW / 1000).toFixed(2)} kW ({roomDevs.length} წერტ.)
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* 1-Click Automation Buttons */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={handleAutoEquipSelectedRoom}
                  className="w-full py-2 px-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isKa ? '🪄 ელექტრო აღჭურვა სტანდარტით' : 'Auto-Equip Standard Devices'}</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleAutoRouteSelectedRoom}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-purple-900/50 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Cable className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isKa ? '⚡ ტრასების გაყვანა' : 'Auto Routes'}</span>
                  </button>
                  <button
                    onClick={handleGenerateWallsForSelectedRoom}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-amber-900/50 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <PanelsTopLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isKa ? '🧱 კედლების შემოვლება' : 'Perimeter Walls'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : selectedDevice ? (
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-800/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  {isKa ? 'მონიშნული წერტილი' : 'Device Inspector'}
                </span>
                <button
                  onClick={() => deleteDevice(selectedDevice.id)}
                  className="p-1.5 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                  title={isKa ? 'წერტილის წაშლა' : 'Delete Device'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">{isKa ? 'დასახელება' : 'Name'}</label>
                <input
                  type="text"
                  value={selectedDevice.customName}
                  onChange={(e) =>
                    setPlanData((prev) => ({
                      ...prev,
                      devices: prev.devices.map((d) =>
                        d.id === selectedDevice.id ? { ...d, customName: e.target.value } : d
                      ),
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isKa ? 'ჯგუფი (Circuit)' : 'Circuit'}</label>
                  <input
                    type="text"
                    value={selectedDevice.circuitCode}
                    onChange={(e) =>
                      setPlanData((prev) => ({
                        ...prev,
                        devices: prev.devices.map((d) =>
                          d.id === selectedDevice.id ? { ...d, circuitCode: e.target.value } : d
                        ),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isKa ? 'სიმაღლე (სმ)' : 'Height (cm)'}</label>
                  <input
                    type="number"
                    value={selectedDevice.heightCm}
                    onChange={(e) =>
                      setPlanData((prev) => ({
                        ...prev,
                        devices: prev.devices.map((d) =>
                          d.id === selectedDevice.id
                            ? { ...d, heightCm: parseInt(e.target.value, 10) || 0 }
                            : d
                        ),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {isKa ? 'მობრუნება (კუთხე)' : 'Rotation'}
                </label>
                <div className="flex gap-1.5">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() =>
                        setPlanData((prev) => ({
                          ...prev,
                          devices: prev.devices.map((d) =>
                            d.id === selectedDevice.id ? { ...d, rotation: deg } : d
                          ),
                        }))
                      }
                      className={`flex-1 py-1 text-xs font-mono rounded-lg border ${
                        selectedDevice.rotation === deg
                          ? 'bg-sky-600 text-white border-sky-500'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedWall ? (
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-800/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  {isKa ? 'მონიშნული კედელი' : 'Wall Inspector'}
                </span>
                <button
                  onClick={() => deleteWall(selectedWall.id)}
                  className="p-1.5 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <p>
                  <span className="text-slate-400">{isKa ? 'სიგრძე:' : 'Length:'}</span>{' '}
                  <strong className="text-sky-400">
                    {(
                      Math.hypot(
                        selectedWall.endX - selectedWall.startX,
                        selectedWall.endY - selectedWall.startY
                      ) / planData.scalePxPerMeter
                    ).toFixed(2)}{' '}
                    მეტრი
                  </strong>
                </p>
                <p>
                  <span className="text-slate-400">{isKa ? 'სისქე:' : 'Thickness:'}</span>{' '}
                  <strong>{selectedWall.thicknessCm} სმ</strong>
                </p>
                <p>
                  <span className="text-slate-400">{isKa ? 'ტიპი:' : 'Type:'}</span>{' '}
                  <strong>{selectedWall.isOuter ? (isKa ? 'გარე კედელი' : 'Outer Wall') : (isKa ? 'შიდა ტიხარი' : 'Partition')}</strong>
                </p>
              </div>
            </div>
          ) : selectedRoute ? (
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-800/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: selectedRoute.color || '#3b82f6' }}
                  />
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    {isKa ? 'კაბელის ტრასა' : 'Conduit Inspector'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPlanData((prev) => ({
                      ...prev,
                      wireRoutes: prev.wireRoutes.filter((r) => r.id !== selectedRoute.id),
                    }));
                    setSelectedRouteId(null);
                  }}
                  className="p-1.5 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                  title={isKa ? 'ტრასის წაშლა' : 'Delete Route'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Connected Endpoints */}
              <div className="text-xs p-2 bg-slate-950/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300 font-medium truncate">
                  {planData.devices.find((d) => d.id === selectedRoute.fromDeviceId)?.label || 'A'}
                </span>
                <span className="text-purple-400 font-mono font-bold px-1">⟷</span>
                <span className="text-slate-300 font-medium truncate">
                  {planData.devices.find((d) => d.id === selectedRoute.toDeviceId)?.label || 'B'}
                </span>
              </div>

              {/* Circuit Code & Cable Spec */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isKa ? 'ჯგუფი (Circuit)' : 'Circuit'}
                  </label>
                  <input
                    type="text"
                    value={selectedRoute.circuitCode}
                    onChange={(e) =>
                      setPlanData((prev) => ({
                        ...prev,
                        wireRoutes: prev.wireRoutes.map((r) =>
                          r.id === selectedRoute.id ? { ...r, circuitCode: e.target.value } : r
                        ),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isKa ? 'სპეციფიკაცია' : 'Cable Spec'}
                  </label>
                  <input
                    type="text"
                    value={selectedRoute.cableSpec}
                    onChange={(e) =>
                      setPlanData((prev) => ({
                        ...prev,
                        wireRoutes: prev.wireRoutes.map((r) =>
                          r.id === selectedRoute.id ? { ...r, cableSpec: e.target.value } : r
                        ),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Routing Mode Selector */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {isKa ? 'ტრასის გაყვანის რეჟიმი' : 'Routing Algorithm'}
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { mode: 'WALL_SNAP' as WireRoutingMode, labelKa: '🧲 კედელი 90°', labelEn: 'Wall 90°' },
                    { mode: 'ORTHO_90' as WireRoutingMode, labelKa: '📐 ბადე 90°', labelEn: 'Grid 90°' },
                    { mode: 'DIRECT' as WireRoutingMode, labelKa: '📏 პირდაპირი', labelEn: 'Direct' },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      onClick={() => {
                        const fromDev = planData.devices.find((d) => d.id === selectedRoute.fromDeviceId);
                        const toDev = planData.devices.find((d) => d.id === selectedRoute.toDeviceId);
                        if (fromDev && toDev) {
                          const res = calculateWireRoute(
                            { x: fromDev.x, y: fromDev.y },
                            { x: toDev.x, y: toDev.y },
                            item.mode,
                            planData.walls || [],
                            planData.rooms || [],
                            planData.scalePxPerMeter || 45,
                            planData.gridSnapPx || 10
                          );
                          setPlanData((prev) => ({
                            ...prev,
                            wireRoutes: prev.wireRoutes.map((r) =>
                              r.id === selectedRoute.id
                                ? {
                                    ...r,
                                    routingMode: item.mode,
                                    waypoints: res.waypoints,
                                    lengthMeters: res.lengthMeters,
                                  }
                                : r
                            ),
                          }));
                        }
                      }}
                      className={`py-1 px-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        (selectedRoute.routingMode || 'WALL_SNAP') === item.mode
                          ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {isKa ? item.labelKa : item.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Breakdown */}
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-700/50 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{isKa ? 'ჰორიზონტალური სიგრძე:' : '2D Horizontal:'}</span>
                  <span className="font-mono text-slate-200">
                    {(selectedRoute.lengthMeters || 0).toFixed(2)} m
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isKa ? 'ვერტიკალური დაშვება (ჭერი 2.7მ):' : 'Vertical Drops (2.7m):'}</span>
                  <span className="font-mono text-amber-400">
                    {(
                      (Math.abs(270 - (planData.devices.find((d) => d.id === selectedRoute.fromDeviceId)?.heightCm || 90)) +
                        Math.abs(270 - (planData.devices.find((d) => d.id === selectedRoute.toDeviceId)?.heightCm || 90))) /
                      100
                    ).toFixed(2)}{' '}
                    m
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-1">
                  <span>{isKa ? 'სრული კაბელი (+15% მარაგი):' : 'Total with Reserve:'}</span>
                  <span className="font-mono text-sm">
                    {(
                      ((selectedRoute.lengthMeters || 0) +
                        (Math.abs(270 - (planData.devices.find((d) => d.id === selectedRoute.fromDeviceId)?.heightCm || 90)) +
                          Math.abs(270 - (planData.devices.find((d) => d.id === selectedRoute.toDeviceId)?.heightCm || 90))) /
                          100) *
                      1.15
                    ).toFixed(2)}{' '}
                    m
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Cable Bill of Materials (BOM) */}
          <div className="p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              {isKa ? 'კაბელების სპეციფიკაცია' : 'Cable Schedule'}
            </span>

            <div className="space-y-1.5">
              {Object.entries(cableEstimates).map(([spec, data]) => (
                <div
                  key={spec}
                  className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: data.color }}
                    />
                    <span className="font-mono text-slate-200">{spec}</span>
                  </div>
                  <span className="font-bold text-emerald-400 font-mono">
                    ~ {data.meters.toFixed(1)} m
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown List */}
          <div className="p-4 border-t border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              {isKa ? 'წერტილების რაოდენობა' : 'Device Breakdown'}
            </span>

            <div className="space-y-1">
              {(Object.entries(deviceCounts) as [FloorPlanDeviceType, number][])
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => {
                  const def = DEVICE_DEFINITIONS[type];
                  if (!def) return null;
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-800/20 text-slate-300"
                    >
                      <span className="truncate pr-2">{isKa ? def.labelKa : def.labelEn}</span>
                      <span className="font-bold font-mono text-sky-400">{count} ც</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* CAD / BIM / PDF EXPORT MODAL */}
      <CadExportModal
        isOpen={isCadExportOpen}
        onClose={() => setIsCadExportOpen(false)}
        planData={planData}
        svgElement={svgRef.current}
        lang={lang}
      />

      {/* BACKGROUND PLAN / NAPR TRACING MODAL */}
      <BackgroundPlanModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
        backgroundImage={planData.backgroundImage}
        onUpdateBackground={(bg) => setPlanData((prev) => ({ ...prev, backgroundImage: bg }))}
        lang={lang}
      />

      {/* ADD ROOM MODAL */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-slate-100 shadow-2xl">
            <h3 className="font-bold text-slate-100">{isKa ? 'ახალი ოთახის დამატება' : 'Add Room Zone'}</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">{isKa ? 'ოთახის სახელი' : 'Room Name'}</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{isKa ? 'სიგანე (მ)' : 'Width (m)'}</label>
                <input
                  type="number"
                  step="0.1"
                  value={newRoomWidthM}
                  onChange={(e) => setNewRoomWidthM(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">{isKa ? 'სიგრძე (მ)' : 'Length (m)'}</label>
                <input
                  type="number"
                  step="0.1"
                  value={newRoomHeightM}
                  onChange={(e) => setNewRoomHeightM(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl text-slate-300"
              >
                {isKa ? 'გაუქმება' : 'Cancel'}
              </button>
              <button
                onClick={handleAddRoom}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-xs font-semibold rounded-xl text-white shadow-md"
              >
                {isKa ? 'დამატება' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
