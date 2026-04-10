import React, { useEffect, useState, useMemo } from 'react';
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
  isSheetExpanded?: boolean;
}

function MapUpdater({ from, to, destinations, isSheetExpanded }: { from: LocationData | null, to: LocationData | null, destinations: (LocationData | null)[], isSheetExpanded?: boolean }) {
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
      
      // Calculate padding dynamically based on sheet state
      // If expanded, bottom sheet takes ~90vh, so we need huge bottom padding
      // If collapsed, bottom sheet takes ~50vh, so we need medium bottom padding
      const bottomPadding = isSheetExpanded ? window.innerHeight * 0.85 : window.innerHeight * 0.55;
      
      map.fitBounds(bounds, { 
        paddingTopLeft: [50, 100], 
        paddingBottomRight: [50, bottomPadding], 
        maxZoom: 13,
        animate: true,
        duration: 0.5
      });
    } else {
      // Default to India
      map.setView([20.5937, 78.9629], 5);
    }
    
    // Fix for map not rendering correctly and pins being offset
    const timeoutId = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [from, to, destinations, map, isSheetExpanded]);

  return null;
}

export default function InteractiveMap({ fromLocation, toLocation, destinations = [], isSheetExpanded = false }: InteractiveMapProps) {
  const [routePath, setRoutePath] = useState<L.LatLngExpression[]>([]);
  const points = useMemo(() => {
    const pts: L.LatLngExpression[] = [];
    if (fromLocation) pts.push([fromLocation.lat, fromLocation.lng]);
    destinations.forEach(d => {
      if (d) pts.push([d.lat, d.lng]);
    });
    if (toLocation) pts.push([toLocation.lat, toLocation.lng]);
    return pts;
  }, [fromLocation?.lat, fromLocation?.lng, toLocation?.lat, toLocation?.lng, JSON.stringify(destinations)]);

  useEffect(() => {
    let isMounted = true;

    const fetchRoute = async () => {
      if (points.length < 2) {
        if (isMounted) setRoutePath([]);
        return;
      }
      
      try {
        // OSRM expects longitude,latitude
        const coords = points.map(p => `${(p as number[])[1]},${(p as number[])[0]}`).join(';');
        
        // Using a more reliable public OSRM instance
        const res = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        
        if (!res.ok) {
          console.warn("Routing API returned an error:", res.status);
          if (isMounted) setRoutePath(points);
          return;
        }

        const data = await res.json();
        
        if (data.routes && data.routes[0] && isMounted) {
          // GeoJSON coordinates are [longitude, latitude], Leaflet expects [latitude, longitude]
          const routeCoords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setRoutePath(routeCoords);
        } else if (isMounted) {
          // Fallback to straight line if routing fails
          setRoutePath(points);
        }
      } catch (error) {
        console.warn("Could not fetch road route, falling back to straight line.");
        // Fallback to straight line
        if (isMounted) setRoutePath(points);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchRoute();
    }, 500); // Debounce route fetching by 500ms

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [points]);

  return (
    <div className="h-full w-full z-0">
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
          <Marker key={`dest-${d.lat}-${d.lng}-${i}`} position={[d.lat, d.lng]} icon={customIcon}>
            <Popup>Stop {i + 1}: {d.displayName}</Popup>
          </Marker>
        ))}

        {toLocation && (
          <Marker position={[toLocation.lat, toLocation.lng]} icon={customIcon}>
            <Popup>Dropoff: {toLocation.displayName}</Popup>
          </Marker>
        )}

        {routePath.length > 1 && (
          <Polyline positions={routePath} color="#4f46e5" weight={5} opacity={0.8} />
        )}

        <MapUpdater from={fromLocation} to={toLocation} destinations={destinations} isSheetExpanded={isSheetExpanded} />
      </MapContainer>
    </div>
  );
}
