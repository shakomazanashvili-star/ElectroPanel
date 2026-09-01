/**
 * Types and interfaces for ElectroPanel Workbench
 */

export type Language = 'ka' | 'en';

export type WireStandard = 'EU_IEC' | 'US_NEC';

export type WireColorType = 
  | 'PHASE_BROWN'
  | 'PHASE_BLACK'
  | 'PHASE_GREY'
  | 'PHASE_RED'
  | 'NEUTRAL_BLUE'
  | 'GROUND_GREEN_YELLOW'
  | 'CONTROL_ORANGE'
  | 'CONTROL_WHITE';

export type WireGauge = 1.5 | 2.5 | 4.0 | 6.0 | 10.0 | 16.0 | 25.0; // in mm²

export type TerminalType = 'PHASE' | 'PHASE_L1' | 'PHASE_L2' | 'PHASE_L3' | 'NEUTRAL' | 'GROUND' | 'SIGNAL';

export type TerminalPosition = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

export interface Terminal {
  id: string;
  name: string;
  type: TerminalType;
  position: TerminalPosition;
  offsetPercent: number; // 0 to 100 relative to component edge
  label?: string;
}

export type ComponentCategory = 
  | 'MAINS_INFEED'
  | 'CIRCUIT_BREAKER'
  | 'VOLTAGE_RELAY'
  | 'RCD_DEVICE'
  | 'RCBO_DEVICE'
  | 'BUSBAR'
  | 'SURGE_PROTECTOR'
  | 'SMART_DEVICE'
  | 'CONSUMER_LOAD';

export type BreakerCurve = 'B' | 'C' | 'D' | 'K' | 'Z' | 'CUSTOM';

export type ProtectionMechanism = 
  | 'THERMAL_MAGNETIC'
  | 'ELECTRONIC_LSI'
  | 'HYDRAULIC_MAGNETIC'
  | 'THERMAL_ONLY'
  | 'MAGNETIC_ONLY'
  | 'RESIDUAL_OVERCURRENT';

export interface BreakerCustomizationSettings {
  customLabel?: string;
  voltageRatingV: number; // e.g. 230, 400, 120, 240, 480
  ratedCurrentA: number; // In e.g. 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100
  poles: number; // 1, 2, 3, 4
  curve: BreakerCurve;
  overloadTripMultiplier: number; // Ir / Ith e.g. 1.05 to 1.45 (nominal thermal trip threshold multiplier)
  shortCircuitTripMultiplier: number; // Ii / Im e.g. 3 to 20 (magnetic instantaneous trip multiplier)
  protectionMechanism: ProtectionMechanism;
  breakingCapacityKa: number; // Icu e.g. 4.5, 6, 10, 15, 25 kA
  operatingFrequencyHz: number; // 50, 60, 0(DC)
  circuitTypeTag?: string; // e.g. 'LIGHTING', 'SOCKETS', 'APPLIANCE', 'HVAC', 'MOTOR', 'FEEDER'
}

export interface ComponentMetadata {
  type: string;
  category: ComponentCategory;
  nameKa: string;
  nameEn: string;
  descriptionKa: string;
  descriptionEn: string;
  dinUnits: number; // 1 DIN = 18mm standard module width
  voltageRatingV?: number; // 230V, 400V, etc.
  ratedCurrentA?: number; // e.g. 16, 25, 32, 40, 63
  poles?: number; // 1, 2, 3, 4
  curve?: BreakerCurve;
  breakingCapacityKa?: number; // e.g. 6 kA, 10 kA
  protectionMechanism?: ProtectionMechanism;
  overloadTripMultiplier?: number;
  shortCircuitTripMultiplier?: number;
  rcdSensitivityMa?: number; // 10mA, 30mA, 100mA, 300mA
  ratedPowerW?: number; // For consumer loads
  powerFactor?: number; // cos phi
  terminals: Terminal[];
  iconName?: string;
  defaultLabel?: string;
}

export interface PlacedComponent {
  id: string;
  typeId: string;
  railId: string; // 'rail-1', 'rail-2', 'rail-3', 'busbar-rail', 'load-rail'
  positionIndex: number;
  customLabel: string;
  customCurrentA?: number;
  customPowerW?: number;
  curve?: BreakerCurve;
  rcdSensitivityMa?: number;
  
