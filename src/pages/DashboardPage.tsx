import { useState, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Clock,
  MapPin,
  Languages,
  Shield,
  Activity,
  ShieldCheck,
  RefreshCw,
  Search,
  Lock,
  Radio,
  Layers,
} from 'lucide-react';
import type { Severity, FloodReport } from '../types';
import { useFloodReports } from '../hooks/useFloodReports';
import GlassCard from '../components/ui/GlassCard';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import FloodMap, { SEVERITY_COLORS } from '../components/map/FloodMap';

/* ─── Helpers ──────────────────────────────────────────────────────── */

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
  if (!type) return 'General';
  return type
    .replace(/^flood_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Component ────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { reports, loading, error, refetch, isAuthority } = useFloodReports();

  const [selectedIncident, setSelectedIncident] = useState<FloodReport | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  /* Derived distinct incident types from actual records */
  const incidentTypes = useMemo(() => {
    const types = new Set<string>();
    reports.forEach((r) => {
      if (r.incident_type) types.add(r.incident_type);
    });
    return Array.from(types);
  }, [reports]);

  /* Filter logic */
  const filtered = useMemo(() => {
    return reports.filter((report) => {
      if (severityFilter !== 'all' && report.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && report.status !== statusFilter) return false;
      if (incidentTypeFilter !== 'all' && report.incident_type !== incidentTypeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = report.id.toLowerCase().includes(q);
        const matchesDesc = report.description?.toLowerCase().includes(q);
        const matchesLoc = report.location_name?.toLowerCase().includes(q);
        const matchesType = report.incident_type?.toLowerCase().includes(q);
        if (!matchesId && !matchesDesc && !matchesLoc && !matchesType) return false;
      }

      return true;
    });
  }, [reports, severityFilter, statusFilter, incidentTypeFilter, searchQuery]);

  /* ── Stats Calculations ── */
  const totalReports = reports.length;
  const criticalReports = reports.filter((r) => r.severity === 'critical').length;
  const highReports = reports.filter((r) => r.severity === 'high').length;
  const verifiedReports = reports.filter((r) => r.status === 'verified').length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Realtime Live Header Badge */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-3.5 bg-cyan-950/30 border border-cyan-500/20 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400" /> Live Supabase Realtime Active
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Listening for live inserts and status changes in <code className="text-cyan-400">flood_reports</code>
          </span>
        </div>

        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          onClick={refetch}
          disabled={loading}
        >
          {loading ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Authority Dashboard</h1>
        <p className="text-slate-400 mt-1">
          Live flood incident monitoring, OpenStreetMap visualization, and response coordination
        </p>
      </div>

      {/* ── Stats Row (5 Required Realtime Metrics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          label="Total Reports"
          value={totalReports}
          trend={{ value: 'Live synced', positive: true }}
          accentColor="text-cyan-400"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Critical Reports"
          value={criticalReports}
          trend={{ value: 'Highest priority', positive: false }}
          accentColor="text-red-400"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="High Severity"
          value={highReports}
          trend={{ value: 'Active alerts', positive: false }}
          accentColor="text-orange-400"
        />
        <StatCard
          icon={<ShieldCheck className="w-6 h-6" />}
          label="Verified Reports"
          value={verifiedReports}
          trend={{ value: 'Confirmed by auth', positive: true }}
          accentColor="text-indigo-400"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Resolved Reports"
          value={resolvedReports}
          trend={{ value: `${totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0}% rate`, positive: true }}
          accentColor="text-emerald-400"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Failed to connect to Supabase</p>
              <p className="text-red-300/80 text-sm mt-0.5">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Map + Filters row ── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Interactive Flood Map Component */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              Live Flood Map — OpenStreetMap
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Filtered: {filtered.length} reports
            </span>
          </div>

          <FloodMap
            reports={filtered}
            loading={loading}
            error={error}
            onRetry={refetch}
            selectedReport={selectedIncident}
            onSelectReport={(report) => setSelectedIncident(report)}
          />
        </div>

        {/* Filters panel */}
        <div className="space-y-6">
          {/* Severity filter */}
          <GlassCard>
            <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Filter by Severity
              </span>
              {severityFilter !== 'all' && (
                <button
                  onClick={() => setSeverityFilter('all')}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Reset
                </button>
              )}
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                  severityFilter === 'all'
                    ? 'bg-cyan-500 text-slate-900 shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                All ({totalReports})
              </button>
              {(['critical', 'high', 'medium', 'low'] as Severity[]).map((s) => {
                const count = reports.filter((r) => r.severity === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
                      severityFilter === s
                        ? 'bg-white/15 border border-cyan-400/50 text-white shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 capitalize">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: SEVERITY_COLORS[s].bg }}
                      />
                      {s}
                    </span>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{count}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Status filter */}
          <GlassCard>
            <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Filter by Status
              </span>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Reset
                </button>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['all', 'reported', 'verified', 'resolved'] as const).map((s) => {
                const count = s === 'all' ? totalReports : reports.filter((r) => r.status === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                      statusFilter === s
                        ? 'bg-cyan-500 text-slate-900 font-semibold shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {s} ({count})
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Incident Type filter */}
          <GlassCard>
            <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Filter by Incident Type
              </span>
              {incidentTypeFilter !== 'all' && (
                <button
                  onClick={() => setIncidentTypeFilter('all')}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Reset
                </button>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIncidentTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  incidentTypeFilter === 'all'
                    ? 'bg-cyan-500 text-slate-900 font-semibold'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                All Types
              </button>
              {incidentTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setIncidentTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    incidentTypeFilter === type
                      ? 'bg-cyan-500 text-slate-900 font-semibold shadow-md shadow-cyan-500/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {formatIncidentType(type)}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Reports Table (Real Records) ── */}
      <GlassCard padding="sm" className="mb-8">
        <div className="px-4 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Live Incident Reports from Database
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filtered.length} of {totalReports} real reports
            </p>
          </div>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, location, description..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
              />
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && reports.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-slate-300 text-sm">Connecting to Supabase...</p>
          </div>
        )}

        {/* Empty state: No reports in DB */}
        {!loading && reports.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-white font-semibold text-base">No Flood Reports Yet</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              No reports found in the <code className="text-cyan-400">flood_reports</code> table.
              Submit a test report to see it appear here in real-time.
            </p>
          </div>
        )}

        {/* Empty state: Filters matched 0 */}
        {!loading && reports.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center space-y-2">
            <Search className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-white font-semibold text-sm">No Matching Reports</h3>
            <p className="text-slate-400 text-xs">
              Try resetting your filters or adjusting your search query.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSeverityFilter('all');
                setStatusFilter('all');
                setIncidentTypeFilter('all');
                setSearchQuery('');
              }}
            >
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Real Reports Table */}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Report ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Incident Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                    Reported
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((report, idx) => (
                  <tr
                    key={report.id}
                    className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                      idx % 2 === 1 ? 'bg-white/[0.01]' : ''
                    } ${selectedIncident?.id === report.id ? 'bg-cyan-500/10' : ''}`}
                    onClick={() => setSelectedIncident(report)}
                  >
                    <td className="px-4 py-3 font-mono text-cyan-400 font-semibold text-xs whitespace-nowrap">
                      {report.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-white whitespace-nowrap text-xs">
                      {report.location_name || 'Chennai Metropolitan Area'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs capitalize whitespace-nowrap">
                      {formatIncidentType(report.incident_type)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[240px] truncate hidden md:table-cell">
                      {report.description}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={report.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={report.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap hidden lg:table-cell">
                      {timeAgo(report.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(report);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Incident Detail Side Panel ── */}
      {selectedIncident && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedIncident(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 bg-[#0c1225] border-l border-white/10 shadow-2xl overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-cyan-400 font-bold text-xl">
                    {selectedIncident.id}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={selectedIncident.severity} />
                    <Badge variant={selectedIncident.status} />
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {formatIncidentType(selectedIncident.incident_type)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Languages className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Report Description ({selectedIncident.language || 'English'})
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed bg-white/5 rounded-xl p-4 border border-white/5">
                  {selectedIncident.description}
                </p>
              </div>

              {/* Voice Transcript if available */}
              {selectedIncident.transcript && (
                <div>
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">
                    Voice Recording Transcript
                  </span>
                  <p className="text-xs text-slate-300 italic bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3">
                    "{selectedIncident.transcript}"
                  </p>
                </div>
              )}

              {/* Location Coordinates */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Coordinates & Landmark
                  </span>
                </div>
                <p className="text-white font-medium">
                  {selectedIncident.location_name || 'Chennai Metropolitan Area'}
                </p>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Latitude: {Number(selectedIncident.latitude).toFixed(4)}, Longitude:{' '}
                  {Number(selectedIncident.longitude).toFixed(4)}
                </p>
              </div>

              {/* Timeline */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Timeline
                </span>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Reported: {timeAgo(selectedIncident.created_at)} (
                    {new Date(selectedIncident.created_at).toLocaleString()})
                  </div>
                </div>
              </div>

              {/* Actions & Anonymous Protection */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Authority Controls & Verification
                </span>

                {!isAuthority ? (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                      <Lock className="w-4 h-4 shrink-0" />
                      Protected Authority Action
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      Anonymous visitors cannot modify incident verification or dispatch teams. Sign in with an official authority account to update status.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400">
                    ✓ Authenticated authority session detected. Status changes enabled.
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIncident(null)}
                  >
                    Close Panel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
