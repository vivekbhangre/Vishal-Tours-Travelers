import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

const CITIES = [
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 }
];

// Generate arcs between cities
const ARCS = [
  { startLat: CITIES[0].lat, startLng: CITIES[0].lng, endLat: CITIES[1].lat, endLng: CITIES[1].lng, color: ['#4f46e5', '#818cf8'] },
  { startLat: CITIES[1].lat, startLng: CITIES[1].lng, endLat: CITIES[2].lat, endLng: CITIES[2].lng, color: ['#818cf8', '#c7d2fe'] },
  { startLat: CITIES[0].lat, startLng: CITIES[0].lng, endLat: CITIES[3].lat, endLng: CITIES[3].lng, color: ['#4f46e5', '#818cf8'] },
  { startLat: CITIES[2].lat, startLng: CITIES[2].lng, endLat: CITIES[4].lat, endLng: CITIES[4].lng, color: ['#818cf8', '#c7d2fe'] },
  { startLat: CITIES[5].lat, startLng: CITIES[5].lng, endLat: CITIES[8].lat, endLng: CITIES[8].lng, color: ['#4f46e5', '#818cf8'] },
  { startLat: CITIES[0].lat, startLng: CITIES[0].lng, endLat: CITIES[6].lat, endLng: CITIES[6].lng, color: ['#818cf8', '#c7d2fe'] },
  { startLat: CITIES[6].lat, startLng: CITIES[6].lng, endLat: CITIES[7].lat, endLng: CITIES[7].lng, color: ['#4f46e5', '#818cf8'] },
  { startLat: CITIES[7].lat, startLng: CITIES[7].lng, endLat: CITIES[1].lat, endLng: CITIES[1].lng, color: ['#818cf8', '#c7d2fe'] },
];

export default function CinematicGlobeBackground() {
  const globeEl = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      // Focus on India
      globeEl.current.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 1.2 }, 2000);
      
      // Auto-rotate slowly
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.controls().enableZoom = false;
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-90 flex items-center justify-center overflow-hidden mix-blend-screen">
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        arcsData={ARCS}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcsTransitionDuration={1000}
        arcStroke={1}
        pointsData={CITIES}
        pointColor={() => '#818cf8'}
        pointAltitude={0.01}
        pointRadius={0.5}
        pointsMerge={true}
      />
    </div>
  );
}
