import React from 'react';
import { motion } from 'motion/react';

const CITIES = [
  { name: 'Delhi', x: 350, y: 250 },
  { name: 'Mumbai', x: 250, y: 550 },
  { name: 'Bangalore', x: 320, y: 700 },
  { name: 'Chennai', x: 380, y: 680 },
  { name: 'Kolkata', x: 550, y: 450 },
  { name: 'Hyderabad', x: 350, y: 580 },
  { name: 'Ahmedabad', x: 220, y: 420 },
  { name: 'Jaipur', x: 300, y: 320 },
  { name: 'Lucknow', x: 420, y: 320 },
];

const ROUTES = [
  { from: 0, to: 1, path: "M 350 250 Q 280 400 250 550" }, // Delhi to Mumbai
  { from: 1, to: 2, path: "M 250 550 Q 280 650 320 700" }, // Mumbai to Bangalore
  { from: 2, to: 3, path: "M 320 700 Q 350 720 380 680" }, // Bangalore to Chennai
  { from: 3, to: 5, path: "M 380 680 Q 380 600 350 580" }, // Chennai to Hyderabad
  { from: 5, to: 1, path: "M 350 580 Q 300 550 250 550" }, // Hyderabad to Mumbai
  { from: 0, to: 4, path: "M 350 250 Q 450 350 550 450" }, // Delhi to Kolkata
  { from: 4, to: 5, path: "M 550 450 Q 450 550 350 580" }, // Kolkata to Hyderabad
  { from: 0, to: 7, path: "M 350 250 Q 320 280 300 320" }, // Delhi to Jaipur
  { from: 7, to: 6, path: "M 300 320 Q 250 380 220 420" }, // Jaipur to Ahmedabad
  { from: 6, to: 1, path: "M 220 420 Q 220 500 250 550" }, // Ahmedabad to Mumbai
  { from: 0, to: 8, path: "M 350 250 Q 380 280 420 320" }, // Delhi to Lucknow
  { from: 8, to: 4, path: "M 420 320 Q 480 380 550 450" }, // Lucknow to Kolkata
];

export default function IndiaMapBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
      <svg 
        viewBox="0 0 800 1000" 
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Draw Routes */}
        {ROUTES.map((route, i) => (
          <g key={`route-${i}`}>
            {/* Base Path */}
            <path
              d={route.path}
              fill="none"
              stroke="#4f46e5"
              strokeWidth="1.5"
              strokeOpacity="0.15"
              strokeDasharray="4 4"
            />
            {/* Animated Car/Dot */}
            <motion.circle
              r="3"
              fill="#818cf8"
              filter="url(#glow)"
            >
              <animateMotion
                dur={`${3 + (i % 3)}s`}
                repeatCount="indefinite"
                path={route.path}
              />
            </motion.circle>
            {/* Reverse Animated Car/Dot */}
            <motion.circle
              r="2"
              fill="#c7d2fe"
              filter="url(#glow)"
            >
              <animateMotion
                dur={`${4 + (i % 2)}s`}
                repeatCount="indefinite"
                path={route.path}
                keyPoints="1;0"
                keyTimes="0;1"
                calcMode="linear"
              />
            </motion.circle>
          </g>
        ))}

        {/* Draw Cities */}
        {CITIES.map((city, i) => (
          <g key={`city-${i}`}>
            <circle
              cx={city.x}
              cy={city.y}
              r="4"
              fill="#4f46e5"
              className="animate-pulse"
            />
            <circle
              cx={city.x}
              cy={city.y}
              r="12"
              fill="#4f46e5"
              opacity="0.1"
            />
            <text
              x={city.x + 10}
              y={city.y + 4}
              fill="#6366f1"
              fontSize="12"
              fontWeight="600"
              className="opacity-70"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {city.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