  // Breaker specific customization
  breakerSettings?: BreakerCustomizationSettings;
  
  // Dynamic runtime state
  isOn: boolean; // Breaker switch ON/OFF
  isTripped: boolean;
  tripReason?: string;
  
  // Specific device settings
  voltageRelaySettings?: {
    minVoltage: number; // default 175V
    maxVoltage: number; // default 260V
    delaySeconds: number; // default 5s
    currentCutoffA?: number;
  };
  
  smartRelaySettings?: {
    isWifiConnected: boolean;
    timerActive: boolean;
  };
}

export interface WireConnection {
  id: string;
  fromComponentId: string;
  fromTerminalId: string;
  toComponentId: string;
  toTerminalId: string;
  color: WireColorType;
  gauge: WireGauge;
  isCustomPath?: boolean;
}

export interface PanelClipboard {
  components: PlacedComponent[];
  internalWires: WireConnection[];
  sourceRailId?: string;
  copiedAt: number;
}

export interface SimulationTerminalState {
  isEnergized: boolean;
  voltageV: number;
  currentA: number;
  phase: 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'NONE';
  potential: number; // 230, 0, etc.
}

export interface SimulationState {
  gridPowerOn: boolean;
  gridVoltageL1: number;
  gridVoltageL2: number;
  gridVoltageL3: number;
  gridFrequencyHz: number;
  isThreePhase: boolean;
  
  // Component status map
  componentStatuses: Record<string, {
    isEnergized: boolean;
    activePowerW: number;
    currentA: number;
    voltageV: number;
    isTripped: boolean;
    tripReason?: string;
    warning?: string;
  }>;
  
  // Terminal status map (key: `${componentId}:${terminalId}`)
  terminalStates: Record<string, SimulationTerminalState>;
  
  // Wire status map (key: wireId)
  wireStates: Record<string, {
    isEnergized: boolean;
    carriesCurrentA: number;
    isOverloaded: boolean;
    isShortCircuit: boolean;
  }>;
  
  totalPowerW: number;
  totalCurrentA: number;
  safetyAlerts: SafetyAlert[];
}

export interface SafetyAlert {
  id: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  titleKa: string;
  titleEn: string;
  descriptionKa: string;
  descriptionEn: string;
  relatedComponentIds?: string[];
  relatedWireIds?: string[];
}

export interface PanelConfig {
  id: string;
  name: string;
  descriptionKa: string;
  descriptionEn: string;
  numRails: number;
  isThreePhase: boolean;
  components: PlacedComponent[];
  wires: WireConnection[];
}

export type ActiveTool = 'SELECT' | 'MULTI_SELECT' | 'WIRE' | 'DELETE_WIRE' | 'PROBE' | 'THERMAL';

export type ThermalPalette = 'FLIR_IRONBOW' | 'RAINBOW_JET' | 'HEAT_GLOW' | 'HIGH_CONTRAST';

export type ThermalRiskLevel = 'SAFE' | 'NOMINAL' | 'ELEVATED' | 'OVERHEATING' | 'CRITICAL_HOTSPOT';

export interface ComponentThermalData {
  componentId: string;
  nominalTempC: number;
  effectiveTempC: number; // with mutual heating
  ambientTempC: number;
  temperatureRiseDeltaC: number;
  mutualHeatingDeltaC: number;
  heatDissipationWatts: number;
  loadRatio: number; // 0.0 to 2.0+
  riskLevel: ThermalRiskLevel;
  deratingFactor: number; // e.g. 0.88 at 60C
  hotspotWarningKa?: string;
  hotspotWarningEn?: string;
}

export interface PanelThermalState {
  isThermalOverlayActive: boolean;
  palette: ThermalPalette;
  opacity: number; // 0.2 to 1.0
  showTemperatureBadges: boolean;
  showHeatPlumes: boolean;
  ambientTempC: number;
  maxBoardTempC: number;
  minBoardTempC: number;
  avgBoardTempC: number;
  maxHotspotComponentId: string | null;
  totalHeatLossWatts: number;
  componentsThermal: Record<string, ComponentThermalData>;
}

