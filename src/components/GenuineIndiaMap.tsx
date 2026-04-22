import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useTheme } from '../context/ThemeContext';

// Custom Car SVG Icon Generator
const getCarIcon = () => {
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 30 50" width="100%" height="100%">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.4)" />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <!-- Car Body -->
        <rect x="2" y="2" width="16" height="36" rx="4" fill="#ef4444" />
        <!-- Roof -->
        <rect x="4" y="12" width="12" height="16" rx="2" fill="#991b1b" />
        <!-- Front Windshield -->
        <path d="M 4 12 L 16 12 L 14 8 L 6 8 Z" fill="#3b82f6" />
        <!-- Rear Windshield -->
        <path d="M 4 28 L 16 28 L 14 32 L 6 32 Z" fill="#3b82f6" />
        <!-- Headlights -->
        <circle cx="5" cy="3" r="2" fill="#fef08a" />
        <circle cx="15" cy="3" r="2" fill="#fef08a" />
        <!-- Taillights -->
        <rect x="3" y="36" width="4" height="2" fill="#f472b6" />
        <rect x="13" y="36" width="4" height="2" fill="#f472b6" />
      </g>
    </svg>
  `;

  return new L.DivIcon({
    className: 'custom-car-icon',
    html: `<div class="car-rotator" style="width: 20px; height: 40px; margin-left: -10px; margin-top: -20px; will-change: transform;">${svgString}</div>`,
    iconSize: [0, 0], // Handled by inner div
    iconAnchor: [0, 0]
  });
};

interface AnimatedCarMarkerProps {
  start: [number, number];
  end: [number, number];
  duration: number;
  delay: number;
  theme?: string;
}

const AnimatedCarMarker: React.FC<AnimatedCarMarkerProps> = ({ start, end, duration, delay, theme }) => {
  const markerRef = useRef<L.Marker>(null);
  const iconRef = useRef(getCarIcon()); // Create icon once

  useEffect(() => {
    let startTime: number | null = null;
    let reqId: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      if (elapsed < delay) {
        reqId = requestAnimationFrame(animate);
        return;
      }

      const activeTime = elapsed - delay;
      const cycleTime = duration * 2;
      const currentCycle = activeTime % cycleTime;
      const isForward = currentCycle < duration;
      const progress = isForward ? currentCycle / duration : (cycleTime - currentCycle) / duration;

      // Calculate current position
      const lat = start[0] + (end[0] - start[0]) * progress;
      const lng = start[1] + (end[1] - start[1]) * progress;
      
      // Calculate angle
      const latDiff = end[0] - start[0];
      const lngDiff = end[1] - start[1];
      
      let currentAngle = Math.atan2(lngDiff, latDiff) * (180 / Math.PI);
      if (!isForward) {
        currentAngle += 180;
      }

      // Update DOM directly for 60fps performance without React re-renders
      const marker = markerRef.current;
      if (marker) {
        marker.setLatLng([lat, lng]);
        const el = marker.getElement();
        if (el) {
          const rotator = el.querySelector('.car-rotator') as HTMLElement;
          if (rotator) {
            rotator.style.transform = `rotate(${currentAngle}deg)`;
          }
        }
      }

      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqId);
  }, [start, end, duration, delay]);

  return (
    <>
      <Polyline positions={[start, end]} color={theme === 'dark' ? '#000000' : '#3b82f6'} weight={theme === 'dark' ? 4 : 3} dashArray="5, 10" opacity={theme === 'dark' ? 0.9 : 0.6} />
      <Marker position={start} icon={iconRef.current} ref={markerRef} />
    </>
  );
};

const CITIES: [number, number][] = [
  [22.0869, 79.5433], // Seoni
  [23.1815, 79.9864], // Jabalpur
  [28.6139, 77.2090], // Delhi
  [27.1767, 78.0081], // Agra
  [19.0760, 72.8777], // Mumbai
  [18.5204, 73.8567], // Pune
  [12.9716, 77.5946], // Bangalore
  [12.2958, 76.6394], // Mysore
  [13.0827, 80.2707], // Chennai
  [11.9416, 79.8083], // Pondicherry
  [17.3850, 78.4867], // Hyderabad
  [17.9689, 79.5941], // Warangal
  [26.9124, 75.7873], // Jaipur
  [24.5854, 73.7125], // Udaipur
  [23.0225, 72.5714], // Ahmedabad
  [21.1702, 72.8311], // Surat
  [22.5726, 88.3639], // Kolkata
  [23.5204, 87.3119], // Durgapur
  [26.8467, 80.9462], // Lucknow
  [26.4499, 80.3319], // Kanpur
  [23.2599, 77.4126], // Bhopal
  [22.7196, 75.8577], // Indore
  [21.1458, 79.0882], // Nagpur
  [20.9320, 77.7523], // Amravati
  [30.7333, 76.7794], // Chandigarh
  [15.2993, 74.1240], // Goa
  [20.2961, 85.8245], // Bhubaneswar
  [16.5062, 80.6480], // Vijayawada
  [26.2389, 73.0243], // Jodhpur
  [22.3039, 70.8022], // Rajkot
  [25.5941, 85.1376], // Patna
  [23.3441, 85.3096], // Ranchi
  [26.1445, 91.7362], // Guwahati
  [25.5788, 91.8933], // Shillong
  [9.9312, 76.2673],  // Kochi
  [8.5241, 76.9366],  // Trivandrum
];

const generateRandomRoutes = (count: number): AnimatedCarMarkerProps[] => {
  const routes: AnimatedCarMarkerProps[] = [];
  for (let i = 0; i < count; i++) {
    // Pick random start and end cities ensuring they are different
    const startIndex = Math.floor(Math.random() * CITIES.length);
    let endIndex = Math.floor(Math.random() * CITIES.length);
    while (endIndex === startIndex) {
      endIndex = Math.floor(Math.random() * CITIES.length);
    }
    
    const start = CITIES[startIndex];
    const end = CITIES[endIndex];
    
    // Calculate distance to determine duration (approx)
    const latDiff = end[0] - start[0];
    const lngDiff = end[1] - start[1];
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    // Duration between 2s and 6s depending on distance
    const duration = Math.max(2000, Math.min(6000, Math.floor(distance * 400)));
    const delay = Math.floor(Math.random() * 3000);

    routes.push({ start, end, duration, delay });
  }
  return routes;
};

// Generate 25 random routes
const ROUTES: AnimatedCarMarkerProps[] = generateRandomRoutes(25);

const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [8.4, 68.7],
  [37.6, 97.2]
];

export default function GenuineIndiaMap() {
  const { theme } = useTheme();
  // Using useMemo to prevent re-generating routes on theme change
  const randomRoutes = React.useMemo(() => generateRandomRoutes(35), []);

  return (
    <div className="absolute inset-0 flex justify-center items-center overflow-hidden pointer-events-none">
      {/* Wrapper forcing map aspect ratio to match India's coordinates, guaranteeing Gilgit and Sri Lanka align with page top/bottom */}
      <div 
        className={`relative h-full min-w-full flex-shrink-0 transition-all duration-500 ${theme === 'dark' ? 'invert hue-rotate-180 brightness-[0.85] contrast-[1.2] grayscale-[0.2]' : 'contrast-[1.1] saturate-[1.2]'}`} 
        style={{ aspectRatio: '28.5 / 29.2' }}
      >
        {/* Map Container */}
        <MapContainer
          bounds={INDIA_BOUNDS}
          maxBounds={INDIA_BOUNDS}
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          dragging={false}
          touchZoom={false}
          attributionControl={false}
          className="absolute inset-0 w-full h-full rounded-none"
        >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {randomRoutes.map((route, index) => (
          <AnimatedCarMarker
            key={index}
            start={route.start}
            end={route.end}
            duration={route.duration}
            delay={route.delay}
            theme={theme}
          />
        ))}
      </MapContainer>
      </div>

      {/* Uniform Overlay for text readability without uneven gradients */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none z-[400]"></div>
    </div>
  );
}
