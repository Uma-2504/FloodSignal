import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { FloodReport } from '../types';

export function useFloodReports() {
  const [reports, setReports] = useState<FloodReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthority, setIsAuthority] = useState(false);

  // Check auth state (detect anonymous vs authenticated authority)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthority(Boolean(session?.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthority(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('flood_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        throw fetchErr;
      }

      setReports((data as FloodReport[]) || []);
    } catch (err: unknown) {
      console.error('Error fetching flood_reports:', err);
      const message = err instanceof Error ? err.message : 'Failed to load flood reports from Supabase.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    // Setup Supabase Realtime channel for flood_reports
    const channel = supabase
      .channel('realtime_flood_reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flood_reports',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as FloodReport;
            setReports((prev) => [newRow, ...prev.filter((r) => r.id !== newRow.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as FloodReport;
            setReports((prev) =>
              prev.map((r) => (r.id === updatedRow.id ? updatedRow : r))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as { id: string };
            setReports((prev) => prev.filter((r) => r.id !== deletedRow.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase Realtime channel subscription error');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
    isAuthority,
  };
}

