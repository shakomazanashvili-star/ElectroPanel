import {
  FloorPlanRoom,
  FloorPlanWall,
  FloorPlanDevice,
  FloorPlanWireRoute,
  FloorPlanDeviceType,
} from '../types';
import { calculateWireRoute } from './wireRoutingEngine';

export interface RoomPreset {
  id: string;
  nameKa: string;
  nameEn: string;
  icon: string;
  defaultWidthM: number;
  defaultHeightM: number;
  color: string;
  borderColor: string;
  descriptionKa: string;
  descriptionEn: string;
  category: 'LIVING' | 'BEDROOM' | 'KITCHEN' | 'BATH' | 'CORRIDOR' | 'OUTDOOR' | 'UTILITY' | 'OFFICE';
}

export const ROOM_PRESETS: RoomPreset[] = [
  {
    id: 'living-room',
    nameKa: 'მისაღები ოთახი',
    nameEn: 'Living Room',
    icon: '🛋️',
    defaultWidthM: 5.2,
    defaultHeightM: 4.2,
    color: '#0f172a',
    borderColor: '#38bdf8',
    descriptionKa: 'დიდი საერთო სივრცე, TV ზონა, დივანი, განათების ჯგუფები და კონდიციონერი',
    descriptionEn: 'Main lounge, TV zone, ambient lighting and AC',
    category: 'LIVING',
  },
  {
    id: 'bedroom',
    nameKa: 'საძინებელი',
    nameEn: 'Bedroom',
    icon: '🛏️',
    defaultWidthM: 4.2,
    defaultHeightM: 3.6,
    color: '#1e1b4b',
    borderColor: '#818cf8',
    descriptionKa: 'საწოლის ორმხრივი როზეტები, გადამრთველები, ჭაღი და კონდიციონერი',
    descriptionEn: 'Bedside sockets, 2-way pass switches, center light & AC',
    category: 'BEDROOM',
  },
  {
    id: 'kitchen',
    nameKa: 'სამზარეულო',
    nameEn: 'Kitchen',
    icon: '🍳',
    defaultWidthM: 3.8,
    defaultHeightM: 3.2,
    color: '#2a1215',
    borderColor: '#f87171',
    descriptionKa: 'ქურა 7kW, მაცივარი, ჭურჭლის სარეცხი, სამუშაო როზეტების ბლოკი, გამწოვი',
    descriptionEn: 'Cooktop 7kW, fridge, dishwasher, worktop sockets, hood',
    category: 'KITCHEN',
  },
  {
    id: 'bathroom',
    nameKa: 'აბაზანა / სველი წერტილი',
    nameEn: 'Bathroom',
    icon: '🚿',
    defaultWidthM: 2.6,
    defaultHeightM: 2.2,
    color: '#082f49',
    borderColor: '#38bdf8',
    descriptionKa: 'სარეცხი მანქანა (IP44), ბოილერი, სარკის როზეტი (IP44), ვენტილატორი, სანათი',
    descriptionEn: 'Washing machine (IP44), boiler, mirror IP44 socket, fan, light',
    category: 'BATH',
  },
  {
    id: 'corridor',
    nameKa: 'კორიდორი / ჰოლი',
    nameEn: 'Hallway / Corridor',
    icon: '🚪',
    defaultWidthM: 4.5,
    defaultHeightM: 1.8,
    color: '#1c1917',
    borderColor: '#fbbf24',
    descriptionKa: 'მთავარი გამანაწილებელი ფარი, გადამრთველები, შემოსასვლელი როზეტი',
    descriptionEn: 'Main distribution board, 2-way switches, entry socket',
    category: 'CORRIDOR',
  },
  {
    id: 'balcony',
    nameKa: 'აივანი / ტერასა',
    nameEn: 'Balcony / Terrace',
    icon: '🌿',
    defaultWidthM: 3.5,
    defaultHeightM: 1.5,
    color: '#064e3b',
    borderColor: '#34d399',
    descriptionKa: 'წყალგაუმტარი IP54 სანათი, IP54 როზეტი, ჩამრთველი',
    descriptionEn: 'IP54 weatherproof light, IP54 socket, outdoor switch',
    category: 'OUTDOOR',
  },
  {
    id: 'closet',
    nameKa: 'საგარდერობო',
    nameEn: 'Walk-in Closet',
    icon: '👔',
    defaultWidthM: 2.4,
    defaultHeightM: 2.0,
    color: '#3b0764',
    borderColor: '#c084fc',
    descriptionKa: 'ჭერის LED სანათი, მოძრაობის სენსორი/ჩამრთველი, საუთოო როზეტი',
    descriptionEn: 'Ceiling LED, motion sensor/switch, iron socket',
    category: 'UTILITY',
  },
  {
    id: 'office',
    nameKa: 'კაბინეტი / სამუშაო ოთახი',
    nameEn: 'Office / Study',
    icon: '💼',
    defaultWidthM: 3.6,
    defaultHeightM: 3.0,
    color: '#14532d',
    borderColor: '#4ade80',
    descriptionKa: 'სამუშაო მაგიდის 4x როზეტი + ინტერნეტ როზეტი RJ45, სანათი, AC',
    descriptionEn: 'Desk 4x sockets + RJ45 Internet, lighting, AC',
    category: 'OFFICE',
  },
  {
    id: 'utility',
    nameKa: 'ტექნიკური ოთახი / საქვაბე',
    nameEn: 'Utility / Boiler Room',
    icon: '⚙️',
    defaultWidthM: 2.5,
    defaultHeightM: 2.0,
    color: '#451a03',
    borderColor: '#fb923c',
    descriptionKa: 'გათბობის ქვაბი, რეკუპერატორი, ტუმბოები, სარეზერვო კვება',
    descriptionEn: 'Boiler, heat pump, pumps, backup power',
    category: 'UTILITY',
  },
];