export type WireRoutingStyle = 'ORTHOGONAL_DUCT' | 'SMOOTH_BUNDLE' | 'DIRECT';

export interface RouteWaypoint {
  x: number;
  y: number;
}

export interface RoutedWirePath {
  wireId: string;
  pathD: string;
  waypoints: RouteWaypoint[];
  lengthMm: number;
  channel: string;
}

export interface WireRoutingState {
  isAutoRouted: boolean;
  style: WireRoutingStyle;
  showCableDucts: boolean;
  cornerRadius: number;
  laneSeparation: number;
  totalCrossingsBefore: number;
  totalCrossingsAfter: number;
  totalLengthMm: number;
  routedPaths?: Record<string, RoutedWirePath>;
}

// -------------------------------------------------------------
// Circuit & Load Schedule Interfaces (მომხმარებლების გრაფა / ცხრილი)
// -------------------------------------------------------------

export type LoadCategoryType = 
  | 'LIGHTING'
  | 'SOCKETS'
  | 'AC_CLIMATE'
  | 'HEATING_BOILER'
  | 'KITCHEN'
  | 'WET_ROOM'
  | 'OUTDOOR'
  | 'GENERAL';

export interface CircuitLoad {
  id: string;
  circuitCode: string; // e.g. 'Q1', 'Q2', 'Q3', 'L1', 'S1'
  name: string; // e.g. 'მისაღების როზეტები', 'კონდიციონერი'
  room: string; // e.g. 'მისაღები', 'საძინებელი', 'სამზარეულო', 'აბაზანა'
  category: LoadCategoryType;
  powerW: number; // e.g. 150, 1800, 1500, 2000
  voltageV: number; // e.g. 230, 400
  cosPhi: number; // e.g. 0.95, 1.0
  breakerId?: string; // e.g. 'mcb-sockets' or custom breaker name
  breakerRatingA?: number; // e.g. 10, 16, 20, 25, 32
  wireGaugeMm2?: number; // e.g. 1.5, 2.5, 4.0, 6.0
  cableType?: string; // e.g. 'NYM 3x2.5', 'ВВГнг 3x1.5'
  demandFactor: number; // Kc (e.g. 0.7, 0.8, 1.0)
  phase?: 'L1' | 'L2' | 'L3';
  isActive: boolean;
  notes?: string;
  componentId?: string; // linked PlacedComponent id on the DIN rail (if any)
}

// -------------------------------------------------------------
// Floor Plan & Room Electrical Blueprint Interfaces (ოთახების ნახაზი)
// -------------------------------------------------------------

export type FloorPlanDeviceType =
  | 'SWITCH_1G' // ერთკლავიშიანი ჩამრთველი
  | 'SWITCH_2G' // ორკლავიშიანი ჩამრთველი
  | 'SWITCH_3G' // სამკლავიშიანი ჩამრთველი
  | 'SWITCH_2WAY' // რევერსული ჩამრთველი (Two-way)
  | 'SWITCH_INTERMEDIATE' // შუალედური ჩამრთველი (Cross/Intermediate)
  | 'SOCKET_SINGLE' // შტეფსელი 220V (16A)
  | 'SOCKET_DOUBLE' // ორმაგი შტეფსელი (Double socket)
  | 'SOCKET_IP44' // შტეფსელი IP44 აბაზანის (Moisture-proof)
  | 'SOCKET_INTERNET' // ინტერნეტის როზეტი (RJ45 Data)
  | 'SOCKET_TV' // ტელევიზიის როზეტი (TV Coaxial)
  | 'JUNCTION_BOX' // გამანაწილებელი კოლოფი (Junction Box)
  | 'PANEL_BOARD' // მთავარი ამომრთველი ავტომატების კარადა (Main Panel/DB)
  | 'MAIN_PANEL' // მთავარი ელექტრო ფარი
  | 'SUB_PANEL' // მეორადი გამანაწილებელი ფარი
  | 'LIGHT_CEILING' // ჭერის სანათი
  | 'LIGHT_CHANDELIER' // ჭაღი
  | 'LIGHT_SPOT' // წერტილოვანი სანათი (Spotlight)
  | 'LIGHT_LED_STRIP' // LED ლენტი
  | 'LIGHT_WALL' // კედლის ბრა (Wall sconce)
  | 'AC_UNIT' // კონდიციონერი
  | 'WATER_HEATER' // ბოილერი
  | 'COOKTOP' // ელექტრო ქურა
  | 'REFRIGERATOR' // მაცივარი
  | 'DISHWASHER' // ჭურჭლის სარეცხი მანქანა
  | 'WASHING_MACHINE' // სარეცხი მანქანა
  | 'EXHAUST_FAN'; // გამწოვი

