import React, { useEffect, useState, useRef } from 'react';
import { ActiveTool, SimulationState, WireColorType, WireConnection, WireGauge } from '../types';
import { WIRE_COLORS } from '../data/componentCatalog';

interface WiringCanvasProps {
  wires: WireConnection[];
  activeTool: ActiveTool;
  simulationState: SimulationState;
  wiringStartTerminal: { componentId: string; terminalId: string; type: string } | null;
  selectedColor: WireColorType;
  selectedGauge: WireGauge;
  onDeleteWire: (wireId: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Point {
  x: number;
  y: number;
}

export const WiringCanvas: React.FC<WiringCanvasProps> = ({
  wires,
  activeTool,
  simulationState,
  wiringStartTerminal,
  selectedColor,
  selectedGauge,
  onDeleteWire,
  containerRef,
}) => {
  const [terminalPositions, setTerminalPositions] = useState<Record<string, Point>>({});
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  // Update terminal positions from DOM elements
  const updateTerminalPositions = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const positions: Record<string, Point> = {};

    const termElements = containerRef.current.querySelectorAll('[id^="term-"]');
    termElements.forEach((el) => {
      const idStr = el.id.replace('term-', '');
      const parts = idStr.split('-');
      if (parts.length >= 2) {
        const compId = parts.slice(0, -1).join('-');
        const termId = parts[parts.length - 1];
        const rect = el.getBoundingClientRect();
        positions[`${compId}:${termId}`] = {
          x: rect.left + rect.width / 2 - containerRect.left + containerRef.current!.scrollLeft,
          y: rect.top + rect.height / 2 - containerRect.top + containerRef.current!.scrollTop,
        };
      }
    });

    setTerminalPositions(positions);
  };

  useEffect(() => {
    updateTerminalPositions();
    window.addEventListener('resize', updateTerminalPositions);
    const interval = setInterval(updateTerminalPositions, 500);

    return () => {
      window.removeEventListener('resize', updateTerminalPositions);
      clearInterval(interval);
    };
  }, [wires]);

  // Track mouse movement when wiring
  useEffect(() => {
    if (!wiringStartTerminal || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left + containerRef.current.scrollLeft,
        y: e.clientY - rect.top + containerRef.current.scrollTop,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [wiringStartTerminal]);

  function getWireStrokeWidth(gauge: WireGauge): number {
    switch (gauge) {
      case 1.5:
        return 2.5;
      case 2.5:
        return 3.5;
      case 4.0:
        return 4.5;
      case 6.0:
        return 5.5;
      case 10.0:
        return 7.0;
      case 16.0:
      case 25.0:
        return 8.5;
      default:
        return 3.5;
    }
  }

  function getWireColorHex(colorType: WireColorType): string {
    const found = WIRE_COLORS.find((wc) => wc.type === colorType);
    return found?.hex || '#8B4513';
  }

  // Generate cubic bezier curve path with natural sag
  function makeBezierPath(p1: Point, p2: Point): string {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If points are vertically separated (e.g. bottom terminal to top terminal)
    const isVerticalFeed = Math.abs(dy) > Math.abs(dx);
    const sag = Math.min(60, dist * 0.25);

    if (isVerticalFeed) {
      const cy1 = p1.y + (dy > 0 ? sag : -sag);
      const cy2 = p2.y + (dy > 0 ? -sag : sag);
      return `M ${p1.x} ${p1.y} C ${p1.x} ${cy1}, ${p2.x} ${cy2}, ${p2.x} ${p2.y}`;
    } else {
      // Horizontal jumper between neighboring breakers
      const isTopSide = p1.y < 200;
      const curveOffsetY = isTopSide ? -sag : sag;
      return `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + curveOffsetY}, ${p2.x} ${p2.y + curveOffsetY}, ${p2.x} ${p2.y}`;
    }
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-30 w-full h-full overflow-visible"
      style={{ minWidth: '100%', minHeight: '100%' }}
    >
      <defs>
        {/* Striped Green/Yellow Pattern for Earth / PE Wire */}
        <pattern
          id="earthStripe"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="12" fill="#10b981" />
          <rect x="6" width="6" height="12" fill="#facc15" />
        </pattern>

        {/* Glow Filters */}
        <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Render all existing wires */}
      {wires.map((wire) => {
        const keyA = `${wire.fromComponentId}:${wire.fromTerminalId}`;
        const keyB = `${wire.toComponentId}:${wire.toTerminalId}`;
        const p1 = terminalPositions[keyA];
        const p2 = terminalPositions[keyB];

        if (!p1 || !p2) return null;

        const pathD = makeBezierPath(p1, p2);
        const strokeW = getWireStrokeWidth(wire.gauge);
        const isHovered = hoveredWireId === wire.id;
        const wireStatus = simulationState.wireStates[wire.id];
        const isEnergized = wireStatus?.isEnergized;
        const isShort = wireStatus?.isShortCircuit;

        const isEarthWire = wire.color === 'GROUND_GREEN_YELLOW';
        const colorHex = isEarthWire ? 'url(#earthStripe)' : getWireColorHex(wire.color);

        return (
          <g
            key={wire.id}
            className="pointer-events-auto cursor-pointer group"
            onMouseEnter={() => setHoveredWireId(wire.id)}
            onMouseLeave={() => setHoveredWireId(null)}
            onClick={() => {
              if (activeTool === 'DELETE_WIRE' || activeTool === 'SELECT') {
                onDeleteWire(wire.id);
              }
            }}
          >
            {/* Thick transparent hit-box for easy clicking/hovering */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={strokeW + 16}
              className="cursor-pointer"
            />

            {/* Wire outer insulation / shadow */}
            <path
              d={pathD}
              fill="none"
              stroke="#0f172a"
              strokeWidth={strokeW + 2}
              strokeLinecap="round"
            />

            {/* Main Wire Core */}
            <path
              d={pathD}
              fill="none"
              stroke={isShort ? '#ef4444' : colorHex}
              strokeWidth={strokeW}
              strokeLinecap="round"
              filter={isEnergized || isHovered ? 'url(#wire-glow)' : undefined}
              className={`transition-all ${
                isHovered ? 'brightness-125' : ''
              } ${isShort ? 'animate-pulse stroke-rose-500' : ''}`}
            />

            {/* Electric flow animation dots when energized and active */}
            {isEnergized && (
              <path
                d={pathD}
                fill="none"
                stroke={isEarthWire ? '#ffffff' : '#fef08a'}
                strokeWidth={strokeW * 0.4}
                strokeDasharray="4 8"
                strokeLinecap="round"
                className="animate-[dash_1.5s_linear_infinite] opacity-75"
                style={{
                  animation: 'dash 1.2s linear infinite',
                }}
              />
            )}

            {/* Wire gauge & terminal tooltips on hover */}
            {isHovered && (
              <g>
                <circle cx={(p1.x + p2.x) / 2} cy={(p1.y + p2.y) / 2} r="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                <text
                  x={(p1.x + p2.x) / 2}
                  y={(p1.y + p2.y) / 2 + 4}
                  textAnchor="middle"
                  fill="#f59e0b"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {wire.gauge}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Rubber-band wire in progress */}
      {wiringStartTerminal && mousePos && (
        (() => {
          const startKey = `${wiringStartTerminal.componentId}:${wiringStartTerminal.terminalId}`;
          const p1 = terminalPositions[startKey];
          if (!p1) return null;

          const pathD = makeBezierPath(p1, mousePos);
          const strokeW = getWireStrokeWidth(selectedGauge);
          const isEarthWire = selectedColor === 'GROUND_GREEN_YELLOW';
          const colorHex = isEarthWire ? 'url(#earthStripe)' : getWireColorHex(selectedColor);

          return (
            <g className="pointer-events-none">
              <path
                d={pathD}
                fill="none"
                stroke="#0f172a"
                strokeWidth={strokeW + 2}
                strokeLinecap="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke={colorHex}
                strokeWidth={strokeW}
                strokeDasharray="6 4"
                strokeLinecap="round"
                className="animate-pulse"
              />
              {/* Endpoint cursor indicator */}
              <circle
                cx={mousePos.x}
                cy={mousePos.y}
                r="6"
                fill="#f59e0b"
                className="animate-ping opacity-60"
              />
            </g>
          );
        })()
      )}
    </svg>
  );
};
