import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CITIES = {
  delhi: [28.6139, 77.2090],
  mumbai: [19.0760, 72.8777],
  bangalore: [12.9716, 77.5946],
  kolkata: [22.5726, 88.3639],
  chennai: [13.0827, 80.2707],
  hyderabad: [17.3850, 78.4867],
  jaipur: [26.9124, 75.7873],
  ahmedabad: [23.0225, 72.5714],
  pune: [18.5204, 73.8567]
};

const ROUTES_TO_FETCH = [
  { from: CITIES.delhi, to: CITIES.mumbai },
  { from: CITIES.mumbai, to: CITIES.bangalore },
  { from: CITIES.delhi, to: CITIES.kolkata },
  { from: CITIES.bangalore, to: CITIES.chennai },
  { from: CITIES.hyderabad, to: CITIES.pune },
  { from: CITIES.delhi, to: CITIES.jaipur },
  { from: CITIES.jaipur, to: CITIES.ahmedabad },
];

const carIcon = new L.DivIcon({
  className: 'moving-car-icon',
  html: `<div style="width: 10px; height: 10px; background-color: #818cf8; border-radius: 50%; box-shadow: 0 0 10px #818cf8, 0 0 20px #818cf8; border: 2px solid white;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const reverseCarIcon = new L.DivIcon({
  className: 'moving-car-icon-reverse',
  html: `<div style="width: 8px; height: 8px; background-color: #c7d2fe; border-radius: 50%; box-shadow: 0 0 8px #c7d2fe; border: 1px solid white;"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4]
});

function MovingCar({ path, duration = 10000, reverse = false }: { path: [number, number][], duration?: number, reverse?: boolean }) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (!path || path.length < 2) return;
    
    let startTime: number | null = null;
    let animationFrameId: number;
    const actualPath = reverse ? [...path].reverse() : path;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      let progress = (elapsed % duration) / duration;

      const totalSegments = actualPath.length - 1;
      const exactSegment = progress * totalSegments;
      const segmentIndex = Math.floor(exactSegment);
      const segmentProgress = exactSegment - segmentIndex;

      if (segmentIndex < totalSegments) {
        const start = actualPath[segmentIndex];
        const end = actualPath[segmentIndex + 1];
        const lat = start[0] + (end[0] - start[0]) * segmentProgress;
        const lng = start[1] + (end[1] - start[1]) * segmentProgress;
        
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [path, duration, reverse]);

  if (!path || path.length < 1) return null;
  return <Marker position={path[0]} icon={reverse ? reverseCarIcon : carIcon} ref={markerRef} />;
}

export default function RealisticMapBackground() {
  const [routes, setRoutes] = useState<[number, number][][]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRoutes = async () => {
      const fetchedRoutes: [number, number][][] = [];
      for (const route of ROUTES_TO_FETCH) {
        try {
          const coords = `${route.from[1]},${route.from[0]};${route.to[1]},${route.to[0]}`;
          // Use simplified geometry for background to save memory and load faster
          const res = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=simplified&geometries=geojson`);
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes[0]) {
              const routeCoords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
              fetchedRoutes.push(routeCoords);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch background route", e);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (isMounted) {
        setRoutes(fetchedRoutes);
      }
    };
    fetchRoutes();
    return () => { isMounted = false; };
  }, []);

  // Dark theme map for the background
  const tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-50">
      <MapContainer 
        center={[22.5937, 78.9629]} 
        zoom={5} 
        style={{ height: '100%', width: '100%', background: '#1e293b' }} 
        attributionControl={false}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer url={tileUrl} />
        {routes.map((route, i) => (
          <React.Fragment key={i}>
            <Polyline positions={route} color="#4f46e5" weight={2} opacity={0.2} />
            <MovingCar path={route} duration={15000 + (i * 2000)} />
            <MovingCar path={route} duration={18000 + (i * 3000)} reverse={true} />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
