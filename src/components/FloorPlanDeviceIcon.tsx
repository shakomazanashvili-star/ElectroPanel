import React from 'react';
import { FloorPlanDeviceType } from '../types';

interface FloorPlanDeviceIconProps {
  type: FloorPlanDeviceType;
  className?: string;
  size?: number;
  isSelected?: boolean;
  isHovered?: boolean;
  color?: string;
}

export const FloorPlanDeviceIcon: React.FC<FloorPlanDeviceIconProps> = ({
  type,
  className = '',
  size = 28,
  isSelected = false,
  isHovered = false,
  color,
}) => {
  const strokeColor = color || (isSelected ? '#f59e0b' : isHovered ? '#60a5fa' : '#e2e8f0');
  const fillColor = isSelected ? '#f59e0b' : '#38bdf8';

  const renderSymbol = () => {
    switch (type) {
      // 1. Switches (GOST / IEC Standard Architectural Symbols)
      case 'SWITCH_1G':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="6" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-6" x2="0" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-12" x2="6" y2="-12" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'SWITCH_2G':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="6" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-6" x2="0" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-12" x2="6" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-9" x2="5" y2="-9" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'SWITCH_3G':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="6" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-6" x2="0" y2="-13" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-13" x2="6" y2="-13" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-10" x2="5" y2="-10" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-7" x2="4" y2="-7" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'SWITCH_2WAY':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="6" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-6" x2="0" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-12" x2="6" y2="-12" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-12" x2="-6" y2="-12" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'SWITCH_INTERMEDIATE':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="6" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-6" x2="0" y2="-13" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-13" x2="6" y2="-13" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-13" x2="-6" y2="-13" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-9" x2="5" y2="-9" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="-9" x2="-5" y2="-9" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      // 2. Sockets (IEC / GOST)
      case 'SOCKET_SINGLE':
        return (
          <g transform="translate(14, 14)">
            <path d="M -8 0 A 8 8 0 0 1 8 0 Z" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="0" x2="0" y2="8" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'SOCKET_DOUBLE':
        return (
          <g transform="translate(14, 14)">
            <path d="M -9 0 A 9 9 0 0 1 9 0 Z" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="-9" y1="0" x2="9" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="-3" y1="0" x2="-3" y2="8" stroke={strokeColor} strokeWidth="2" />
            <line x1="3" y1="0" x2="3" y2="8" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'SOCKET_IP44':
        return (
          <g transform="translate(14, 14)">
            <path d="M -8 0 A 8 8 0 0 1 8 0 Z" fill={fillColor} fillOpacity="0.4" stroke={strokeColor} strokeWidth="2" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke={strokeColor} strokeWidth="2" />
            <line x1="0" y1="0" x2="0" y2="8" stroke={strokeColor} strokeWidth="2" />
            <circle cx="0" cy="-3" r="1.5" fill={strokeColor} />
          </g>
        );

      case 'SOCKET_INTERNET':
        return (
          <g transform="translate(14, 14)">
            <polygon points="0,-9 9,6 -9,6" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <text x="0" y="3" textAnchor="middle" fill={strokeColor} fontSize="7" fontWeight="bold" fontFamily="monospace">
              IT
            </text>
          </g>
        );

      case 'SOCKET_TV':
        return (
          <g transform="translate(14, 14)">
            <polygon points="0,-9 9,6 -9,6" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <text x="0" y="3" textAnchor="middle" fill={strokeColor} fontSize="7" fontWeight="bold" fontFamily="monospace">
              TV
            </text>
          </g>
        );

      // 3. Distribution & Panels
      case 'JUNCTION_BOX':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="7" fill="#1e1b4b" stroke={strokeColor} strokeWidth="2" />
            <circle cx="0" cy="0" r="3" fill={strokeColor} />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="0" y1="-7" x2="0" y2="7" stroke={strokeColor} strokeWidth="1.5" />
          </g>
        );

      case 'PANEL_BOARD':
        return (
          <g transform="translate(14, 14)">
            <rect x="-10" y="-8" width="20" height="16" fill="#450a0a" stroke="#ef4444" strokeWidth="2" rx="2" />
            <polygon points="-10,-8 10,-8 -10,8" fill="#ef4444" fillOpacity="0.8" />
            <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="black" fontFamily="sans-serif">
              ⚡
            </text>
          </g>
        );

      // 4. Lighting Fixtures
      case 'LIGHT_CEILING':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="7" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="-5" y1="-5" x2="5" y2="5" stroke={strokeColor} strokeWidth="2" />
            <line x1="-5" y1="5" x2="5" y2="-5" stroke={strokeColor} strokeWidth="2" />
          </g>
        );

      case 'LIGHT_SPOT':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="5" fill="#facc15" fillOpacity="0.3" stroke={strokeColor} strokeWidth="2" />
            <circle cx="0" cy="0" r="2" fill={strokeColor} />
          </g>
        );

      case 'LIGHT_LED_STRIP':
        return (
          <g transform="translate(14, 14)">
            <rect x="-10" y="-4" width="20" height="8" fill="#422006" stroke={strokeColor} strokeWidth="1.5" rx="1" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#facc15" strokeWidth="2" strokeDasharray="2 1" />
          </g>
        );

      case 'LIGHT_WALL':
        return (
          <g transform="translate(14, 14)">
            <path d="M -8 2 A 8 8 0 0 1 8 2 Z" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
            <line x1="-10" y1="2" x2="10" y2="2" stroke={strokeColor} strokeWidth="2" />
            <line x1="-4" y1="-2" x2="4" y2="-2" stroke={strokeColor} strokeWidth="1.5" />
          </g>
        );

      // 5. Heavy Appliances
      case 'AC_UNIT':
        return (
          <g transform="translate(14, 14)">
            <rect x="-11" y="-6" width="22" height="12" fill="#082f49" stroke={strokeColor} strokeWidth="1.5" rx="2" />
            <text x="0" y="3" textAnchor="middle" fill="#38bdf8" fontSize="7" fontWeight="bold">
              A/C
            </text>
          </g>
        );

      case 'WATER_HEATER':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="8" fill="#431407" stroke={strokeColor} strokeWidth="2" />
            <text x="0" y="3" textAnchor="middle" fill="#fb923c" fontSize="7" fontWeight="bold">
              WH
            </text>
          </g>
        );

      case 'COOKTOP':
        return (
          <g transform="translate(14, 14)">
            <rect x="-9" y="-9" width="18" height="18" fill="#450a0a" stroke={strokeColor} strokeWidth="1.5" rx="2" />
            <circle cx="-4" cy="-4" r="2.5" stroke={strokeColor} strokeWidth="1" fill="none" />
            <circle cx="4" cy="-4" r="2" stroke={strokeColor} strokeWidth="1" fill="none" />
            <circle cx="-4" cy="4" r="2" stroke={strokeColor} strokeWidth="1" fill="none" />
            <circle cx="4" cy="4" r="3" stroke={strokeColor} strokeWidth="1" fill="none" />
          </g>
        );

      case 'EXHAUST_FAN':
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="7" fill="#0f172a" stroke={strokeColor} strokeWidth="1.5" />
            <path d="M 0 0 L 4 -4 M 0 0 L -4 4 M 0 0 L -4 -4 M 0 0 L 4 4" stroke={strokeColor} strokeWidth="1.5" />
          </g>
        );

      default:
        return (
          <g transform="translate(14, 14)">
            <circle cx="0" cy="0" r="6" fill="#334155" stroke={strokeColor} strokeWidth="2" />
          </g>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      className={`shrink-0 overflow-visible ${className}`}
    >
      {renderSymbol()}
    </svg>
  );
};
