import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Type,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Users,
  ArrowUp,
  RotateCcw,
  Play,
  Square,
  Globe,
  Droplets,
  CheckCircle,
  Loader2,
  XCircle,
  Sparkles,
  RefreshCw,
  Layers,
  Navigation,
} from 'lucide-react';
import type { Language, Severity } from '../types';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import { supabase } from '../services/supabase';
import { convertBlobTo16kHzWav } from '../utils/audioConverter';
import {
  checkForDuplicateReports,
  formatRelativeTime,
  type DuplicateCheckResult,
} from '../utils/duplicateDetector';
import { sanitizeTextForAI } from '../utils/privacySanitizer';
import { geocodeAddress, reverseGeocode, type GeocodeCandidate } from '../utils/geocoding';
import LocationPickerMap from '../components/map/LocationPickerMap';
import type { AIIncidentIntelligence } from '../types';

/* ─── Constants ──────────────────────────────────────────────────────── */

const STEP_LABELS = ['Language & Input', 'Flood Details', 'Location', 'Review', 'Confirmation'];

interface LanguageOption {
  key: Language;
  name: string;
  native: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { key: 'tamil', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { key: 'english', name: 'English', native: 'English', flag: '🇬🇧' },
  { key: 'tanglish', name: 'Tanglish', native: 'Tanglish', flag: '🇮🇳' },
  { key: 'hindi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
];

const GNANI_LANGUAGE_CODES: Record<Language, string> = {
  tamil: 'ta-IN',
  english: 'en-IN',
  tanglish: 'ta-IN',
  hindi: 'hi-IN',
};

const PLACEHOLDER_TEXT: Record<Language, string> = {
  tamil: 'உங்கள் புகாரை இங்கே தட்டச்சு செய்யவும்...',
  english: 'Type your flood report here...',
  tanglish: 'Unga report ah inga type pannunga...',
  hindi: 'अपनी बाढ़ रिपोर्ट यहाँ टाइप करें...',
};

interface LocationOption {
  name: string;
  description: string;
  lat: number;
  lng: number;
}

const LOCATIONS: LocationOption[] = [
  { name: 'T. Nagar', description: 'Commercial hub, Pondy Bazaar area', lat: 13.0418, lng: 80.2341 },
  { name: 'Adyar', description: 'Adyar river basin, residential area', lat: 13.0067, lng: 80.2563 },
  { name: 'Velachery', description: 'Low-lying residential zone', lat: 12.9815, lng: 80.2180 },
  { name: 'Tambaram', description: 'Southern suburb near Adyar river', lat: 12.9249, lng: 80.1278 },
  { name: 'Kodambakkam', description: 'Central Chennai, dense settlement', lat: 13.0524, lng: 80.2255 },
  { name: 'Anna Nagar', description: 'Planned residential neighbourhood', lat: 13.0850, lng: 80.2101 },
  { name: 'Perungudi', description: 'IT corridor, marshland area', lat: 12.9610, lng: 80.2437 },
  { name: 'Sholinganallur', description: 'OMR stretch, tech-park zone', lat: 12.9010, lng: 80.2279 },
];

const PEOPLE_RANGES = ['1-5', '5-20', '20-50', '50-100', '100+'] as const;
type PeopleRange = (typeof PEOPLE_RANGES)[number];

interface AIAnalysis {
  incident_type: string;
  severity: Severity;
  road_access: string;
  summary: string;
  requires_attention: boolean;
  confidence: number;
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function ReportPage() {
  const navigate = useNavigate();

  /* ── wizard state ── */
  const [step, setStep] = useState(1);

  /* ── step 1 state ── */
  const [language, setLanguage] = useState<Language>('english');
  const [inputMethod, setInputMethod] = useState<'voice' | 'text'>('voice');
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [textInput, setTextInput] = useState('');

  /* ── audio recording and transcription state ── */
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  /* ── Groq AI analysis state ── */
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState('openai/gpt-oss-20b');
  const [reviewedSeverity, setReviewedSeverity] = useState<Severity | null>(null);
  const [reviewedIncidentType, setReviewedIncidentType] = useState<string | null>(null);
  const [reviewedRoadAccess, setReviewedRoadAccess] = useState<string | null>(null);
  const [reviewedSummary, setReviewedSummary] = useState<string | null>(null);

  /* ── audio refs ── */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  /* ── step 2 state ── */
  const [waterLevel, setWaterLevel] = useState(4);
  const [peopleAffected, setPeopleAffected] = useState<PeopleRange>('5-20');
  const [stranded, setStranded] = useState<boolean | null>(null);
  const [waterRising, setWaterRising] = useState<boolean | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');

  /* ── step 3 state ── */
  const [selectedLocation, setSelectedLocation] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualGeocodedName, setManualGeocodedName] = useState<string | null>(null);
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [locationMethod, setLocationMethod] = useState<'voice' | 'manual' | 'gps' | 'preset'>('gps');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unavailable' | 'done'>('prompt');

  // Spoken incident landmark (separate from current GPS coordinates)
  const [spokenLandmark, setSpokenLandmark] = useState<{
    name: string;
    coords?: { lat: number; lng: number } | null;
  } | null>(null);

  /* ── step 5 ── */
  const [incidentId, setIncidentId] = useState(
    () => `FS-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`
  );

  /* ── submission state ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── duplicate report detection state ── */
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);

  /* ── cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  /* ── rate-limiting / cooldown ref for AI analysis calls (SEC-02) ── */
  const lastAiCallTimeRef = useRef<number>(0);

  /* ── invoke Groq AI Edge Function (analyze-report) ── */
  const triggerAIAnalysis = useCallback(async (reportContent: string) => {
    if (!reportContent || !reportContent.trim()) return;

    // SEC-02: Debounce and enforce 3-second cooldown to protect Edge Function quota
    const now = Date.now();
    if (now - lastAiCallTimeRef.current < 3000 && analyzingAI) {
      return;
    }
    lastAiCallTimeRef.current = now;

    setAnalyzingAI(true);
    setAiAnalysisError(null);

    try {
      // SEC-06: Mask personal contact details (phone numbers and emails) before external AI inference
      const sanitizedReport = sanitizeTextForAI(reportContent.trim());

      const { data, error: fnError } = await supabase.functions.invoke('analyze-report', {
        body: { report: sanitizedReport },
      });

      if (fnError) {
        console.error('[Groq AI Debug] analyze-report invocation error:', fnError);
        setAiAnalysisError(fnError.message || 'Failed to analyze report with Groq AI.');
        return;
      }

      if (data && data.success && data.analysis) {
        const analysis = data.analysis as AIIncidentIntelligence;
        setAiAnalysis(analysis);
        if (data.model) setAiModel(data.model);

        // Pre-fill citizen review state from AI output
        if (analysis.severity) {
          setReviewedSeverity(analysis.severity as Severity);
        }
        if (analysis.incident_type) {
          setReviewedIncidentType(analysis.incident_type);
        }
        if (analysis.road_access) {
          const access = analysis.road_access === 'partial' ? 'partially_blocked' : analysis.road_access;
          setReviewedRoadAccess(access);
        }
        if (analysis.summary) {
          setReviewedSummary(analysis.summary);
        }

        // Landmark detection from citizen statement
        if (analysis.location_mentioned && analysis.landmark) {
          const landmarkQuery = analysis.landmark.trim();

          // Geocode the spoken landmark
          geocodeAddress(landmarkQuery)
            .then((geoRes) => {
              if (geoRes) {
                setSpokenLandmark({
                  name: landmarkQuery,
                  coords: { lat: geoRes.latitude, lng: geoRes.longitude },
                });
                // If citizen does NOT have valid GPS or requested landmark fallback, pin it
                if (!manualCoords || locationMethod !== 'gps') {
                  setManualCoords({ lat: geoRes.latitude, lng: geoRes.longitude });
                  setManualGeocodedName(geoRes.displayName);
                  setManualAddress(landmarkQuery);
                  setLocationMethod('voice');
                  setSelectedLocation('');
                }
              } else {
                setSpokenLandmark({ name: landmarkQuery, coords: null });
              }
            })
            .catch((err) => {
              console.warn('[Geocoding] Error resolving voice landmark:', err);
              setSpokenLandmark({ name: landmarkQuery, coords: null });
            });
        }
      } else {
        setAiAnalysisError('AI analysis returned an unexpected response format.');
      }
    } catch (err: unknown) {
      console.error('[Groq AI Debug] Unexpected analysis error:', err);
      setAiAnalysisError(err instanceof Error ? err.message : 'Error analyzing report.');
    } finally {
      setAnalyzingAI(false);
    }
  }, []);

  /* ── transcribe audio via Supabase Edge Function (gnani-transcribe) ── */
  const handleTranscribe = useCallback(
    async (blobToTranscribe: Blob) => {
      if (!blobToTranscribe || blobToTranscribe.size < 500) {
        setTranscribeError('Recording was too short or empty. Please speak clearly for at least 2-3 seconds.');
        return;
      }

      setTranscribing(true);
      setTranscribeError(null);

      try {
        // 1. Convert browser recording to 16 kHz 16-bit mono PCM WAV for Gnani Prisma v3
        const wavBlob = await convertBlobTo16kHzWav(blobToTranscribe);

        // 2. Map language code (ta-IN, en-IN, hi-IN)
        const langCode = GNANI_LANGUAGE_CODES[language] || 'en-IN';

        // 3. Create FormData without manually setting Content-Type header
        const formData = new FormData();
        formData.append('audio_file', wavBlob, 'recording_16k.wav');
        formData.append('language_code', langCode);

        // 4. Invoke Edge Function
        const { data, error: fnError } = await supabase.functions.invoke(
          'gnani-transcribe',
          {
            body: formData,
          }
        );

        if (fnError) {
          console.group('[Gnani STT Debug] Edge Function Invocation Details');
          console.error('Error Class/Name:', fnError.name);
          console.error('Error Message:', fnError.message);

          if (fnError.name === 'FunctionsFetchError') {
            console.warn(
              'Type: FunctionsFetchError (Browser fetch failed. Typically caused by the Edge Function throwing an unhandled exception before sending CORS headers).'
            );
          } else if (fnError.name === 'FunctionsHttpError') {
            console.warn('Type: FunctionsHttpError (Edge Function returned an HTTP 4xx or 5xx status code).');
          } else if (fnError.name === 'FunctionsRelayError') {
            console.warn('Type: FunctionsRelayError (Supabase relay routing issue).');
          }

          if ('context' in fnError && fnError.context) {
            console.log('Error context:', fnError.context);
            if (fnError.context instanceof Response) {
              console.error('HTTP Response Status:', fnError.context.status, fnError.context.statusText);
              try {
                const responseBody = await fnError.context.clone().text();
                console.error('HTTP Response Body:', responseBody);
              } catch (readErr) {
                console.error('Could not read response body from error context:', readErr);
              }
            }
          }
          console.groupEnd();

          let errorMsg = fnError.message || 'Failed to transcribe audio.';
          setTranscribeError(
            `${errorMsg} (Please verify that your Gnani API credentials are configured in Supabase Edge Function Secrets.)`
          );
          return;
        }

        // 5. Read transcript from data.transcript
        const text =
          data?.transcript ||
          data?.text ||
          (typeof data === 'string' ? data : '');

        if (!text || !text.trim()) {
          setTranscribeError(
            'No clear speech detected in recording. You can re-record or type your report directly.'
          );
        } else {
          const finalTranscript = text.trim();
          setTranscription(finalTranscript);
          setTranscribeError(null);
          // Send resulting transcript to Groq AI for instant analysis
          triggerAIAnalysis(finalTranscript);
        }
      } catch (err: unknown) {
        console.error('Transcription error:', err);
        const msg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during audio processing.';
        setTranscribeError(msg);
      } finally {
        setTranscribing(false);
      }
    },
    [language, triggerAIAnalysis]
  );

  /* ── start live microphone recording ── */
  const startRecording = useCallback(async () => {
    setMicError(null);
    setTranscribeError(null);
    setTranscription('');

    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordedBlob(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Your browser does not support audio recording.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const rawBlob = new Blob(chunks, { type: mime });
        setRecordedBlob(rawBlob);

        const audioUrl = URL.createObjectURL(rawBlob);
        setRecordedAudioUrl(audioUrl);

        // Auto-transcribe once recording completes
        await handleTranscribe(rawBlob);
      };

      mediaRecorder.start(250);
      setRecordingState('recording');
      setRecordingTimer(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimer((t) => t + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Microphone access error:', err);
      let msg = 'Failed to access microphone.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No microphone device found on your system.';
        } else {
          msg = err.message;
        }
      }
      setMicError(msg);
      setRecordingState('idle');
    }
  }, [recordedAudioUrl, handleTranscribe]);