/**
 * Automatically creates 4 architectural walls enclosing a room
 */
export function generatePerimeterWallsForRoom(
  room: FloorPlanRoom,
  scalePxPerMeter: number = 45,
  isOuter: boolean = false,
  thicknessCm: number = 20
): FloorPlanWall[] {
  const { x, y, width, height } = room;
  const timestamp = Date.now();

  return [
    // Top wall
    {
      id: `wall-top-${room.id}-${timestamp}`,
      startX: x,
      startY: y,
      endX: x + width,
      endY: y,
      thicknessCm: isOuter ? 25 : thicknessCm,
      heightM: room.ceilingHeightM || 2.7,
      isOuter,
    },
    // Right wall
    {
      id: `wall-right-${room.id}-${timestamp}`,
      startX: x + width,
      startY: y,
      endX: x + width,
      endY: y + height,
      thicknessCm: isOuter ? 25 : thicknessCm,
      heightM: room.ceilingHeightM || 2.7,
      isOuter,
    },
    // Bottom wall
    {
      id: `wall-bottom-${room.id}-${timestamp}`,
      startX: x + width,
      startY: y + height,
      endX: x,
      endY: y + height,
      thicknessCm: isOuter ? 25 : thicknessCm,
      heightM: room.ceilingHeightM || 2.7,
      isOuter,
    },
    // Left wall
    {
      id: `wall-left-${room.id}-${timestamp}`,
      startX: x,
      startY: y + height,
      endX: x,
      endY: y,
      thicknessCm: isOuter ? 25 : thicknessCm,
      heightM: room.ceilingHeightM || 2.7,
      isOuter,
    },
  ];
}

/**
 * Intelligently Auto-Equips a Room with professional electrical devices
 * based on its name/category.
 */
