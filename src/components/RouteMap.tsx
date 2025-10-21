import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

interface RouteMapProps {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  startLabel?: string;
  endLabel?: string;
  driverLocation?: { lat: number; lng: number };
  className?: string;
}

const RouteMap = ({
  start,
  end,
  startLabel = 'Start',
  endLabel = 'End',
  driverLocation,
  className = 'h-[400px] w-full rounded-lg',
}: RouteMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routingControlRef = useRef<any>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([start.lat, start.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update route when start/end changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing routing control
    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
    }

    // Create routing control
    const routingControl = (L as any).Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng),
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#2563eb', weight: 5, opacity: 0.7 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
      createMarker: function (i: number, waypoint: any) {
        const label = i === 0 ? startLabel : endLabel;
        const iconHtml = i === 0
          ? `<div class="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full border-2 border-white shadow-lg">
               <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
               </svg>
             </div>`
          : `<div class="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full border-2 border-white shadow-lg">
               <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
               </svg>
             </div>`;

        return L.marker(waypoint.latLng, {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: iconHtml,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          }),
        }).bindPopup(label);
      },
    }).addTo(mapRef.current);

    routingControlRef.current = routingControl;
  }, [start, end, startLabel, endLabel]);

  // Update driver location marker
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;

    // Remove existing driver marker
    if (driverMarkerRef.current) {
      mapRef.current.removeLayer(driverMarkerRef.current);
    }

    // Add driver marker
    const driverIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse">
               <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                 <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
               </svg>
             </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const marker = L.marker([driverLocation.lat, driverLocation.lng], {
      icon: driverIcon,
    }).addTo(mapRef.current);

    marker.bindPopup('Driver Location');
    driverMarkerRef.current = marker;
  }, [driverLocation]);

  return <div ref={mapContainerRef} className={className} />;
};

export default RouteMap;
