import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    icon?: 'default' | 'active' | 'pickup' | 'drop';
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  polylines?: Array<{ points: [number, number][], color?: string }>; // optional route lines
}

const MapView = ({
  center = [51.505, -0.09],
  zoom = 13,
  markers = [],
  onMapClick,
  className = 'h-[500px] w-full rounded-lg',
  polylines = [],
}: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Initialize markers layer
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Initialize polyline layer
    const polyLayer = L.layerGroup().addTo(map);
    polylineLayerRef.current = polyLayer;

    // Handle map clicks
    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      if (!markersLayerRef.current) return;

      let icon: L.Icon | L.DivIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Custom icons based on type
      if (marker.icon === 'active') {
        icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="flex items-center justify-center w-8 h-8 bg-success rounded-full border-2 border-white shadow-lg">
                   <svg class="w-5 h-5 text-success-foreground" fill="currentColor" viewBox="0 0 20 20">
                     <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                   </svg>
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
      } else if (marker.icon === 'pickup') {
        icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="flex items-center justify-center w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg">
                   <svg class="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                   </svg>
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
      } else if (marker.icon === 'drop') {
        icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="flex items-center justify-center w-8 h-8 bg-warning rounded-full border-2 border-white shadow-lg">
                   <svg class="w-5 h-5 text-warning-foreground" fill="currentColor" viewBox="0 0 20 20">
                     <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                   </svg>
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
      }

      const leafletMarker = L.marker(marker.position, { icon });

      if (marker.popup) {
        leafletMarker.bindPopup(marker.popup);
      }

      leafletMarker.addTo(markersLayerRef.current);
    });

    // Fit bounds if there are multiple markers
    if (markers.length > 1 && mapRef.current) {
      const bounds = L.latLngBounds(markers.map((m) => m.position));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (markers.length === 1 && mapRef.current) {
      mapRef.current.setView(markers[0].position, 13);
    }
  }, [markers]);

  // Update polylines
  useEffect(() => {
    if (!polylineLayerRef.current) return;
    polylineLayerRef.current.clearLayers();
    polylines.forEach(({ points, color }) => {
      const line = L.polyline(points, { color: color || '#2563eb', weight: 4 });
      line.addTo(polylineLayerRef.current as L.LayerGroup);
    });
  }, [polylines]);

  return <div ref={mapContainerRef} className={className} />;
};

export default MapView;
