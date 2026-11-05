import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import type { Severity, FloodReport } from '../../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

/* ─── Leaflet Icon Bundling Fix ───────────────────────────────────────── */

// Fix default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ─── Severity Color Definitions ─────────────────────────────────────── */

export const SEVERITY_COLORS: Record<Severity, { bg: string; border: string; glow: string; label: string }> = {
  low: {
    bg: '#22c55e', // Green
    border: '#16a34a',
    glow: 'rgba(34, 197, 94, 0.45)',
    label: 'Low',
  },
  medium: {
    bg: '#eab308', // Yellow
    border: '#ca8a04',
    glow: 'rgba(234, 179, 8, 0.45)',
    label: 'Medium',
  },
  high: {
    bg: '#f97316', // Orange
    border: '#ea580c',
    glow: 'rgba(249, 115, 22, 0.45)',
    label: 'High',
  },
  critical: {
    bg: '#ef4444', // Red
    border: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.55)',
    label: 'Critical',
  },
};

/* ─── Custom SVG Markers ──────────────────────────────────────────────── */

export function createSeverityIcon(severity: Severity) {
  const config = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
  const isUrgent = severity === 'critical' || severity === 'high';

  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      ${
        isUrgent
          ? `<span style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${config.glow}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
          : ''
      }
      <div style="
        position: relative;
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        background: ${config.bg};
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px ${config.glow}, 0 2px 4px rgba(0,0,0,0.4);
        transform: rotate(-45deg);
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
    className: 'custom-flood-marker',
    html,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
    popupAnchor: [0, -28],
  });
}

export function createUserLocationIcon() {
  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="
        position: relative;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #06b6d4;
        border: 3px solid #ffffff;
        box-shadow: 0 0 14px rgba(6, 182, 212, 0.9);
      "></div>
    </div>
  `;

  return L.divIcon({
    className: 'user-location-marker',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/* ─── Helper Functions ────────────────────────────────────────────────── */

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (Number.isNaN(numLat) || Number.isNaN(numLng)) return false;
  if (numLat < -90 || numLat > 90) return false;
  if (numLng < -180 || numLng > 180) return false;
  // Ignore Null Island
  if (numLat === 0 && numLng === 0) return false;
  return true;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatIncidentType(type: string | undefined): string {
  if (!type) return 'General Flood';
  return type
    .replace(/^flood_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Map Sub-controller (Geolocation & Pan) ─────────────────────────── */

function MapController({
  userLocation,
  centerTrigger,
  selectedReport,
}: {
  userLocation: [number, number] | null;
  centerTrigger: number;
  selectedReport: FloodReport | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (centerTrigger > 0 && userLocation) {
      map.flyTo(userLocation, 14, { duration: 1.5 });
    }
  }, [centerTrigger, userLocation, map]);

  useEffect(() => {
    if (selectedReport && isValidCoordinate(selectedReport.latitude, selectedReport.longitude)) {
      map.flyTo([Number(selectedReport.latitude), Number(selectedReport.longitude)], 13, {
        duration: 1.2,
      });
    }
  }, [selectedReport, map]);

  return null;
}

/* ─── Component Props ─────────────────────────────────────────────────── */

interface FloodMapProps {
  reports: FloodReport[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedReport?: FloodReport | null;
  onSelectReport?: (report: FloodReport) => void;
  className?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

/* ─── Main FloodMap Component ─────────────────────────────────────────── */

export default function FloodMap({
  reports,
  loading = false,
  error = null,
  onRetry,
  selectedReport = null,
  onSelectReport,
  className = '',
  defaultCenter = [13.0827, 80.2707], // Chennai center
  defaultZoom = 11,
}: FloodMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const [centerTrigger, setCenterTrigger] = useState<number>(0);

  // Filter out any records with missing, invalid or out-of-range coordinates
  const validReports = useMemo(() => {
    return reports.filter((r) => isValidCoordinate(r.latitude, r.longitude));
  }, [reports]);

  // Request browser permission and locate user
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setIsLocating(false);
        setCenterTrigger(Date.now());
        setGeoNotice('Location found! Centering map on your position.');
        setTimeout(() => setGeoNotice(null), 4000);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Could not retrieve your location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setGeoNotice(msg);
        setTimeout(() => setGeoNotice(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-white/10 bg-[#0c1225] shadow-2xl ${className}`}
    >
      {/* ── Top Bar / Header Controls ── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Plotted Counter Pill */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white font-medium">
            {validReports.length} Plotted
          </span>
          <span className="text-slate-400">
            ({reports.length - validReports.length} without GPS)
          </span>
        </div>

        {/* Locate Me Action Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Locate my position (requests browser permission)"
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
          </button>
        </div>
      </div>

      {/* Geolocation Notice Banner */}
      {geoNotice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] max-w-sm w-[90%] bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-xs px-3.5 py-2 rounded-xl shadow-xl text-center animate-fadeIn">
          {geoNotice}
        </div>
      )}

      {/* ── Leaflet Map Container ── */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-[440px] sm:h-[520px] lg:h-[600px] z-0"
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap Tiles with Official Attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Sub-controller for programmatic flyTo */}
        <MapController
          userLocation={userLocation}
          centerTrigger={centerTrigger}
          selectedReport={selectedReport}
        />

        {/* User Current Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={createUserLocationIcon()}>
            <Popup>
              <div className="p-1 space-y-1 text-slate-200">
                <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-400">
                  <Compass className="w-3.5 h-3.5" /> Your Current Location
                </div>
                <p className="text-[11px] text-slate-300">
                  Lat: {userLocation[0].toFixed(4)}, Lng: {userLocation[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Real Database Incident Markers */}
        {validReports.map((report) => {
          const lat = Number(report.latitude);
          const lng = Number(report.longitude);
          const icon = createSeverityIcon(report.severity);

          return (
            <Marker
              key={report.id}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectReport?.(report),
              }}
            >
              <Popup className="flood-report-popup">
                <div className="space-y-2.5 min-w-[220px] max-w-[280px] p-0.5 text-slate-200">
                  {/* Header: ID + Severity Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <span className="font-mono text-cyan-400 font-bold text-xs">
                      {report.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Badge variant={report.severity} />
                  </div>

                  {/* Location Name */}
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {report.location_name || 'Chennai Metropolitan Area'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </p>
                  </div>

                  {/* Incident Description */}
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {report.description}
                    </p>
                  </div>

                  {/* Status & Incident Type */}
                  <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                    <Badge variant={report.status} />
                    <span className="text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      {formatIncidentType(report.incident_type)}
                    </span>
                  </div>

                  {/* Reported Date & Time */}
                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {timeAgo(report.created_at)}
                    </span>
                    <span>{new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ── Severity Legend (Bottom Left) ── */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl shadow-xl flex items-center gap-3 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
          Severity:
        </span>
        <div className="flex items-center gap-2.5">
          {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[s].bg }}
              />
              <span className="capitalize text-[11px] text-slate-300">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Overlay: Loading State ── */}
      {loading && reports.length === 0 && (
        <div className="absolute inset-0 z-[1001] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-300 font-medium">Loading live flood map...</p>
        </div>
      )}

      {/* ── Overlay: Error State ── */}
      {error && (
        <div className="absolute inset-0 z-[1001] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mb-2" />
          <h4 className="text-white font-semibold text-sm">Failed to Load Flood Reports</h4>
          <p className="text-xs text-red-300/80 max-w-sm mt-1 mb-4">{error}</p>
          {onRetry && (
            <Button size="sm" variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>
              Retry Map Load
            </Button>
          )}
        </div>
      )}

      {/* ── Overlay: Empty State ── */}
      {!loading && !error && validReports.length === 0 && (
        <div className="absolute inset-0 z-[999] pointer-events-none flex items-center justify-center p-6">
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-white/10 p-5 rounded-2xl text-center max-w-md shadow-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-white font-semibold text-sm">No Active Flood Markers</h4>
            <p className="text-xs text-slate-400 mt-1">
              No reports with valid coordinates found. New reports submitted with coordinates will appear here automatically via Supabase Realtime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

