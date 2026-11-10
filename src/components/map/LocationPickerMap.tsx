import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';

// Custom cyan glowing pin for the selected report location
function createLocationPickerIcon() {
  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        background: #06b6d4;
        border: 2px solid #ffffff;
        transform: rotate(-45deg);
        box-shadow: 0 0 16px rgba(6, 182, 212, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0a0f1e;
          transform: rotate(45deg);
        "></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-location-picker-marker',
    html,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
    popupAnchor: [0, -28],
  });
}

function MapViewController({
  coords,
  zoom,
}: {
  coords: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(coords, zoom, { duration: 1.2 });
  }, [coords, zoom, map]);

  return null;
}

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  zoom?: number;
  height?: string;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  locationName = 'Selected Location',
  onLocationSelect,
  zoom = 14,
  height = '240px',
}: LocationPickerMapProps) {
  const markerIcon = createLocationPickerIcon();
  const position: [number, number] = [latitude, longitude];

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-cyan-500/30 shadow-lg shadow-cyan-500/10 relative"
      style={{ height }}
    >
      <MapContainer
        center={position}
        zoom={zoom}
        className="w-full h-full z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapViewController coords={position} zoom={zoom} />
        <MapClickHandler onLocationSelect={onLocationSelect} />

        <Marker position={position} icon={markerIcon}>
          <Popup>
            <div className="p-1 space-y-1 text-slate-200">
              <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-400">
                <MapPin className="w-3.5 h-3.5" /> {locationName}
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating badge for coordinates info */}
      <div className="absolute top-2 right-2 z-[1000] bg-slate-900/90 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 pointer-events-none">
        <Navigation className="w-3 h-3 text-cyan-400" />
        <span>{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
      </div>
    </div>
  );
}

