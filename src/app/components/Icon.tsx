import React from "react";

export const ICONS = {
  bot:        ["M12 8V4H8", "M12 8V4h4", "M3 12a9 9 0 1018 0 9 9 0 00-18 0", "M9 12h.01M15 12h.01"],
  map:        ["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"],
  train:      ["M4 15l2-8h12l2 8", "M4 15h16", "M9 15v4m6-4v4", "M9 7h6"],
  gauge:      ["M12 2a10 10 0 100 20A10 10 0 0012 2", "M12 12l4-4"],
  alertTriangle: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  leaf:       ["M11 20A7 7 0 014 13c0-4.6 3.4-8 8-8 1.7 0 3.3.6 4.5 1.5M21 3l-7 9M11 20l2-9"],
  stadium:    ["M3 9h18M3 15h18", "M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"],
  dashboard:  ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
  home:       ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  messageSquare: ["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
  trophy:     ["M8 21h8M12 17v4M5 3h14", "M5 3a7 7 0 007 10A7 7 0 0019 3"],
  cpu:        ["M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"],
  zap:        ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  recycle:    ["M1 4v6h6", "M23 20v-6h-6", "M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"],
  droplet:    ["M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"],
  battery:    ["M17 7H7a5 5 0 000 10h10a5 5 0 000-10z", "M22 11v2"],
  shoppingBag:["M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z", "M3 6h18", "M16 10a4 4 0 01-8 0"],
  users:      ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75", "M9 7a4 4 0 100 8 4 4 0 000-8z"],
  arrowRight: ["M5 12h14M12 5l7 7-7 7"],
  chevronRight: ["M9 18l6-6-6-6"],
  volume2:    ["M11 5L6 9H2v6h4l5 4V5z", "M15.54 8.46a5 5 0 010 7.07"],
  volumeX:    ["M11 5L6 9H2v6h4l5 4V5z", "M23 9l-6 6M17 9l6 6"],
  mic:        ["M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z", "M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"],
  micOff:     ["M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6", "M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"],
  navigation: ["M3 11l19-9-9 19-2-8-8-2z"],
  send:       ["M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"],
  globe:      ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M2 12h20", "M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"],
  pin:        ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z", "M12 10a3 3 0 100-6 3 3 0 000 6z"],
  user:       ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8z"],
  arrowLeft:  ["M19 12H5M12 19l-7-7 7-7"],
  stop:       ["M3 3h18v18H3z"],
  wheelchair: ["M12 4a2 2 0 100-4 2 2 0 000 4z", "M9 13a4 4 0 004 4h2a4 4 0 004-4v-4h-8v4z"],
  chair:      ["M7 10V5a2 2 0 012-2h6a2 2 0 012 2v5M5 21V10h14v11M9 15h6"],
  door:       ["M15 3H6a2 2 0 00-2 2v14a2 2 0 002 2h9M10 11l4 4-4 4M20 15H10"],
  utensils:   ["M3 3v8a5 5 0 005 5h1M8 11V3M18 3v13M18 3a3 3 0 00-3 3v5"],
  plusSquare: ["M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M12 7v10M7 12h10"],
  bus:        ["M4 6h16v10H4zM6 16v3M18 16v3M4 12h16"],
  shuttle:    ["M3 8h18v10H3zM6 18v2M18 18v2M7 12h10"],
  car:        ["M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"],
  walking:    ["M18 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", "M12 10a2 2 0 100-4 2 2 0 000 4z", "M13 10l-2 4-2-2-3 5"],
  bike:       ["M18 17a3 3 0 100-6 3 3 0 000 6z", "M6 17a3 3 0 100-6 3 3 0 000 6z", "M12 9l-4 4h8l-4-4z"],
  check:      ["M20 6L9 17l-5-5"],
  target:     ["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 17a5 5 0 100-10 5 5 0 000 10z", "M12 13a1 1 0 100-2 1 1 0 000 2z"],
  clock:      ["M12 6v6l4 2", "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"],
  info:       ["M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"],
  arrowUp:    ["M12 19V5M5 12l7-7 7 7"],
  arrowDown:  ["M12 5v14M5 12l7 7 7-7"],
  chevronUp:  ["M18 15l-6-6-6 6"],
  chevronDown:["M6 9l6 6 6-6"],
  flame:      ["M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3.5z"],
  shield:     ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]
} as const;

export type IconKey = keyof typeof ICONS;

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconKey;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  stroke = "currentColor",
  strokeWidth = 1.8,
  ...props
}: IconProps) {
  const paths = ICONS[name] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths.map((path, i) => (
        <path key={i} d={path} />
      ))}
    </svg>
  );
}
