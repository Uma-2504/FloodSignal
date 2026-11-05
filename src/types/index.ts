export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'reported' | 'verified' | 'resolved' | 'new' | 'acknowledged' | 'responding';
export type Language = 'tamil' | 'english' | 'tanglish' | 'hindi';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface FloodReport {
  id: string;
  description: string;
  transcript: string | null;
  language: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  severity: Severity;
  incident_type: string;
  status: 'reported' | 'verified' | 'resolved' | string;
  duplicate_group_id: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  reporterName: string;
  reporterPhone: string;
  description: string;
  originalLanguage: Language;
  translatedDescription: string;
  severity: Severity;
  status: IncidentStatus;
  location: {
    name: string;
    coordinates: Coordinates;
  };
  waterLevel: number; // in feet
  reportedAt: string; // ISO date
  updatedAt: string;
  duplicateGroupId?: string;
  mediaUrls: string[];
  aiSummary: string;
}

export interface DashboardStats {
  totalIncidents: number;
  criticalIncidents: number;
  activeResponses: number;
  resolvedIncidents: number;
  averageResponseTime: string;
  incidentsToday: number;
}

export interface DuplicateGroup {
  id: string;
  incidentIds: string[];
  primaryIncidentId: string;
  mergedDescription: string;
  location: {
    name: string;
    coordinates: Coordinates;
  };
}
