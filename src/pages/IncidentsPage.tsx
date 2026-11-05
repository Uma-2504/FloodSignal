import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Globe,
  GitMerge,
  ChevronRight,
  CheckCircle,
  ExternalLink,
  Languages,
  X,
  Search,
  AlertTriangle,
  RefreshCw,
  Lock,
  Layers,
  Radio,
  FileText,
} from 'lucide-react';
import type { Severity, FloodReport } from '../types';
import { useFloodReports } from '../hooks/useFloodReports';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';

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

const STATUS_STEPS = ['reported', 'verified', 'resolved'];

/* ─── Component ────────────────────────────────────────────────────── */

export default function IncidentsPage() {
  const { reports, loading, error, refetch, isAuthority } = useFloodReports();

  /* state */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'incidents' | 'duplicates'>('incidents');

  /* Derived selected incident */
  const selectedIncident = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId]
  );

  /* Derived distinct incident types from actual records */
  const distinctTypes = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.incident_type) set.add(r.incident_type);
    });
    return Array.from(set);
  }, [reports]);

  /* Derived duplicate groups from real database records */
  const realDuplicateGroups = useMemo(() => {
    const groupsMap = new Map<string, FloodReport[]>();
    reports.forEach((r) => {
      if (r.duplicate_group_id) {
        const existing = groupsMap.get(r.duplicate_group_id) || [];
        existing.push(r);
        groupsMap.set(r.duplicate_group_id, existing);
      }
    });

    return Array.from(groupsMap.entries()).map(([groupId, groupReports]) => ({
      id: groupId,
      reports: groupReports,
      locationName: groupReports[0]?.location_name || 'Chennai Metropolitan Area',
      primaryReport: groupReports[0],
    }));
  }, [reports]);

  /* Filter and Sort logic */
  const filtered = useMemo(() => {
    let list = [...reports];

    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.location_name?.toLowerCase().includes(q) ||
          r.incident_type?.toLowerCase().includes(q)
      );
    }

    // filters
    if (severityFilter) list = list.filter((r) => r.severity === severityFilter);
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (incidentTypeFilter) list = list.filter((r) => r.incident_type === incidentTypeFilter);
    if (languageFilter) list = list.filter((r) => r.language?.toLowerCase() === languageFilter.toLowerCase());

    // sort
    switch (sortBy) {
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'severity': {
        const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        list.sort((a, b) => order[a.severity] - order[b.severity]);
        break;
      }
      default: // newest
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [reports, searchQuery, severityFilter, statusFilter, incidentTypeFilter, languageFilter, sortBy]);

  /* ─── Detail Panel ───────────────────────────────────────────────── */

  const DetailPanel = ({ incident }: { incident: FloodReport }) => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-cyan-400 font-bold text-xl block">
              {incident.id}
            </span>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={incident.severity} />
              <Badge variant={incident.status} />
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {formatIncidentType(incident.incident_type)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedId(null)}
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
              Report Description ({incident.language || 'English'})
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed bg-white/5 rounded-xl p-4 border border-white/5">
            {incident.description}
          </p>
        </div>

        {/* Voice Transcript if available */}
        {incident.transcript && (
          <div>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">
              Voice Recording Transcript
            </span>
            <p className="text-xs text-slate-300 italic bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3">
              "{incident.transcript}"
            </p>
          </div>
        )}

        {/* Location */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Location & Coordinates
            </span>
          </div>
          <p className="text-white font-medium">
            {incident.location_name || 'Chennai Metropolitan Area'}
          </p>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Latitude: {Number(incident.latitude).toFixed(4)}, Longitude:{' '}
            {Number(incident.longitude).toFixed(4)}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View on Live Map
          </Link>
        </div>

        {/* Timeline */}
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Timeline
          </span>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Reported: {timeAgo(incident.created_at)} ({new Date(incident.created_at).toLocaleString()})
            </div>
          </div>
        </div>

        {/* Status Stepper */}
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
            Status Progression
          </span>
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((s, idx) => {
              const currentIdx = STATUS_STEPS.indexOf(incident.status);
              const isActive = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30'
                          : isActive
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-white/5 text-slate-600'
                      }`}
                    >
                      {isActive ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1 capitalize ${
                        isCurrent
                          ? 'text-cyan-400 font-semibold'
                          : isActive
                          ? 'text-slate-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {s}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 rounded-full ${
                        idx < currentIdx ? 'bg-cyan-500/50' : 'bg-white/5'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Update Actions - Protected Against Anonymous Users */}
        <div className="pt-4 space-y-3 border-t border-white/10">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Verification & Response Control
          </span>

          {!isAuthority ? (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <Lock className="w-4 h-4 shrink-0" />
                Anonymous Access Notice
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Anonymous users cannot modify incident verification or status. Authorized authority credentials required to make changes.
              </p>
            </div>
          ) : (
            <p className="text-xs text-emerald-400">
              ✓ Authenticated authority session active.
            </p>
          )}
        </div>

        {/* Duplicate Group Link */}
        {incident.duplicate_group_id && (
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <GitMerge className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Duplicate Group: {incident.duplicate_group_id}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              This report has been clustered with other nearby reports.
            </p>
          </div>
        )}
      </div>
    );
  };

  /* ─── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Realtime Live Header Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-3.5 bg-cyan-950/30 border border-cyan-500/20 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400" /> Realtime Incident Stream Connected
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Directly synced to Supabase database table
          </span>
        </div>

        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          onClick={refetch}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Incident Management</h1>
        <p className="text-slate-400 mt-1">
          Search, filter, and track actual flood incident reports from citizens
        </p>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode('incidents')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            viewMode === 'incidents'
              ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/25'
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          All Incidents ({reports.length})
        </button>
        <button
          onClick={() => setViewMode('duplicates')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            viewMode === 'duplicates'
              ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/25'
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <GitMerge className="w-4 h-4" /> Duplicate Groups ({realDuplicateGroups.length})
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}

      {viewMode === 'duplicates' ? (
        /* ── Real Duplicate Groups View ── */
        <div className="space-y-6">
          {realDuplicateGroups.length === 0 ? (
            <GlassCard className="text-center py-16">
              <GitMerge className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold text-base">No Duplicate Clusters Found</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
                Currently, all reports in the database are independent incidents. When duplicate clusters are assigned to <code className="text-cyan-400">duplicate_group_id</code>, they will appear grouped here.
              </p>
            </GlassCard>
          ) : (
            realDuplicateGroups.map((group) => (
              <GlassCard key={group.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <GitMerge className="w-5 h-5 text-amber-400" />
                      <span className="font-mono text-amber-400 font-semibold">{group.id}</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {group.reports.length} incidents • {group.locationName}
                    </p>
                  </div>
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-semibold border border-amber-500/30">
                    {group.reports.length} clustered
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {group.reports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setViewMode('incidents');
                        setSelectedId(r.id);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-white/5 text-slate-300 border border-white/10 hover:border-cyan-400/40 hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      {r.id.slice(0, 8).toUpperCase()}
                      <Badge variant={r.severity} />
                      <ChevronRight className="w-3 h-3 text-cyan-400" />
                    </button>
                  ))}
                </div>
              </GlassCard>
            ))
          )}
        </div>
      ) : (
        <>
          {/* ── Filters Bar ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="col-span-2 md:col-span-1 lg:col-span-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by ID, location, description..."
              />
            </div>
            <Select
              value={severityFilter}
              onChange={setSeverityFilter}
              placeholder="All Severities"
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Statuses"
              options={[
                { value: 'reported', label: 'Reported' },
                { value: 'verified', label: 'Verified' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
            <Select
              value={incidentTypeFilter}
              onChange={setIncidentTypeFilter}
              placeholder="All Incident Types"
              options={distinctTypes.map((t) => ({
                value: t,
                label: formatIncidentType(t),
              }))}
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'severity', label: 'Severity ↓' },
              ]}
            />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              Showing <span className="text-cyan-400 font-semibold">{filtered.length}</span> of {reports.length} database reports
            </p>

            {(severityFilter || statusFilter || incidentTypeFilter || languageFilter || searchQuery) && (
              <button
                onClick={() => {
                  setSeverityFilter('');
                  setStatusFilter('');
                  setIncidentTypeFilter('');
                  setLanguageFilter('');
                  setSearchQuery('');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading && reports.length === 0 && (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">Loading incident reports from Supabase...</p>
            </div>
          )}

          {/* Empty State: Database has no records */}
          {!loading && reports.length === 0 && (
            <GlassCard className="text-center py-20">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold text-lg">No Flood Reports Found</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-1 mb-4">
                The database does not contain any reports yet. Reports submitted via the Report page will stream here instantly.
              </p>
              <Link to="/report">
                <Button size="sm" icon={<FileText className="w-4 h-4" />}>
                  Submit a Report
                </Button>
              </Link>
            </GlassCard>
          )}

          {/* ── Two-panel layout ── */}
          {!loading && reports.length > 0 && (
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left: Incident List */}
              <div className="lg:col-span-3 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filtered.length === 0 && (
                  <GlassCard className="text-center py-12">
                    <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No incidents match your active filters</p>
                  </GlassCard>
                )}

                {filtered.map((report) => (
                  <GlassCard
                    key={report.id}
                    hover
                    padding="md"
                    className={`transition-all duration-200 cursor-pointer ${
                      selectedId === report.id
                        ? 'border-cyan-400/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                        : ''
                    }`}
                    onClick={() => setSelectedId(report.id)}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-cyan-400 font-semibold text-xs">
                        {report.id.slice(0, 8).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={report.severity} />
                        <Badge variant={report.status} />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-200 leading-relaxed line-clamp-2 mb-3">
                      {report.description}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />{' '}
                        {report.location_name || 'Chennai Metropolitan Area'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        {formatIncidentType(report.incident_type)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> {timeAgo(report.created_at)}
                      </span>
                      {report.language && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-500" /> {report.language}
                        </span>
                      )}
                      {report.duplicate_group_id && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <GitMerge className="w-3.5 h-3.5" /> Duplicate cluster
                        </span>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Right: Detail Panel */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-24">
                  <GlassCard padding="lg" className="max-h-[calc(100vh-200px)] overflow-y-auto">
                    {selectedIncident ? (
                      <DetailPanel incident={selectedIncident} />
                    ) : (
                      <div className="text-center py-16">
                        <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Select an incident to view details</p>
                        <p className="text-sm text-slate-600 mt-1">
                          Click on any incident card from the list
                        </p>
                      </div>
                    )}
                  </GlassCard>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
