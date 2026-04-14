import React, { useEffect, useState, useRef } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

interface MovingCarMarkerProps {
  routePath: L.LatLngExpression[];
}

export default function MovingCarMarker({ routePath }: MovingCarMarkerProps) {
  const [position, setPosition] = useState<L.LatLngExpression | null>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!routePath || routePath.length < 2) {
      setPosition(null);
      return;
    }

    // Calculate total distance to normalize speed
    let totalDistance = 0;
    const segments: number[] = [];
    
    for (let i = 0; i < routePath.length - 1; i++) {
      const p1 = L.latLng(routePath[i]);
      const p2 = L.latLng(routePath[i + 1]);
      const dist = p1.distanceTo(p2);
      totalDistance += dist;
      segments.push(dist);
    }

    const duration = 8000; // 8 seconds for full trip
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Loop animation every 'duration' ms
      const progress = (elapsed % duration) / duration;
      
      // Find current segment
      let targetDistance = progress * totalDistance;
      let currentDistance = 0;
      let segmentIndex = 0;
      
      for (let i = 0; i < segments.length; i++) {
        if (currentDistance + segments[i] >= targetDistance) {
          segmentIndex = i;
          break;
        }
        currentDistance += segments[i];
      }
      
      if (segmentIndex >= routePath.length - 1) {
        segmentIndex = routePath.length - 2;
      }
      
      const p1 = L.latLng(routePath[segmentIndex]);
      const p2 = L.latLng(routePath[segmentIndex + 1]);
      
      const segmentProgress = segments[segmentIndex] === 0 ? 0 : (targetDistance - currentDistance) / segments[segmentIndex];
      
      const lat = p1.lat + (p2.lat - p1.lat) * segmentProgress;
      const lng = p1.lng + (p2.lng - p1.lng) * segmentProgress;
      
      setPosition([lat, lng]);
      
      // Calculate rotation
      const angle = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * (180 / Math.PI);
      setRotation(angle);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [routePath]);

  if (!position) return null;

  const rotatedIcon = new L.DivIcon({
    className: 'moving-car-icon',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: white;
        border-radius: 50%;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${rotation}deg);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(-90deg);">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return <Marker position={position} icon={rotatedIcon} zIndexOffset={1000} />;
}
