export interface GeocodeCandidate {
  latitude: number;
  longitude: number;
  name: string;
  displayName: string;
  score: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  candidates?: GeocodeCandidate[];
}

// In-memory cache to respect OSM Nominatim usage limits and prevent duplicate network queries
const geocodeCache = new Map<string, GeocodeResult | null>();

/**
 * Clean and normalize address input for search queries
 */
function normalizeQuery(address: string): string {
  return address
    .replace(/[^\w\s,.-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate sensible query candidates for Indian / Tamil Nadu landmarks
 */
function generateQueryCandidates(clean: string): string[] {
  const candidates: string[] = [clean];

  if (!/tamil nadu|india/i.test(clean)) {
    candidates.push(`${clean}, Tamil Nadu, India`);
  }

  // Handle railway stations that in OSM are mapped as Junctions (e.g., 'Chengalpattu Railway Station' -> 'Chengalpattu Junction')
  if (/railway station|railway|station/i.test(clean)) {
    candidates.push(clean.replace(/railway station|station/gi, 'Junction'));
    candidates.push(clean.replace(/railway station/gi, 'Junction Railway Station'));
  }

  // Handle Government Hospital variations (often tagged as Medical College Hospital in OSM)
  if (/government hospital|govt hospital|gh\b/i.test(clean)) {
    candidates.push(clean.replace(/government hospital|govt hospital|gh\b/gi, 'Medical College Hospital'));
  }

  // Handle common colloquial variants like 'bus stop' vs 'bus stand'
  if (/bus stop/i.test(clean)) {
    const withStand = clean.replace(/bus stop/gi, 'Bus Stand');
    candidates.push(withStand);
    candidates.push(`${withStand}, Tamil Nadu, India`);
  }

  // Handle 'sengalpat' spelling variant for 'chengalpattu'
  if (/sengalpat/i.test(clean)) {
    const withChengal = clean.replace(/sengalpat/gi, 'Chengalpattu');
    candidates.push(withChengal);
    candidates.push(`${withChengal}, Tamil Nadu, India`);
    if (/bus stop/i.test(withChengal)) {
      candidates.push(withChengal.replace(/bus stop/gi, 'Bus Stand'));
    }
  }

  return Array.from(new Set(candidates));
}

/**
 * Score a Nominatim candidate based on name matching, geographic context, and entity type.
 */
function scoreCandidate(item: any, rawQuery: string): number {
  const qClean = rawQuery.toLowerCase();
  const qWords = qClean.split(/[\s,.-]+/).filter((w) => w.length > 2);

  const name = (item.name || '').toLowerCase();
  const disp = (item.display_name || '').toLowerCase();
  const addr = item.address || {};
  const town = (addr.town || addr.city || addr.suburb || addr.village || '').toLowerCase();
  const county = (addr.county || addr.state_district || '').toLowerCase();

  let score = 0;

  // Exact name match
  if (name === qClean) {
    score += 100;
  }

  const stopWords = new Set([
    'station',
    'railway',
    'the',
    'near',
    'junction',
    'road',
    'street',
    'stop',
    'stand',
    'hospital',
    'bus',
    'new',
    'government',
    'govt',
    'medical',
    'college',
  ]);
  const specificWords = qWords.filter((w) => !stopWords.has(w));

  // Check specific location words (e.g. 'chengalpattu')
  for (const w of specificWords) {
    if (name.includes(w)) {
      score += 60; // Directly in the landmark name
    } else if (town.includes(w)) {
      score += 40; // In the town / city name
    } else if (county.includes(w)) {
      score += 20; // In district / county
    } else if (disp.includes(w)) {
      score += 10;
    } else {
      score -= 50; // Severe penalty if specific place word is missing completely
    }
  }

  // Category bonus
  if (/railway|station/i.test(qClean) && (/junction/i.test(name) || item.class === 'railway')) {
    score += 30;
  }
  if (/hospital/i.test(qClean) && (/hospital|medical/i.test(name) || item.type === 'hospital' || item.class === 'amenity')) {
    score += 30;
  }
  if (/bus/i.test(qClean) && (/bus/i.test(name) || item.class === 'highway' || item.class === 'amenity')) {
    score += 30;
  }

  // Penalize when specific word (like chengalpattu) conflicts with unrelated municipality in result (e.g. Tambaram, Chromepet)
  if (specificWords.includes('chengalpattu') && (town.includes('tambaram') || name.includes('tambaram') || name.includes('chromepet') || name.includes('tirusulam'))) {
    score -= 80;
  }

  return score;
}

/**
 * Geocodes an address or landmark using OpenStreetMap Nominatim.
 * Nominatim is the native geocoding companion for Leaflet / OpenStreetMap.
 * Performs multi-candidate search and intelligent geographic relevance scoring.
 */
export async function geocodeAddress(
  address: string,
  signal?: AbortSignal
): Promise<GeocodeResult | null> {
  const clean = normalizeQuery(address);
  if (!clean || clean.length < 3) return null;

  const cacheKey = clean.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  const queryCandidates = generateQueryCandidates(clean);
  const rawResults: any[] = [];

  for (const q of queryCandidates) {
    try {
      const params = new URLSearchParams({
        format: 'json',
        q,
        limit: '4',
        countrycodes: 'in', // prioritize Indian subcontinent
        addressdetails: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'FloodSignal-CitizenApp/1.0 (Emergency Flood Monitoring System)',
            'Accept-Language': 'en',
          },
          signal,
        }
      );

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        rawResults.push(...data);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      console.warn(`[Geocoding] Query "${q}" failed:`, err);
    }
  }

  if (rawResults.length === 0) {
    geocodeCache.set(cacheKey, null);
    return null;
  }

  // Deduplicate results by place_id or coordinate proximity
  const seenPlaces = new Set<string>();
  const scoredCandidates: GeocodeCandidate[] = [];

  for (const item of rawResults) {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      continue;
    }

    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (seenPlaces.has(key)) continue;
    seenPlaces.add(key);

    const score = scoreCandidate(item, clean);
    scoredCandidates.push({
      latitude: lat,
      longitude: lon,
      name: item.name || clean,
      displayName: item.display_name || clean,
      score,
    });
  }

  // Sort descending by calculated relevance score
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Filter out severely mismatched candidates
  const validCandidates = scoredCandidates.filter((c) => c.score >= 20);

  if (validCandidates.length === 0) {
    geocodeCache.set(cacheKey, null);
    return null;
  }

  const topMatch = validCandidates[0];
  const result: GeocodeResult = {
    latitude: topMatch.latitude,
    longitude: topMatch.longitude,
    displayName: topMatch.displayName,
    candidates: validCandidates.slice(0, 4),
  };

  geocodeCache.set(cacheKey, result);
  return result;
}

/**
 * Reverse geocodes coordinates [latitude, longitude] to obtain a human-readable address.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<string | null> {
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  const cacheKey = `rev:${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)?.displayName ?? null;
  }

  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(lat),
      lon: String(lon),
      addressdetails: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'FloodSignal-CitizenApp/1.0 (Emergency Flood Monitoring System)',
          'Accept-Language': 'en',
        },
        signal,
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const displayName = data?.display_name || data?.name || null;
    if (displayName) {
      geocodeCache.set(cacheKey, {
        latitude: lat,
        longitude: lon,
        displayName,
      });
      return displayName;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    console.warn(`[ReverseGeocode] Failed for [${lat}, ${lon}]:`, err);
  }

  return null;
}