  /* ── stop microphone recording ── */
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setRecordingState('done');
  }, []);

  /* ── toggle playback of recorded audio ── */
  const togglePlayRecording = useCallback(() => {
    if (!recordedAudioUrl) return;

    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      return;
    }

    const audio = new Audio(recordedAudioUrl);
    audioPlayerRef.current = audio;
    setIsPlayingAudio(true);

    audio.onended = () => {
      setIsPlayingAudio(false);
    };
    audio.onerror = () => {
      setIsPlayingAudio(false);
    };

    audio.play().catch((err) => {
      console.error('Audio playback error:', err);
      setIsPlayingAudio(false);
    });
  }, [recordedAudioUrl, isPlayingAudio]);

  /* ── reset recording state ── */
  const resetRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setIsPlayingAudio(false);
    setRecordedBlob(null);
    setRecordingState('idle');
    setRecordingTimer(0);
    setTranscription('');
    setTranscribeError(null);
    setMicError(null);
    setTranscribing(false);
  }, [recordedAudioUrl]);

  /* ── derive severity from water level (fallback) ── */
  const deriveSeverity = (level: number): Severity => {
    if (level >= 7) return 'critical';
    if (level >= 5) return 'high';
    if (level >= 3) return 'medium';
    return 'low';
  };

  /* ── derive incident type from form inputs (fallback) ── */
  const deriveIncidentType = useCallback((): string => {
    if (stranded) return 'flood_stranded';
    if (waterRising) return 'flood_rising';
    return 'flood_general';
  }, [stranded, waterRising]);

  /* ── request GPS location automatically on load (primary location source) ── */
  const handleRequestGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsPermissionStatus('unavailable');
      setGpsError('Geolocation is not supported by your browser device.');
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setGpsAccuracy(accuracy);
        setGpsPermissionStatus('granted');
        setManualCoords({ lat, lng });
        setLocationMethod('gps');
        setSelectedLocation('');
        setGeocodeError(null);

        try {
          const revName = await reverseGeocode(lat, lng);
          const formatted = revName || `GPS Position [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
          setManualGeocodedName(formatted);
          setManualAddress(formatted);
        } catch {
          const fallback = `GPS Position [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
          setManualGeocodedName(fallback);
          setManualAddress(fallback);
        } finally {
          setIsLocatingGPS(false);
          setGpsPermissionStatus('done');
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermissionStatus('denied');
          setGpsError('GPS permission was denied. You can state a landmark or select your area manually below.');
        } else if (err.code === err.TIMEOUT) {
          setGpsPermissionStatus('unavailable');
          setGpsError('GPS location request timed out. Please enter a nearby landmark.');
        } else {
          setGpsPermissionStatus('unavailable');
          setGpsError('Device location is currently unavailable. Please enter a landmark or choose an area.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  /* ── automatically trigger GPS on component mount ── */
  useEffect(() => {
    handleRequestGPS();
  }, [handleRequestGPS]);

  /* ── geocode manual address with debounce ── */
  useEffect(() => {
    if (!manualAddress.trim()) {
      setManualCoords(null);
      setManualGeocodedName(null);
      setGeocodeCandidates([]);
      setGeocodeError(null);
      setIsGeocoding(false);
      return;
    }

    // Clear coords if text changes and show loading
    const controller = new AbortController();
    setIsGeocoding(true);
    setGeocodeError(null);

    const timer = setTimeout(async () => {
      try {
        const result = await geocodeAddress(manualAddress, controller.signal);
        if (result) {
          setManualCoords({ lat: result.latitude, lng: result.longitude });
          setManualGeocodedName(result.displayName);
          setGeocodeCandidates(result.candidates || []);
          setGeocodeError(null);
        } else {
          setManualCoords(null);
          setManualGeocodedName(null);
          setGeocodeCandidates([]);
          setGeocodeError('Could not locate this landmark. You can click on the map to pin it manually.');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setManualCoords(null);
        setManualGeocodedName(null);
        setGeocodeCandidates([]);
        setGeocodeError('Geocoding service unavailable. You can click on the map to pin it manually.');
      } finally {
        setIsGeocoding(false);
      }
    }, 750);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [manualAddress]);

  /* ── duplicate detection checker ── */
  const runDuplicateCheck = useCallback(async () => {
    const textToCheck = (inputMethod === 'voice' ? transcription : textInput).trim();
    if (!textToCheck) return;

    setCheckingDuplicates(true);
    try {
      const chosenPreset = LOCATIONS.find((l) => l.name === selectedLocation);
      const latitude = chosenPreset?.lat ?? manualCoords?.lat ?? null;
      const longitude = chosenPreset?.lng ?? manualCoords?.lng ?? null;
      const locationName = selectedLocation || manualAddress || null;
      const effectiveIncidentType =
        reviewedIncidentType || aiAnalysis?.incident_type || deriveIncidentType();

      const result = await checkForDuplicateReports({
        description: textToCheck,
        incident_type: effectiveIncidentType,
        latitude,
        longitude,
        location_name: locationName,
      });

      setDuplicateResult(result);
    } catch (err: unknown) {
      console.error('[ReportPage] Duplicate check error:', err);
      setDuplicateResult({
        status: 'error',
        error: err instanceof Error ? err.message : 'Database error while checking duplicate reports.',
        match: null,
      });
    } finally {
      setCheckingDuplicates(false);
    }
  }, [
    inputMethod,
    transcription,
    textInput,
    selectedLocation,
    manualAddress,
    manualCoords,
    reviewedIncidentType,
    aiAnalysis,
    deriveIncidentType,
  ]);

  /* ── trigger duplicate check on Step 4 review ── */
  useEffect(() => {
    if (step === 4) {
      runDuplicateCheck();
    }
  }, [step, runDuplicateCheck]);

  /* ── submit report to Supabase ── */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    // Resolve location coordinates accurately
    const chosenPreset = LOCATIONS.find((l) => l.name === selectedLocation);
    const latitude = chosenPreset?.lat ?? manualCoords?.lat;
    const longitude = chosenPreset?.lng ?? manualCoords?.lng;
    const locationName = (selectedLocation || manualAddress || '').trim();

    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      setSubmitError('Please select a valid location or enter an address with verified coordinates.');
      setSubmitting(false);
      return;
    }

    const rawDescription = inputMethod === 'voice' ? transcription : textInput;
    const description = (rawDescription || '').trim();
    const transcript = inputMethod === 'voice' ? transcription : null;

    // SEC-05: Frontend input boundary validation
    if (!description) {
      setSubmitError('Please enter or record a flood description before submitting.');
      setSubmitting(false);
      return;
    }
    if (description.length > 2000) {
      setSubmitError(`Report description exceeds the 2,000 character limit (${description.length} chars).`);
      setSubmitting(false);
      return;
    }
    if (locationName.length > 250) {
      setSubmitError(`Location address exceeds the 250 character limit (${locationName.length} chars).`);
      setSubmitting(false);
      return;
    }

    // Use citizen-reviewed AI suggestions or fallbacks
    const finalSeverity = reviewedSeverity || (aiAnalysis?.severity as Severity) || deriveSeverity(waterLevel);
    const finalIncidentType = reviewedIncidentType || aiAnalysis?.incident_type || deriveIncidentType();

    // Attach duplicate_group_id if a duplicate match was identified
    let duplicateGroupId: string | null = null;
    if (duplicateResult?.status === 'duplicate_found' && duplicateResult.match) {
      const matched = duplicateResult.match.matchedReport;
      duplicateGroupId = matched.duplicate_group_id || matched.id;
    }

    const payload = {
      description,
      transcript,
      language,
      latitude,
      longitude,
      location_name: locationName || null,
      severity: finalSeverity,
      incident_type: finalIncidentType,
      status: 'reported', // Always kept as 'reported' initially per requirements
      duplicate_group_id: duplicateGroupId,
    };

    try {
      const { data, error } = await supabase
        .from('flood_reports')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        setSubmitError(error.message || 'Failed to submit report. Please try again.');
        setSubmitting(false);
        return;
      }

      // Use the database-generated id if available, otherwise keep local one
      if (data?.id) {
        setIncidentId(String(data.id));

        // SEC-03: Link duplicate reports via trusted server-side Edge Function (using service_role)
        if (duplicateResult?.status === 'duplicate_found' && duplicateResult.match) {
          const matched = duplicateResult.match.matchedReport;
          supabase.functions
            .invoke('link-duplicate', {
              body: {
                existing_report_id: matched.id,
                new_report_id: data.id,
              },
            })
            .then(({ error: linkErr }) => {
              if (linkErr) console.warn('[DuplicateCluster] Link notice:', linkErr.message);
            });
        }
      }

      setSubmitting(false);
      setStep(5);
    } catch (err: unknown) {
      console.error('Submission error:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setSubmitError(message);
      setSubmitting(false);
    }
  }, [
    selectedLocation,
    manualAddress,
    manualCoords,
    inputMethod,
    transcription,
    textInput,
    language,
    waterLevel,
    stranded,
    waterRising,
    reviewedSeverity,
    reviewedIncidentType,
    aiAnalysis,
    deriveSeverity,
    deriveIncidentType,
    duplicateResult,
  ]);

  const resetForm = useCallback(() => {
    resetRecording();
    setStep(1);
    setLanguage('english');
    setInputMethod('voice');
    setTextInput('');
    setWaterLevel(4);
    setPeopleAffected('5-20');
    setStranded(null);
    setWaterRising(null);
    setAdditionalDetails('');
    setSelectedLocation('');
    setManualAddress('');
    setManualCoords(null);
    setManualGeocodedName(null);
    setIsGeocoding(false);
    setGeocodeError(null);
    setSubmitting(false);
    setSubmitError(null);
    setAiAnalysis(null);
    setAnalyzingAI(false);
    setAiAnalysisError(null);
    setReviewedSeverity(null);
    setReviewedIncidentType(null);
    setReviewedRoadAccess(null);
    setReviewedSummary(null);
    setCheckingDuplicates(false);
    setDuplicateResult(null);
    setIncidentId(`FS-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  }, [resetRecording]);

  /* ── helpers ── */
  const reportText = inputMethod === 'voice' ? transcription : textInput;
  const locationText = selectedLocation || manualAddress;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !transcribing && reportText.trim().length > 0;
      case 2:
        return stranded !== null && waterRising !== null;
      case 3:
        if (selectedLocation) return true;
        if (manualAddress.trim()) {
          return !isGeocoding && manualCoords !== null;
        }
        return false;
      default:
        return true;
    }
  };

  /* ── Trigger AI analysis on Step 4 if not done yet ── */
  useEffect(() => {
    if (step === 4 && reportText.trim() && !aiAnalysis && !analyzingAI) {
      triggerAIAnalysis(reportText.trim());
    }
  }, [step, reportText, aiAnalysis, analyzingAI, triggerAIAnalysis]);

  /* ─── Progress Bar ─────────────────────────────────────────────────── */

  const renderProgressBar = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const isActive = s === step;
          const isComplete = s < step;
          return (
            <div key={label} className="flex flex-col items-center flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isComplete
                    ? 'bg-cyan-500 text-slate-900'
                    : isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-500 border border-white/10'
                }`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : s}
              </div>
              <span
                className={`text-xs mt-1.5 hidden sm:block transition-colors ${
                  isActive ? 'text-cyan-400 font-medium' : isComplete ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* connecting line */}
      <div className="relative h-1 bg-white/5 rounded-full mx-6 mt-1">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / (STEP_LABELS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );

  /* ─── Step 1 ───────────────────────────────────────────────────────── */

  const renderStep1 = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Report a Flood Incident</h2>
        <p className="text-slate-400">Your report helps save lives. Speak or type in your preferred language.</p>
      </div>

      {/* Real-time GPS Detection Status Pill */}
      <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Navigation className={`w-4 h-4 shrink-0 ${isLocatingGPS ? 'text-cyan-400 animate-pulse' : manualCoords ? 'text-emerald-400' : 'text-slate-400'}`} />
          <div>
            <span className="font-semibold text-white">
              {isLocatingGPS
                ? 'Detecting current GPS location...'
                : manualCoords && locationMethod === 'gps'
                ? `GPS Active: ${manualGeocodedName || `[${manualCoords.lat.toFixed(4)}, ${manualCoords.lng.toFixed(4)}]`}`
                : gpsPermissionStatus === 'denied'
                ? 'GPS permission denied (landmark or area fallback will be used)'
                : 'GPS position ready'}
            </span>
            {gpsAccuracy !== null && manualCoords && (
              <span className="text-[11px] text-emerald-400/80 ml-2 font-mono">
                (±{Math.round(gpsAccuracy)}m accuracy)
              </span>
            )}
          </div>
        </div>

        {isLocatingGPS ? (
          <span className="text-[11px] text-cyan-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Locating
          </span>
        ) : !manualCoords ? (
          <button
            type="button"
            onClick={handleRequestGPS}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            Enable GPS
          </button>
        ) : (
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            GPS Locked
          </span>
        )}
      </div>

      {/* language selection */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" /> Select Language
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LANGUAGES.map((l) => (
            <GlassCard
              key={l.key}
              hover
              padding="md"
              className={`text-center transition-all duration-300 ${
                language === l.key
                  ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/10 bg-cyan-500/10'
                  : ''
              }`}
              onClick={() => {
                setLanguage(l.key);
                if (recordedBlob && !transcribing) {
                  handleTranscribe(recordedBlob);
                }
              }}
            >
              <span className="text-3xl block mb-2">{l.flag}</span>
              <p className="text-white font-semibold">{l.name}</p>
              <p className="text-slate-400 text-sm">{l.native}</p>
              {language === l.key && (
                <CheckCircle className="w-5 h-5 text-cyan-400 mx-auto mt-2" />
              )}
            </GlassCard>
          ))}
        </div>
      </div>

      {/* input method */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* voice recording with Gnani AI STT */}
        <GlassCard
          padding="lg"
          className={`${
            inputMethod === 'voice'
              ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/10 bg-cyan-500/5'
              : ''
          } transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Mic className="w-5 h-5 text-cyan-400" /> Voice Recording (Gnani AI)
            </h3>
            {inputMethod !== 'voice' && (
              <button
                onClick={() => setInputMethod('voice')}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Use voice
              </button>
            )}
          </div>

          {inputMethod === 'voice' && (
            <div className="flex flex-col items-center space-y-4">
              {/* Mic error notice */}
              {micError && (
                <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{micError}</span>
                </div>
              )}

              {/* mic button */}
              <button
                onClick={() => {
                  if (recordingState === 'idle') startRecording();
                  else if (recordingState === 'recording') stopRecording();
                }}
                disabled={transcribing}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                  recordingState === 'recording'
                    ? 'bg-red-500/20 text-red-400'
                    : recordingState === 'done'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                } ${transcribing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {/* pulsing rings */}
                {recordingState === 'recording' && (
                  <>
                    <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
                    <span className="absolute inset-[-6px] rounded-full border-2 border-red-400/40 animate-pulse" />
                  </>
                )}
                {recordingState === 'done' ? (
                  <Check className="w-10 h-10" />
                ) : recordingState === 'recording' ? (
                  <MicOff className="w-10 h-10" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>

              {/* status text */}
              {recordingState === 'idle' && (
                <p className="text-slate-400 text-sm">Tap to start recording</p>
              )}

              {recordingState === 'recording' && (
                <div className="text-center">
                  <p className="text-red-400 font-semibold">Recording... {fmtTime(recordingTimer)}</p>
                  <p className="text-slate-500 text-xs mt-1">Tap to stop and transcribe</p>
                </div>
              )}

              {recordingState === 'done' && (
                <div className="text-center space-y-3 w-full">
                  <p className="text-emerald-400 font-semibold text-sm">
                    Recording complete — {fmtTime(recordingTimer)}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={
                        isPlayingAudio ? (
                          <Square className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Play className="w-4 h-4 text-cyan-400" />
                        )
                      }
                      onClick={togglePlayRecording}
                      disabled={transcribing || !recordedAudioUrl}
                    >
                      {isPlayingAudio ? 'Stop' : 'Replay'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RotateCcw className="w-4 h-4" />}
                      onClick={resetRecording}
                      disabled={transcribing}
                    >
                      Re-record
                    </Button>
                  </div>
                </div>
              )}

              {/* Transcription loading state */}
              {transcribing && (
                <div className="w-full mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center gap-2.5 text-cyan-400 text-sm animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Transcribing with Gnani AI ({LANGUAGES.find((l) => l.key === language)?.name})...</span>
                </div>
              )}

              {/* Transcription error state */}
              {transcribeError && !transcribing && (
                <div className="w-full mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-red-400">Transcription Notice</p>
                        <p className="text-xs text-red-300/80 mt-0.5 leading-relaxed">{transcribeError}</p>
                      </div>
                    </div>
                    {recordedBlob && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTranscribe(recordedBlob)}
                        disabled={transcribing}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Editable Transcription text area */}
              {transcription && !transcribing && (
                <div className="w-full mt-4 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      Transcription ({LANGUAGES.find((l) => l.key === language)?.name})
                    </p>
                    <span className="text-[11px] text-cyan-400/90 font-medium">Editable</span>
                  </div>
                  <textarea
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    placeholder="Transcription text..."
                    rows={4}
                    maxLength={1000}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 resize-none text-sm leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500">
                    You can edit the text above to correct names or details before continuing.
                  </p>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* text input */}
        <GlassCard
          padding="lg"
          className={`${
            inputMethod === 'text'
              ? 'border-cyan-400/60 shadow-lg shadow-cyan-500/10 bg-cyan-500/5'
              : ''
          } transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Type className="w-5 h-5 text-cyan-400" /> Or type your report
            </h3>
            {inputMethod !== 'text' && (
              <button
                onClick={() => setInputMethod('text')}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Use text
              </button>
            )}
          </div>

          {inputMethod === 'text' && (
            <div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={PLACEHOLDER_TEXT[language]}
                rows={8}
                maxLength={1000}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 resize-none transition-all text-sm"
              />
              <p className="text-right text-xs text-slate-600 mt-1">{textInput.length} / 1000</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );

  /* ─── Step 2 ───────────────────────────────────────────────────────── */

  const renderStep2 = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Flood Details</h2>
        <p className="text-slate-400">Help us understand the severity of the situation.</p>
      </div>

      {/* water level */}
      <GlassCard padding="lg">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-cyan-400" /> Water Level
        </h3>
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            {/* visual bar */}
            <div className="relative w-16 h-40 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500 to-cyan-400/40 transition-all duration-300 rounded-b-xl"
                style={{ height: `${(waterLevel / 10) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg drop-shadow">{waterLevel} ft</span>
              </div>
            </div>
            {/* slider */}
            <div className="flex-1 space-y-2">
              <input
                type="range"
                min={1}
                max={10}
                value={waterLevel}
                onChange={(e) => setWaterLevel(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1 ft</span>
                <span>5 ft</span>
                <span>10 ft</span>
              </div>
              <p className="text-sm text-slate-400">
                {waterLevel <= 2
                  ? 'Minor flooding — ankle level'
                  : waterLevel <= 4
                  ? 'Moderate flooding — knee level'
                  : waterLevel <= 6
                  ? 'Significant flooding — waist level'
                  : waterLevel <= 8
                  ? 'Severe flooding — chest level'
                  : 'Extreme flooding — life-threatening'}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* people affected */}
      <GlassCard padding="lg">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" /> People Affected (estimate)
        </h3>
        <div className="flex flex-wrap gap-3">
          {PEOPLE_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setPeopleAffected(r)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                peopleAffected === r
                  ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/25'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* yes / no toggles */}
      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard padding="lg">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Are people stranded?
          </h3>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setStranded(val)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  stranded === val
                    ? val
                      ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard padding="lg">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-cyan-400" /> Is the water rising?
          </h3>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setWaterRising(val)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  waterRising === val
                    ? val
                      ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* additional details */}
      <GlassCard padding="lg">
        <h3 className="text-white font-semibold mb-4">Additional Details</h3>
        <textarea
          value={additionalDetails}
          onChange={(e) => setAdditionalDetails(e.target.value)}
          placeholder="Any other important information..."
          rows={3}
          maxLength={500}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 resize-none transition-all text-sm"
        />
        <p className="text-right text-xs text-slate-600 mt-1">{additionalDetails.length} / 500</p>
      </GlassCard>
    </div>
  );

  /* ─── Step 3 ───────────────────────────────────────────────────────── */

  const renderStep3 = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Incident Location</h2>
        <p className="text-slate-400">
          Your current device GPS position is automatically detected. You can review or adjust the map pin below.
        </p>
      </div>

      {/* GPS Status Banner */}
      <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
            {isLocatingGPS ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : locationMethod === 'gps' ? (
              <Navigation className="w-5 h-5 text-emerald-400" />
            ) : (
              <MapPin className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">
                {isLocatingGPS
                  ? 'Detecting device GPS coordinates...'
                  : locationMethod === 'gps'
                  ? 'Automatic GPS Location Active'
                  : locationMethod === 'voice'
                  ? 'Voice Detected Landmark Active'
                  : 'Manual Pinned Location Active'}
              </span>
              {gpsAccuracy !== null && locationMethod === 'gps' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  ±{Math.round(gpsAccuracy)}m accuracy
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {manualGeocodedName || 'Acquiring location coordinates...'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRequestGPS}
          disabled={isLocatingGPS}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all disabled:opacity-50"
        >
          {isLocatingGPS ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{isLocatingGPS ? 'Locating...' : 'Refresh GPS'}</span>
        </button>
      </div>

      {/* Spoken Landmark vs GPS Notification */}
      {spokenLandmark && (
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-cyan-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="text-cyan-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              Different Incident Landmark Mentioned in Speech:
            </p>
            <p className="text-slate-300 mt-1">
              You mentioned <strong className="text-white">"{spokenLandmark.name}"</strong> in your voice report.
              {locationMethod === 'gps' && (
                <span className="text-slate-400 block mt-0.5">
                  The map is currently pinned to your physical GPS position. Would you like to pin the spoken incident landmark instead?
                </span>
              )}
            </p>
          </div>

          {spokenLandmark.coords && locationMethod !== 'voice' && (
            <button
              type="button"
              onClick={() => {
                if (spokenLandmark.coords) {
                  setManualCoords(spokenLandmark.coords);
                  setManualAddress(spokenLandmark.name);
                  setManualGeocodedName(`Spoken Landmark: ${spokenLandmark.name}`);
                  setLocationMethod('voice');
                  setSelectedLocation('');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-semibold shrink-0 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Pin "{spokenLandmark.name}"
            </button>
          )}

          {locationMethod === 'voice' && (
            <button
              type="button"
              onClick={handleRequestGPS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold shrink-0 transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              Revert to My Device GPS
            </button>
          )}
        </div>
      )}

      {/* Leaflet Map Preview */}
      {manualCoords && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Pinned Incident Marker
            </span>
            <span className="text-[11px] text-slate-500">
              Click anywhere on the map to adjust pin position if needed
            </span>
          </div>
          <LocationPickerMap
            latitude={manualCoords.lat}
            longitude={manualCoords.lng}
            locationName={manualGeocodedName || manualAddress || 'Incident Location'}
            zoom={15}
            height="260px"
            onLocationSelect={async (lat, lng) => {
              setManualCoords({ lat, lng });
              setLocationMethod('manual');
              setSelectedLocation('');
              setGeocodeError(null);
              try {
                const rev = await reverseGeocode(lat, lng);
                setManualGeocodedName(rev || `Adjusted Pin [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                setManualAddress(rev || `[${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              } catch {
                setManualGeocodedName(`Adjusted Pin [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              }
            }}
          />
        </div>
      )}

      {/* Fallback Section (Manual Landmark or Popular Area) */}
      <GlassCard padding="lg">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span>Manual Landmark / Area Fallback</span>
            {isGeocoding && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            {manualAddress.length} / 250
          </span>
        </div>

        {gpsError && (
          <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">{gpsError}</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Don't worry — you can enter your nearby landmark, street, or select an area below.
              </p>
            </div>
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={manualAddress}
            maxLength={250}
            onChange={(e) => {
              setManualAddress(e.target.value);
              setSelectedLocation('');
              setLocationMethod('manual');
            }}
            placeholder="Search landmark or address (e.g. Chengalpattu Railway Station, Tambaram)..."
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 transition-all text-sm ${
              manualCoords
                ? 'border-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-400/20'
                : geocodeError
                ? 'border-amber-500/50 focus:border-amber-400 focus:ring-amber-400/20'
                : 'border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20'
            }`}
          />
          {isGeocoding && (
            <div className="absolute right-3 top-3 text-cyan-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Candidate disambiguation if multiple potential landmark matches */}
        {!isGeocoding && geocodeCandidates.length > 1 && (
          <div className="mt-3 p-3 rounded-xl bg-slate-800/80 border border-cyan-500/20 space-y-2">
            <p className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Matching Landmarks (select if different from above):
            </p>
            <div className="space-y-1.5">
              {geocodeCandidates.map((candidate, idx) => {
                const isSelected =
                  manualCoords &&
                  Math.abs(manualCoords.lat - candidate.latitude) < 0.0001 &&
                  Math.abs(manualCoords.lng - candidate.longitude) < 0.0001;

                return (
                  <button
                    key={`${candidate.latitude}-${candidate.longitude}-${idx}`}
                    type="button"
                    onClick={() => {
                      setManualCoords({ lat: candidate.latitude, lng: candidate.longitude });
                      setManualGeocodedName(candidate.displayName);
                      setLocationMethod('manual');
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-white'
                        : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-cyan-500/10 hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">{candidate.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{candidate.displayName}</div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 font-medium shrink-0">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-white/5">
          <p className="text-xs text-slate-400 font-medium mb-3">Or choose a predefined area:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => {
                  setSelectedLocation(loc.name);
                  setManualCoords({ lat: loc.lat, lng: loc.lng });
                  setManualAddress(loc.name);
                  setManualGeocodedName(loc.description);
                  setLocationMethod('preset');
                  setGeocodeError(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedLocation === loc.name
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-white shadow-lg shadow-cyan-500/10'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="font-semibold text-xs text-white truncate">{loc.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{loc.description}</div>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );

  /* ─── Step 4 ───────────────────────────────────────────────────────── */

  const SummaryRow = ({
    label,
    value,
    editStep,
  }: {
    label: string;
    value: React.ReactNode;
    editStep: number;
  }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-slate-200 text-sm">{value}</p>
      </div>
      <button
        onClick={() => setStep(editStep)}
        className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 shrink-0 mt-1"
      >
        Edit
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Review Your Report</h2>
        <p className="text-slate-400">Please verify AI insights and details before final submission.</p>
      </div>

      {/* ── Groq AI Incident Intelligence Card ── */}
      <GlassCard padding="lg" className="max-w-2xl mx-auto border-cyan-400/30 bg-cyan-950/20 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                Groq AI Incident Analysis
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {aiModel}
                </span>
              </h3>
              <p className="text-slate-400 text-xs">
                AI analyzed your description. You can review and correct suggestions below.
              </p>
            </div>
          </div>

          {aiAnalysis && !analyzingAI && (
            <div className="flex flex-wrap items-center gap-2">
              {aiAnalysis.requires_attention ? (
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-400" /> Requires Attention
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                  Standard Priority
                </span>
              )}
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
                {Math.round((aiAnalysis.confidence || 0.9) * 100)}% Confidence
              </span>
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {analyzingAI && (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin mx-auto" />
            <p className="text-cyan-300 text-xs font-medium">Extracting incident intelligence with Groq AI...</p>
          </div>
        )}

        {/* Error State */}
        {aiAnalysisError && !analyzingAI && (
          <div className="p-3 my-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{aiAnalysisError}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => triggerAIAnalysis(reportText)}>
              Retry
            </Button>
          </div>
        )}

        {/* AI Results & Review Inputs */}
        {aiAnalysis && !analyzingAI && (
          <div className="pt-4 space-y-4">
            {/* AI Summary */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                AI Summary
              </p>
              <textarea
                value={reviewedSummary !== null ? reviewedSummary : aiAnalysis.summary}
                onChange={(e) => setReviewedSummary(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-cyan-400/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Incident Type */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Incident Type
                </label>
                <input
                  type="text"
                  value={reviewedIncidentType !== null ? reviewedIncidentType : aiAnalysis.incident_type}
                  onChange={(e) => setReviewedIncidentType(e.target.value)}
                  className="w-full bg-[#0c1225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white capitalize focus:outline-none focus:border-cyan-400/50"
                  placeholder="e.g. flooding"
                />
              </div>

              {/* Suggested Severity */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Suggested Severity
                </label>
                <select
                  value={reviewedSeverity !== null ? reviewedSeverity : aiAnalysis.severity}
                  onChange={(e) => setReviewedSeverity(e.target.value as Severity)}
                  className="w-full bg-[#0c1225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white capitalize focus:outline-none focus:border-cyan-400/50"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Road Access */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Road Access
                </label>
                <select
                  value={
                    reviewedRoadAccess !== null
                      ? reviewedRoadAccess
                      : aiAnalysis.road_access === 'partial'
                      ? 'partially_blocked'
                      : aiAnalysis.road_access
                  }
                  onChange={(e) => setReviewedRoadAccess(e.target.value)}
                  className="w-full bg-[#0c1225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white capitalize focus:outline-none focus:border-cyan-400/50"
                >
                  <option value="clear">Clear</option>
                  <option value="partially_blocked">Partially Blocked</option>
                  <option value="blocked">Blocked</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              {/* Requires Attention */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Requires Attention
                </label>
                <div className="flex items-center h-[34px]">
                  {aiAnalysis.requires_attention ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Yes (Urgent)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> No (Standard)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span>✓ You can adjust any of the above AI suggestions before confirming.</span>
              <button
                type="button"
                onClick={() => triggerAIAnalysis(reportText)}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" /> Re-analyze
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── AI-Assisted Duplicate Report Detection Warning / Status ── */}
      {checkingDuplicates && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
          <span className="text-xs text-cyan-200">
            Checking recent reports in your area for potential duplicates within 500m (last 24 hours)...
          </span>
        </div>
      )}

      {duplicateResult?.status === 'error' && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">Duplicate Check Notice</p>
            <p className="text-amber-300/80 mt-0.5">
              Could not verify previous reports due to a network or database issue ({duplicateResult.error}). Your report will still be submitted safely.
            </p>
          </div>
        </div>
      )}

      {duplicateResult?.status === 'duplicate_found' && duplicateResult.match && (
        <div className="max-w-2xl mx-auto p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-lg shadow-amber-500/10 space-y-4 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  Possible Duplicate Report Detected
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">
                    {duplicateResult.match.confidence} Match
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {duplicateResult.match.reason}
                </p>
              </div>
            </div>
          </div>

          {/* Matching Report Details */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-2.5 text-xs">
            <div className="text-[11px] font-semibold text-amber-300/90 uppercase tracking-wider flex items-center justify-between">
              <span>Matching Report in Area</span>
              <span className="font-mono text-slate-400 text-[10px]">
                ID: {duplicateResult.match.matchedReport.id.slice(0, 8)}...
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Incident Type</span>
                <span className="text-slate-200 font-medium capitalize">
                  {duplicateResult.match.matchedReport.incident_type || 'Flooding'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Approximate Location</span>
                <span className="text-slate-200 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  {duplicateResult.match.matchedReport.location_name || 'Nearby area'}
                  {duplicateResult.match.distanceMeters !== null && (
                    <span className="text-amber-300/80 text-[11px]">
                      (~{duplicateResult.match.distanceMeters}m away)
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Submitted</span>
                <span className="text-slate-200 font-medium">
                  {formatRelativeTime(duplicateResult.match.matchedReport.created_at)}
                </span>
              </div>
            </div>

            {duplicateResult.match.matchedReport.description && (
              <div className="pt-2 border-t border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Report Description</span>
                <p className="text-slate-300 text-xs italic bg-white/5 p-2 rounded-lg line-clamp-2">
                  "{duplicateResult.match.matchedReport.description}"
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs">
            <span className="text-slate-400 text-[11px]">
              ℹ️ If your situation is worsening or needs fresh attention, you can still submit. It will be grouped into the incident cluster.
            </span>
            <button
              type="button"
              onClick={() => runDuplicateCheck()}
              className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-medium shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Re-check
            </button>
          </div>
        </div>
      )}

      {duplicateResult?.status === 'unique' && !checkingDuplicates && (
        <div className="max-w-2xl mx-auto p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>✓ No duplicate reports found within 500m in the last 24 hours.</span>
          </div>
          <button
            type="button"
            onClick={() => runDuplicateCheck()}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" /> Re-check
          </button>
        </div>
      )}

      {/* ── Standard Review Details ── */}
      <GlassCard padding="lg" className="max-w-2xl mx-auto">
        <SummaryRow
          label="Language"
          value={LANGUAGES.find((l) => l.key === language)?.name ?? language}
          editStep={1}
        />
        <SummaryRow label="Input Method" value={inputMethod === 'voice' ? 'Voice Recording' : 'Text Input'} editStep={1} />
        <SummaryRow label="Report Description" value={reportText} editStep={1} />
        <SummaryRow label="Water Level" value={`${waterLevel} feet`} editStep={2} />
        <SummaryRow label="People Affected" value={peopleAffected} editStep={2} />
        <SummaryRow
          label="People Stranded"
          value={
            <span className={stranded ? 'text-red-400 font-medium' : 'text-emerald-400'}>
              {stranded ? 'Yes' : 'No'}
            </span>
          }
          editStep={2}
        />
        <SummaryRow
          label="Water Rising"
          value={
            <span className={waterRising ? 'text-red-400 font-medium' : 'text-emerald-400'}>
              {waterRising ? 'Yes' : 'No'}
            </span>
          }
          editStep={2}
        />
        {additionalDetails && <SummaryRow label="Additional Details" value={additionalDetails} editStep={2} />}
        <SummaryRow
          label="Location"
          value={
            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> {locationText}
              </span>
              {manualCoords && (
                <div className="flex items-center gap-2 pl-5 pt-0.5">
                  <span className="text-[11px] text-emerald-400">
                    Coordinates: [{manualCoords.lat.toFixed(4)}, {manualCoords.lng.toFixed(4)}]
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    Source: {locationMethod}
                  </span>
                </div>
              )}
            </div>
          }
          editStep={3}
        />
      </GlassCard>

      {/* Error message */}
      {submitError && (
        <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold text-sm">Submission Failed</p>
            <p className="text-red-300/80 text-sm mt-1">{submitError}</p>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-600 max-w-md mx-auto">
        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        Your report will be saved to the database with status "reported" for authority review.
      </p>
    </div>
  );

  /* ─── Step 5 ───────────────────────────────────────────────────────── */

  const renderStep5 = () => (
    <div className="space-y-8 animate-fadeIn text-center">
      {/* success animation */}
      <div className="flex justify-center">
        <div className="relative w-28 h-28">
          <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white">Report Submitted Successfully!</h2>
        <p className="text-slate-400">
          Incident ID: <span className="text-cyan-400 font-mono font-semibold">{incidentId}</span>
        </p>
      </div>

      <GlassCard padding="lg" className="max-w-lg mx-auto text-left space-y-4">
        <h3 className="text-white font-semibold text-center mb-2">What happens next</h3>
        {[
          { icon: <Droplets className="w-5 h-5 text-cyan-400" />, text: 'Your report has been analyzed by AI' },
          duplicateResult?.status === 'duplicate_found'
            ? {
                icon: <Layers className="w-5 h-5 text-amber-400" />,
                text: 'Linked with existing incident cluster for coordinated emergency response',
              }
            : {
                icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
                text: 'Authorities will be notified with your incident details',
              },
          { icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, text: "You'll receive updates on your report" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 text-slate-300 text-sm">
            {item.icon}
            <span>{item.text}</span>
          </div>
        ))}
      </GlassCard>

      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
        <Button size="lg" icon={<MapPin className="w-5 h-5" />} onClick={() => navigate('/incidents')}>
          Track Your Report
        </Button>
        <Button size="lg" variant="secondary" icon={<RotateCcw className="w-5 h-5" />} onClick={resetForm}>
          Submit Another Report
        </Button>
      </div>
    </div>
  );

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {renderProgressBar()}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}

      {/* navigation */}
      {step < 5 && (
        <div className="flex justify-between mt-10">
          {step > 1 ? (
            <Button variant="ghost" icon={<ChevronLeft className="w-5 h-5" />} onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              icon={<ChevronRight className="w-5 h-5" />}
              disabled={!canProceed()}
              onClick={() => {
                if (step === 1 && reportText.trim() && !aiAnalysis && !analyzingAI) {
                  triggerAIAnalysis(reportText.trim());
                }
                if (step === 3) {
                  runDuplicateCheck();
                }
                setStep(step + 1);
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              size="lg"
              icon={submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              onClick={handleSubmit}
              disabled={submitting}
              className={`shadow-xl ${
                duplicateResult?.status === 'duplicate_found'
                  ? 'bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 shadow-amber-500/20'
                  : 'shadow-cyan-500/20'
              }`}
            >
              {submitting
                ? 'Submitting...'
                : duplicateResult?.status === 'duplicate_found'
                ? 'Submit Report Anyway'
                : 'Submit Report'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