export function autoEquipRoom(
  room: FloorPlanRoom,
  existingDevicesCount: number = 0,
  lang: 'ka' | 'en' = 'ka'
): { devices: FloorPlanDevice[]; toastMessage: string } {
  const isKa = lang === 'ka';
  const nameLower = room.name.toLowerCase();
  const scale = 45; // default scale
  const { x, y, width, height } = room;
  const cx = x + width / 2;
  const cy = y + height / 2;

  let newDevices: FloorPlanDevice[] = [];
  let roomType: string = 'LIVING';

  if (nameLower.includes('სამზარეულო') || nameLower.includes('kitchen')) {
    roomType = 'KITCHEN';
  } else if (nameLower.includes('საძინებელ') || nameLower.includes('bedroom')) {
    roomType = 'BEDROOM';
  } else if (nameLower.includes('აბაზან') || nameLower.includes('bath') || nameLower.includes('სველი')) {
    roomType = 'BATH';
  } else if (nameLower.includes('კორიდორ') || nameLower.includes('ჰოლ') || nameLower.includes('corridor') || nameLower.includes('hall')) {
    roomType = 'CORRIDOR';
  } else if (nameLower.includes('აივან') || nameLower.includes('ტერას') || nameLower.includes('balcony')) {
    roomType = 'BALCONY';
  } else if (nameLower.includes('კაბინეტ') || nameLower.includes('ოფის') || nameLower.includes('office')) {
    roomType = 'OFFICE';
  } else if (nameLower.includes('საგარდერობო') || nameLower.includes('closet')) {
    roomType = 'CLOSET';
  }

  const baseId = Date.now();
  let devIdx = existingDevicesCount + 1;

  switch (roomType) {
    case 'KITCHEN':
      newDevices = [
        // 1. Light switch at entrance
        {
          id: `dev-${baseId}-sw`,
          type: 'SWITCH_1G',
          x: x + 25,
          y: y + height - 25,
          rotation: 0,
          label: `SW-${devIdx++}`,
          customName: isKa ? 'ჩამრთველი 1-კლავიშიანი' : '1-Gang Switch',
          roomName: room.name,
          circuitCode: 'Q_L_KIT',
          powerW: 0,
          heightCm: 90,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 2. Ceiling Main Light
        {
          id: `dev-${baseId}-light`,
          type: 'LIGHT_CEILING',
          x: cx,
          y: cy,
          rotation: 0,
          label: `LT-${devIdx++}`,
          customName: isKa ? 'ჭერის სანათი LED' : 'Ceiling LED Light',
          roomName: room.name,
          circuitCode: 'Q_L_KIT',
          powerW: 60,
          heightCm: 270,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 3. Cooktop (7000W Heavy)
        {
          id: `dev-${baseId}-cook`,
          type: 'COOKTOP',
          x: x + width - 35,
          y: y + 35,
          rotation: 0,
          label: `CK-${devIdx++}`,
          customName: isKa ? 'ქურა / ღუმელი (7kW)' : 'Electric Cooktop (7kW)',
          roomName: room.name,
          circuitCode: 'Q_COOK',
          powerW: 7000,
          heightCm: 60,
          cableGaugeMm2: 4.0,
          cableType: 'NYM 3x4.0',
        },
        // 4. Fridge
        {
          id: `dev-${baseId}-fridge`,
          type: 'REFRIGERATOR',
          x: x + 35,
          y: y + 35,
          rotation: 0,
          label: `FR-${devIdx++}`,
          customName: isKa ? 'მაცივრის როზეტი' : 'Refrigerator Socket',
          roomName: room.name,
          circuitCode: 'Q_S_KIT',
          powerW: 300,
          heightCm: 30,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 5. Dishwasher
        {
          id: `dev-${baseId}-dw`,
          type: 'DISHWASHER',
          x: x + width - 35,
          y: y + height / 2,
          rotation: 0,
          label: `DW-${devIdx++}`,
          customName: isKa ? 'ჭურჭლის სარეცხი მანქანა' : 'Dishwasher',
          roomName: room.name,
          circuitCode: 'Q_DW',
          powerW: 2000,
          heightCm: 45,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 6. Worktop Counter Quad Sockets
        {
          id: `dev-${baseId}-counter`,
          type: 'SOCKET_DOUBLE',
          x: cx,
          y: y + 20,
          rotation: 0,
          label: `SK-${devIdx++}`,
          customName: isKa ? 'სამუშაო მაგიდის როზეტები' : 'Countertop Sockets',
          roomName: room.name,
          circuitCode: 'Q_S_KIT',
          powerW: 2000,
          heightCm: 105,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
      ];
      break;

    case 'BEDROOM':
      newDevices = [
        // 1. 2-way Switch at door
        {
          id: `dev-${baseId}-sw-door`,
          type: 'SWITCH_2WAY',
          x: x + 25,
          y: y + height - 25,
          rotation: 0,
          label: `SW-${devIdx++}`,
          customName: isKa ? 'გადამრთავი (შემოსასვლელი)' : 'Pass Switch (Door)',
          roomName: room.name,
          circuitCode: 'Q_L_BED',
          powerW: 0,
          heightCm: 90,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 2. Ceiling Center Light
        {
          id: `dev-${baseId}-light`,
          type: 'LIGHT_CHANDELIER',
          x: cx,
          y: cy,
          rotation: 0,
          label: `LT-${devIdx++}`,
          customName: isKa ? 'საძინებლის ჭაღი' : 'Bedroom Chandelier',
          roomName: room.name,
          circuitCode: 'Q_L_BED',
          powerW: 80,
          heightCm: 270,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 3. Bedside Left Double Socket
        {
          id: `dev-${baseId}-sk-bed-l`,
          type: 'SOCKET_DOUBLE',
          x: x + 35,
          y: y + 35,
          rotation: 0,
          label: `SK-${devIdx++}`,
          customName: isKa ? 'საწოლის როზეტი (მარცხენა)' : 'Bedside Socket (Left)',
          roomName: room.name,
          circuitCode: 'Q_S_BED',
          powerW: 500,
          heightCm: 60,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 4. Bedside Right Double Socket
        {
          id: `dev-${baseId}-sk-bed-r`,
          type: 'SOCKET_DOUBLE',
          x: x + width - 35,
          y: y + 35,
          rotation: 0,
          label: `SK-${devIdx++}`,
          customName: isKa ? 'საწოლის როზეტი (მარჯვენა)' : 'Bedside Socket (Right)',
          roomName: room.name,
          circuitCode: 'Q_S_BED',
          powerW: 500,
          heightCm: 60,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 5. Air Conditioner
        {
          id: `dev-${baseId}-ac`,
          type: 'AC_UNIT',
          x: x + width - 30,
          y: cy,
          rotation: 0,
          label: `AC-${devIdx++}`,
          customName: isKa ? 'კონდიციონერი (საძინებელი)' : 'Air Conditioner',
          roomName: room.name,
          circuitCode: 'Q_AC',
          powerW: 1500,
          heightCm: 230,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 6. TV Socket
        {
          id: `dev-${baseId}-tv`,
          type: 'SOCKET_SINGLE',
          x: cx,
          y: y + height - 25,
          rotation: 0,
          label: `TV-${devIdx++}`,
          customName: isKa ? 'TV როზეტი' : 'TV Power Socket',
          roomName: room.name,
          circuitCode: 'Q_S_BED',
          powerW: 200,
          heightCm: 110,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
      ];
      break;

    case 'BATH':
      newDevices = [
        // 1. Switch outside door
        {
          id: `dev-${baseId}-sw`,
          type: 'SWITCH_1G',
          x: x + 20,
          y: y + height - 20,
          rotation: 0,
          label: `SW-${devIdx++}`,
          customName: isKa ? 'აბაზანის ჩამრთველი' : 'Bathroom Switch',
          roomName: room.name,
          circuitCode: 'Q_L_BATH',
          powerW: 0,
          heightCm: 90,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 2. Ceiling Waterproof Light IP44
        {
          id: `dev-${baseId}-light`,
          type: 'LIGHT_CEILING',
          x: cx,
          y: cy,
          rotation: 0,
          label: `LT-${devIdx++}`,
          customName: isKa ? 'ჭერის სანათი IP44' : 'Ceiling Light IP44',
          roomName: room.name,
          circuitCode: 'Q_L_BATH',
          powerW: 40,
          heightCm: 270,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
          ipRating: 'IP44',
        },
        // 3. Washing Machine (IP44, 2200W)
        {
          id: `dev-${baseId}-wm`,
          type: 'WASHING_MACHINE',
          x: x + width - 35,
          y: y + height - 35,
          rotation: 0,
          label: `WM-${devIdx++}`,
          customName: isKa ? 'სარეცხი მანქანა (IP44)' : 'Washing Machine',
          roomName: room.name,
          circuitCode: 'Q_WM',
          powerW: 2200,
          heightCm: 90,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
          ipRating: 'IP44',
        },
        // 4. Water Heater / Boiler
        {
          id: `dev-${baseId}-wh`,
          type: 'WATER_HEATER',
          x: x + width - 35,
          y: y + 35,
          rotation: 0,
          label: `WH-${devIdx++}`,
          customName: isKa ? 'ბოილერი / გამათბობელი' : 'Water Heater Boiler',
          roomName: room.name,
          circuitCode: 'Q_BOILER',
          powerW: 2000,
          heightCm: 160,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 5. Mirror IP44 Socket
        {
          id: `dev-${baseId}-sk-mirror`,
          type: 'SOCKET_IP44',
          x: x + 35,
          y: y + 35,
          rotation: 0,
          label: `SK-${devIdx++}`,
          customName: isKa ? 'სარკის როზეტი (IP44)' : 'Mirror Socket IP44',
          roomName: room.name,
          circuitCode: 'Q_S_BATH',
          powerW: 1000,
          heightCm: 120,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
          ipRating: 'IP44',
        },
      ];
      break;

    case 'CORRIDOR':
      newDevices = [
        // 1. Main Distribution Panel (ფარი)
        {
          id: `dev-${baseId}-panel`,
          type: 'MAIN_PANEL',
          x: x + 35,
          y: cy,
          rotation: 0,
          label: `DB-1`,
          customName: isKa ? 'მთავარი გამანაწილებელი ფარი' : 'Main Distribution Board',
          roomName: room.name,
          circuitCode: 'MAIN',
          powerW: 0,
          heightCm: 150,
          cableGaugeMm2: 10,
          cableType: 'NYM 5x10',
        },
        // 2. 2-way switch
        {
          id: `dev-${baseId}-sw`,
          type: 'SWITCH_2WAY',
          x: x + width - 25,
          y: cy,
          rotation: 0,
          label: `SW-${devIdx++}`,
          customName: isKa ? 'კორიდორის გადამრთავი' : 'Corridor 2-Way Switch',
          roomName: room.name,
          circuitCode: 'Q_L_CORR',
          powerW: 0,
          heightCm: 90,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 3. Ceiling spotlights
        {
          id: `dev-${baseId}-spot1`,
          type: 'LIGHT_SPOT',
          x: cx - width * 0.25,
          y: cy,
          rotation: 0,
          label: `SP-${devIdx++}`,
          customName: isKa ? 'წერტილოვანი სანათი 1' : 'Spotlight 1',
          roomName: room.name,
          circuitCode: 'Q_L_CORR',
          powerW: 15,
          heightCm: 270,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        {
          id: `dev-${baseId}-spot2`,
          type: 'LIGHT_SPOT',
          x: cx + width * 0.25,
          y: cy,
          rotation: 0,
          label: `SP-${devIdx++}`,
          customName: isKa ? 'წერტილოვანი სანათი 2' : 'Spotlight 2',
          roomName: room.name,
          circuitCode: 'Q_L_CORR',
          powerW: 15,
          heightCm: 270,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 4. Entrance socket
        {
          id: `dev-${baseId}-sk-ent`,
          type: 'SOCKET_SINGLE',
          x: x + 35,
          y: y + height - 25,
          rotation: 0,
          label: `SK-${devIdx++}`,
          customName: isKa ? 'შემოსასვლელის როზეტი' : 'Entrance Socket',
          roomName: room.name,
          circuitCode: 'Q_S_CORR',
          powerW: 500,
          heightCm: 30,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
      ];
      break;

    case 'OFFICE':
      newDevices = [
        // 1. Switch
        {
          id: `dev-${baseId}-sw`,
          type: 'SWITCH_1G',
          x: x + 25,
          y: y + height - 25,
          rotation: 0,
          label: `SW-${devIdx++}`,
          customName: isKa ? 'ჩამრთველი' : 'Light Switch',
          roomName: room.name,
          circuitCode: 'Q_L_OFF',
          powerW: 0,
          heightCm: 90,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 2. Ceiling Light
        {
          id: `dev-${baseId}-light`,
          type: 'LIGHT_CEILING',
          x: cx,
          y: cy,
          rotation: 0,
          label: `LT-${devIdx++}`,
          customName: isKa ? 'სამუშაო ოთახის განათება' : 'Office Ceiling Light',
          roomName: room.name,
          circuitCode: 'Q_L_OFF',
          powerW: 60,
          heightCm: 270,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 3. Desk Quad Sockets
        {
          id: `dev-${baseId}-desk-sk`,
          type: 'SOCKET_DOUBLE',
          x: x + width - 35,
          y: y + 35,
          rotation: 0,
          label: `SK-${devIdx++}`,
          customName: isKa ? 'სამუშაო მაგიდის როზეტები' : 'Work Desk Sockets',
          roomName: room.name,
          circuitCode: 'Q_S_OFF',
          powerW: 1000,
          heightCm: 75,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 4. Internet RJ45 Socket
        {
          id: `dev-${baseId}-net`,
          type: 'SOCKET_INTERNET',
          x: x + width - 35,
          y: y + 65,
          rotation: 0,
          label: `LAN-${devIdx++}`,
          customName: isKa ? 'ინტერნეტის როზეტი RJ45' : 'Internet RJ45 Socket',
          roomName: room.name,
          circuitCode: 'DATA',
          powerW: 0,
          heightCm: 75,
          cableGaugeMm2: 0.5,
          cableType: 'UTP Cat6',
        },
        // 5. AC unit
        {
          id: `dev-${baseId}-ac`,
          type: 'AC_UNIT',
          x: cx,
          y: y + 25,
          rotation: 0,
          label: `AC-${devIdx++}`,
          customName: isKa ? 'კონდიციონერი' : 'Air Conditioner',
          roomName: room.name,
          circuitCode: 'Q_AC',
          powerW: 1500,
          heightCm: 230,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
      ];
      break;

    default: // LIVING ROOM / GENERAL
      newDevices = [
        // 1. 2-Gang Switch
        {
          id: `dev-${baseId}-sw`,
          type: 'SWITCH_2G',
          x: x + 25,
          y: y + height - 25,
          rotation: 0,
          label: `SW-${devIdx++}`,
          customName: isKa ? 'ჩამრთველი 2-კლავიშიანი' : '2-Gang Switch',
          roomName: room.name,
          circuitCode: 'Q_L_LIV',
          powerW: 0,
          heightCm: 90,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 2. Center Chandelier
        {
          id: `dev-${baseId}-chand`,
          type: 'LIGHT_CHANDELIER',
          x: cx,
          y: cy,
          rotation: 0,
          label: `LT-${devIdx++}`,
          customName: isKa ? 'მისაღების ჭაღი' : 'Living Room Chandelier',
          roomName: room.name,
          circuitCode: 'Q_L_LIV',
          powerW: 120,
          heightCm: 270,
          cableGaugeMm2: 1.5,
          cableType: 'NYM 3x1.5',
        },
        // 3. TV Entertainment Zone Sockets
        {
          id: `dev-${baseId}-tv`,
          type: 'SOCKET_DOUBLE',
          x: x + width - 35,
          y: cy,
          rotation: 0,
          label: `TV-${devIdx++}`,
          customName: isKa ? 'TV & მედია ბლოკი' : 'TV & Media Block',
          roomName: room.name,
          circuitCode: 'Q_S_LIV',
          powerW: 800,
          heightCm: 40,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 4. Internet Socket
        {
          id: `dev-${baseId}-net`,
          type: 'SOCKET_INTERNET',
          x: x + width - 35,
          y: cy + 30,
          rotation: 0,
          label: `LAN-${devIdx++}`,
          customName: isKa ? 'ინტერნეტ როზეტი (TV)' : 'Internet Socket (TV)',
          roomName: room.name,
          circuitCode: 'DATA',
          powerW: 0,
          heightCm: 40,
          cableGaugeMm2: 0.5,
          cableType: 'UTP Cat6',
        },
        // 5. Sofa Socket 1
        {
          id: `dev-${baseId}-sk1`,
          type: 'SOCKET_DOUBLE',
          x: x + 35,
          y: y + 35,
          rotation: 0,
          label: `SK-${devIdx++}`,
          customName: isKa ? 'დივნის როზეტი' : 'Sofa Socket',
          roomName: room.name,
          circuitCode: 'Q_S_LIV',
          powerW: 500,
          heightCm: 30,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
        // 6. Air Conditioner
        {
          id: `dev-${baseId}-ac`,
          type: 'AC_UNIT',
          x: cx,
          y: y + 25,
          rotation: 0,
          label: `AC-${devIdx++}`,
          customName: isKa ? 'კონდიციონერი 18k BTU' : 'Air Conditioner',
          roomName: room.name,
          circuitCode: 'Q_AC',
          powerW: 2000,
          heightCm: 230,
          cableGaugeMm2: 2.5,
          cableType: 'NYM 3x2.5',
        },
      ];
      break;
  }

  const toastMessage = isKa
    ? `✨ ${room.name} აღიჭურვა ${newDevices.length} სტანდარტული ელექტრო წერტილით!`
    : `✨ ${room.name} auto-equipped with ${newDevices.length} standard points!`;

  return { devices: newDevices, toastMessage };
}

/**
 * Automatically creates wire routes connecting devices in a room
 * (Switches -> Lights, and devices -> Main Panel)
 */
export function autoRouteRoomCables(
  room: FloorPlanRoom,
  allDevices: FloorPlanDevice[],
  allWalls: FloorPlanWall[],
  allRooms: FloorPlanRoom[],
  scalePxPerMeter: number = 45
): FloorPlanWireRoute[] {
  // Find devices belonging to this room
  const roomDevices = allDevices.filter(
    (d) =>
      d.roomName === room.name ||
      (d.x >= room.x && d.x <= room.x + room.width && d.y >= room.y && d.y <= room.y + room.height)
  );

  if (roomDevices.length === 0) return [];

  const mainPanel = allDevices.find((d) => d.type === 'MAIN_PANEL' || d.type === 'SUB_PANEL') || roomDevices[0];
  const newRoutes: FloorPlanWireRoute[] = [];
  const baseTime = Date.now();

  const switches = roomDevices.filter((d) => d.type.includes('SWITCH'));
  const lights = roomDevices.filter((d) => d.type.includes('LIGHT'));
  const socketsAndAppliances = roomDevices.filter(
    (d) => !d.type.includes('SWITCH') && !d.type.includes('LIGHT') && d.id !== mainPanel.id
  );

  // 1. Connect Switches to Lights
  switches.forEach((sw, idx) => {
    // Find closest light
    let closestLight = lights[0];
    let minDist = Infinity;
    lights.forEach((lt) => {
      const d = Math.hypot(lt.x - sw.x, lt.y - sw.y);
      if (d < minDist) {
        minDist = d;
        closestLight = lt;
      }
    });

    if (closestLight) {
      const res = calculateWireRoute(
        { x: sw.x, y: sw.y },
        { x: closestLight.x, y: closestLight.y },
        'WALL_SNAP',
        allWalls,
        allRooms,
        scalePxPerMeter,
        10
      );

      newRoutes.push({
        id: `auto-route-sw-${idx}-${baseTime}`,
        fromDeviceId: sw.id,
        toDeviceId: closestLight.id,
        circuitCode: sw.circuitCode || closestLight.circuitCode || 'Q_L',
        wireType: 'LIGHTING',
        cableSpec: 'NYM 3x1.5',
        color: '#f59e0b',
        lineStyle: 'solid',
        routingMode: 'WALL_SNAP',
        waypoints: res.waypoints,
        lengthMeters: res.lengthMeters,
      });
    }
  });

  // 2. Connect lighting feed to main panel (from first light or switch)
  const firstLightOrSw = lights[0] || switches[0];
  if (firstLightOrSw && mainPanel && firstLightOrSw.id !== mainPanel.id) {
    const res = calculateWireRoute(
      { x: mainPanel.x, y: mainPanel.y },
      { x: firstLightOrSw.x, y: firstLightOrSw.y },
      'WALL_SNAP',
      allWalls,
      allRooms,
      scalePxPerMeter,
      10
    );

    newRoutes.push({
      id: `auto-route-feed-light-${baseTime}`,
      fromDeviceId: mainPanel.id,
      toDeviceId: firstLightOrSw.id,
      circuitCode: firstLightOrSw.circuitCode || 'Q_L',
      wireType: 'LIGHTING',
      cableSpec: 'NYM 3x1.5',
      color: '#f59e0b',
      lineStyle: 'solid',
      routingMode: 'WALL_SNAP',
      waypoints: res.waypoints,
      lengthMeters: res.lengthMeters,
    });
  }

  // 3. Daisy chain sockets & appliances or route to panel
  let prevDev = mainPanel;
  socketsAndAppliances.forEach((dev, idx) => {
    let wireType: any = 'POWER';
    let cableSpec = 'NYM 3x2.5';
    let color = '#3b82f6';

    if (dev.type === 'COOKTOP') {
      wireType = 'HEAVY';
      cableSpec = 'NYM 3x4.0';
      color = '#ef4444';
    } else if (dev.type === 'SOCKET_INTERNET') {
      wireType = 'DATA';
      cableSpec = 'UTP Cat6';
      color = '#10b981';
    }

    // Heavy appliances & AC connect directly to Main Panel
    const targetSource =
      dev.type === 'COOKTOP' || dev.type === 'AC_UNIT' || dev.type === 'WATER_HEATER' || idx === 0
        ? mainPanel
        : prevDev;

    if (targetSource.id !== dev.id) {
      const res = calculateWireRoute(
        { x: targetSource.x, y: targetSource.y },
        { x: dev.x, y: dev.y },
        'WALL_SNAP',
        allWalls,
        allRooms,
        scalePxPerMeter,
        10
      );

      newRoutes.push({
        id: `auto-route-pwr-${idx}-${baseTime}`,
        fromDeviceId: targetSource.id,
        toDeviceId: dev.id,
        circuitCode: dev.circuitCode || 'Q_S',
        wireType,
        cableSpec,
        color,
        lineStyle: wireType === 'DATA' ? 'dashed' : 'solid',
        routingMode: 'WALL_SNAP',
        waypoints: res.waypoints,
        lengthMeters: res.lengthMeters,
      });

      if (wireType === 'POWER') {
        prevDev = dev;
      }
    }
  });

  return newRoutes;
}
