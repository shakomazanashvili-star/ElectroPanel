import React from 'react';
import {
  ComponentThermalData,
  PanelThermalState,
  PlacedComponent,
} from '../types';
import { getThermalColor } from '../engine/thermalEngine';

interface ThermalOverlayProps {
  thermalState: PanelThermalState;
  components: PlacedComponent[];
  containerWidth?: number;
}

export const ThermalOverlay: React.FC<ThermalOverlayProps> = ({
  thermalState,
  components,
}) => {
  if (!thermalState.isThermalOverlayActive || !thermalState.showHeatPlumes) {
    return null;
  }

  const { palette, opacity, maxBoardTempC, minBoardTempC } = thermalState;
  const minTemp = 20;
  const maxTemp = Math.max(85, maxBoardTempC + 10);

  // Group components by rail
  const railGroups: Record<string, PlacedComponent[]> = {};
  components.forEach((comp) => {
    if (!railGroups[comp.railId]) railGroups[comp.railId] = [];
    railGroups[comp.railId].push(comp);
  });

  return (
    <div
      className="absolute inset-0 pointer-events-none z-5 overflow-hidden rounded-3xl transition-opacity duration-300"
      style={{ opacity }}
    >
      {/* Background ambient infrared noise / thermal background texture */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${getThermalColor(
            35,
            minTemp,
            maxTemp,
            palette,
            0.25
          )} 0%, transparent 80%)`,
        }}
      />

      {/* SVG Canvas for continuous heat contours & radiant plumes */}
      <svg className="w-full h-full absolute inset-0">
        <defs>
          {/* Radial Gradients for hot components */}
          {components.map((comp) => {
            const data = thermalState.componentsThermal[comp.id];
            const temp = data?.effectiveTempC || 25;
            const centerColor = getThermalColor(temp, minTemp, maxTemp, palette, 0.85);
            const midColor = getThermalColor(
              temp * 0.75 + minTemp * 0.25,
              minTemp,
              maxTemp,
              palette,
              0.5
            );
            const edgeColor = getThermalColor(minTemp, minTemp, maxTemp, palette, 0.0);

            return (
              <radialGradient
                key={`grad-${comp.id}`}
                id={`thermal-glow-${comp.id}`}
                cx="50%"
                cy="50%"
                r="50%"
                fx="50%"
                fy="50%"
              >
                <stop offset="0%" stopColor={centerColor} />
                <stop offset="50%" stopColor={midColor} />
                <stop offset="100%" stopColor={edgeColor} />
              </radialGradient>
            );
          })}

          {/* Filter for realistic thermal heat blur */}
          <filter id="thermal-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Global ambient DIN rail heat wave streams */}
        {Object.entries(railGroups).map(([railId, railComps], rIdx) => {
          const avgRailTemp =
            railComps.reduce((acc, c) => {
              const d = thermalState.componentsThermal[c.id];
              return acc + (d?.effectiveTempC || 25);
            }, 0) / (railComps.length || 1);

          if (avgRailTemp <= 30) return null;

          const railColor = getThermalColor(avgRailTemp, minTemp, maxTemp, palette, 0.35);

          return (
            <rect
              key={`rail-ambient-${railId}`}
              x="2%"
              y={`${18 + rIdx * 28}%`}
              width="96%"
              height="18%"
              rx="24"
              fill={railColor}
              filter="url(#thermal-blur)"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
    </div>
  );
};