export interface FloorPlanDevice {
  id: string;
  type: FloorPlanDeviceType;
  x: number; // in px
  y: number; // in px
  rotation: number; // 0, 90, 180, 270 degrees
  label: string; // e.g. "SW1", "JB-1", "DB-MAIN", "SOCK-1"
  customName: string; // e.g. "მისაღების ჭაღის ჩამრთველი"
  roomName: string; // e.g. "მისაღები"
  circuitCode: string; // e.g. "Q1", "Q2", "Q3", "DATA"
  powerW: number; // in Watts
  heightCm: number; // Mounting height in cm from floor (e.g. 90, 30, 220, 270)
  cableGaugeMm2?: number; // e.g. 1.5, 2.5
  cableType?: string; // e.g. "NYM 3x1.5", "NYM 3x2.5", "UTP Cat6"
  ipRating?: string; // "IP20", "IP44", "IP65"
  notes?: string;
}

export type FloorPlanConduitType = 'LIGHTING' | 'POWER' | 'HEAVY' | 'DATA' | 'CONTROL';

export interface FloorPlanWireRoute {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  circuitCode: string;
  wireType: FloorPlanConduitType;
  cableSpec: string; // e.g. "NYM 3x1.5"
  color: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  routingMode?: 'WALL_SNAP' | 'ORTHO_90' | 'DIRECT';
  waypoints?: Array<{ x: number; y: number }>;
  lengthMeters?: number;
}

export interface FloorPlanRoom {
  id: string;
  name: string; // e.g. "მისაღები", "საძინებელი", "სამზარეულო"
  x: number;
  y: number;
  width: number;
  height: number;
  areaM2: number;
  color: string; // Tailwind/Hex tint
  ceilingHeightM?: number;
}

export interface FloorPlanWall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thicknessCm: number; // e.g. 20cm outer, 10cm inner
  heightM: number; // e.g. 2.7m
  isOuter?: boolean;
  color?: string;
}

export interface FloorPlanDoor {
  id: string;
  x: number;
  y: number;
  widthCm: number; // e.g. 80cm, 90cm
  rotation: number; // 0, 90, 180, 270 or angle in degrees
  swingDirection?: 'LEFT' | 'RIGHT' | 'DOUBLE' | 'SLIDING';
  wallId?: string;
}

export interface FloorPlanWindow {
  id: string;
  x: number;
  y: number;
  widthCm: number; // e.g. 120cm, 150cm
  heightCm?: number; // e.g. 140cm
  sillHeightCm?: number; // e.g. 90cm
  rotation: number;
  wallId?: string;
}

export interface FloorPlanBackgroundImage {
  url: string;
  name: string;
  x: number;
  y: number;
  scale: number; // 0.1 to 5.0
  rotation: number; // in degrees
  opacity: number; // 0.05 to 1.0
  visible: boolean;
  locked: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
}

export interface FloorPlanData {
  id: string;
  name: string;
  projectName?: string;
  cadastralCode?: string; // Optional Cadastral Code / ID
  designerName?: string;
  scalePxPerMeter: number; // e.g. 50px = 1 meter
  gridSnapPx?: number; // e.g. 10px
  rooms: FloorPlanRoom[];
  walls: FloorPlanWall[];
  doors: FloorPlanDoor[];
  windows: FloorPlanWindow[];
  devices: FloorPlanDevice[];
  wireRoutes: FloorPlanWireRoute[];
  backgroundImage?: FloorPlanBackgroundImage;
}

export interface PanelPhoto {
  id: string;
  url: string;
  timestamp: string;
  title?: string;
  notes?: string;
  panelTag?: string;
}

