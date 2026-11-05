import { supabase } from '../services/supabase';

export interface RecentFloodReport {
  id: string;
  description: string;
  incident_type: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  severity?: string;
  status?: string;
  duplicate_group_id: string | null;
  created_at: string;
}

export interface DuplicateMatch {
  matchedReport: RecentFloodReport;
  distanceMeters: number | null;
  textSimilarity: number;
  typeMatch: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export type DuplicateCheckResult =
  | { status: 'duplicate_found'; match: DuplicateMatch; matchesCount: number }
  | { status: 'unique'; match: null }
  | { status: 'error'; error: string; match: null };

/**
 * Calculate Great-Circle distance between two coordinates in meters using Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number | null {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return null;
  }

  // Latitude must be [-90, 90] and longitude [-180, 180]
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    return null;
  }

  const R = 6371e3; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Common stop words in English/Indian English report contexts
 */
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'in', 'to', 'for', 'and', 'of',
  'with', 'near', 'from', 'by', 'this', 'that', 'there', 'here', 'are', 'was',
  'were', 'been', 'has', 'have', 'had', 'very', 'too', 'some', 'any', 'my', 'our'
]);

/**
 * Tokenize and normalize text into clean keyword set
 */
function extractTokens(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Compute Jaccard word similarity between two descriptions (0.0 to 1.0)
 */
export function computeTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  const t1 = text1.trim().toLowerCase();
  const t2 = text2.trim().toLowerCase();

  if (t1 === t2) return 1.0;

  // Substring containment check
  if (t1.includes(t2) || t2.includes(t1)) {
    const minLen = Math.min(t1.length, t2.length);
    const maxLen = Math.max(t1.length, t2.length);
    if (minLen > 15) {
      return Math.max(0.7, minLen / maxLen);
    }
  }

  const tokens1 = extractTokens(t1);
  const tokens2 = extractTokens(t2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersectionCount = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokens1, ...tokens2]).size;
  if (unionCount === 0) return 0;

  return intersectionCount / unionCount;
}

/**
 * Normalize and compare incident types
 */
export function isIncidentTypeSimilar(type1: string, type2: string): boolean {
  if (!type1 || !type2) return false;

  const t1 = type1.toLowerCase().replace(/[-_]/g, ' ').trim();
  const t2 = type2.toLowerCase().replace(/[-_]/g, ' ').trim();

  if (t1 === t2) return true;

  // Check shared flood taxonomy
  const floodKeywords = ['flood', 'waterlogging', 'water', 'submerged', 'water stagnation'];
  const t1IsFlood = floodKeywords.some((k) => t1.includes(k));
  const t2IsFlood = floodKeywords.some((k) => t2.includes(k));

  if (t1IsFlood && t2IsFlood) return true;

  return t1.includes(t2) || t2.includes(t1);
}

/**
 * Format relative time (e.g. "10 minutes ago", "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

export interface DuplicateCheckInput {
  description: string;
  incident_type: string;
  latitude: number | null;
  longitude: number | null;
  location_name?: string | null;
}

/**
 * Check for duplicate flood reports submitted within previous 24 hours
 * using distance (threshold <= 500m), text similarity, and incident types.
 */
export async function checkForDuplicateReports(
  newReport: DuplicateCheckInput
): Promise<DuplicateCheckResult> {
  try {
    // 1. Fetch reports from previous 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('flood_reports')
      .select('id, description, incident_type, latitude, longitude, location_name, severity, status, duplicate_group_id, created_at')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[DuplicateDetector] Supabase query error:', error);
      return {
        status: 'error',
        error: error.message || 'Database query error during duplicate check',
        match: null,
      };
    }

    if (!data || data.length === 0) {
      return { status: 'unique', match: null };
    }

    const candidateMatches: DuplicateMatch[] = [];

    for (const report of data as RecentFloodReport[]) {
      // Calculate geographic distance
      const distance = calculateDistanceMeters(
        newReport.latitude,
        newReport.longitude,
        report.latitude,
        report.longitude
      );

      // Compute description similarity
      const textSim = computeTextSimilarity(newReport.description, report.description);

      // Check incident type similarity
      const typeMatch = isIncidentTypeSimilar(newReport.incident_type, report.incident_type);

      // Same location name comparison
      const sameLocationName =
        Boolean(newReport.location_name && report.location_name) &&
        newReport.location_name!.trim().toLowerCase() === report.location_name!.trim().toLowerCase();

      // Proximity threshold: 500 meters
      const isNearby = distance !== null && distance <= 500;
      const isVeryClose = distance !== null && distance <= 150;

      let isDuplicate = false;
      let confidence: 'high' | 'medium' | 'low' = 'low';
      let reason = '';

      if (isNearby) {
        if (textSim >= 0.35 || (isVeryClose && typeMatch)) {
          isDuplicate = true;
          confidence = 'high';
          reason = `Submitted ${distance}m away with matching incident type and high description similarity.`;
        } else if (typeMatch || textSim >= 0.20) {
          isDuplicate = true;
          confidence = 'medium';
          reason = `Submitted ${distance}m away with matching incident type (${report.incident_type}).`;
        } else if (isVeryClose) {
          isDuplicate = true;
          confidence = 'medium';
          reason = `Reported at the same location (~${distance}m away) within the last 24 hours.`;
        }
      } else if (distance === null) {
        // Missing coordinates fallback
        if (sameLocationName && (textSim >= 0.30 || typeMatch)) {
          isDuplicate = true;
          confidence = textSim >= 0.35 ? 'high' : 'medium';
          reason = `Submitted in the same area (${report.location_name}) with similar report details.`;
        } else if (textSim >= 0.50) {
          isDuplicate = true;
          confidence = 'medium';
          reason = `Nearly identical report description found in the same 24-hour window.`;
        }
      }

      if (isDuplicate) {
        candidateMatches.push({
          matchedReport: report,
          distanceMeters: distance,
          textSimilarity: textSim,
          typeMatch,
          confidence,
          reason,
        });
      }
    }

    if (candidateMatches.length === 0) {
      return { status: 'unique', match: null };
    }

    // Sort by confidence (high first), then closest distance
    candidateMatches.sort((a, b) => {
      const confRank = { high: 3, medium: 2, low: 1 };
      if (confRank[b.confidence] !== confRank[a.confidence]) {
        return confRank[b.confidence] - confRank[a.confidence];
      }
      if (a.distanceMeters !== null && b.distanceMeters !== null) {
        return a.distanceMeters - b.distanceMeters;
      }
      return b.textSimilarity - a.textSimilarity;
    });

    return {
      status: 'duplicate_found',
      match: candidateMatches[0],
      matchesCount: candidateMatches.length,
    };
  } catch (err: unknown) {
    console.error('[DuplicateDetector] Unexpected error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error during duplicate check';
    return { status: 'error', error: msg, match: null };
  }
}

