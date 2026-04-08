import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

interface LocationData {
  lat: number;
  lng: number;
  displayName: string;
}

interface InteractiveMapProps {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  destinations?: (LocationData | null)[];
}

function MapUpdater({ from, to, destinations }: { from: LocationData | null, to: LocationData | null, destinations: (LocationData | null)[] }) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [];
    if (from) points.push([from.lat, from.lng]);
    
    destinations.forEach(d => {
      if (d) points.push([d.lat, d.lng]);
    });
    
    if (to) points.push([to.lat, to.lng]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    } else {
      // Default to India
      map.setView([20.5937, 78.9629], 5);
    }
    
    // Fix for map not rendering correctly and pins being offset
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [from, to, destinations, map]);

  return null;
}

export default function InteractiveMap({ fromLocation, toLocation, destinations = [] }: InteractiveMapProps) {
  const points: L.LatLngExpression[] = [];
  if (fromLocation) points.push([fromLocation.lat, fromLocation.lng]);
  destinations.forEach(d => {
    if (d) points.push([d.lat, d.lng]);
  });
  if (toLocation) points.push([toLocation.lat, toLocation.lng]);

  return (
    <div className="h-[300px] w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 z-0">
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} attributionControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {fromLocation && (
          <Marker position={[fromLocation.lat, fromLocation.lng]} icon={customIcon}>
            <Popup>Pickup: {fromLocation.displayName}</Popup>
          </Marker>
        )}
        
        {destinations.map((d, i) => d && (
          <Marker key={i} position={[d.lat, d.lng]} icon={customIcon}>
            <Popup>Stop {i + 1}: {d.displayName}</Popup>
          </Marker>
        ))}

        {toLocation && (
          <Marker position={[toLocation.lat, toLocation.lng]} icon={customIcon}>
            <Popup>Dropoff: {toLocation.displayName}</Popup>
          </Marker>
        )}

        {points.length > 1 && (
          <Polyline positions={points} color="#4f46e5" weight={4} opacity={0.7} dashArray="10, 10" />
        )}

        <MapUpdater from={fromLocation} to={toLocation} destinations={destinations} />
      </MapContainer>
    </div>
  );
}
