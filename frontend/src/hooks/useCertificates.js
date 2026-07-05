import { useCallback, useEffect, useState } from 'react';
import { readContract } from '../lib/clients.js';

/**
 * Load the latest certificates from the contract.  Deliberately fires a
 * single fetch on mount and only refreshes on explicit user action to avoid
 * bursting the gen_call rate limit.
 */
export function useCertificates(limit = 20) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await readContract('list_certificates', [0, limit]);
      setCertificates(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load certificates.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { certificates, loading, error, refresh: load };
}

export function useConfig() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await readContract('get_config', []);
        if (!cancelled) setConfig(cfg);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load config.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, error };
}

export function useCertificate(assessmentId) {
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (id) => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const c = await readContract('get_certificate', [id]);
        setCert(c && Object.keys(c).length ? c : null);
      } catch (err) {
        setError(err?.message || 'Failed to load certificate.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(assessmentId);
  }, [assessmentId, load]);

  return { certificate: cert, loading, error, refresh: () => load(assessmentId) };
}
