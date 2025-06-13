'use client'
import { useState, useEffect } from 'react';
import { getFeatureFlags, DEFAULT_FEATURE_FLAGS, FeatureFlags } from '../featureFlags';

export function useFeatureFlag(feature: keyof FeatureFlags): [boolean, boolean, string | null] {
  const [enabled, setEnabled] = useState(DEFAULT_FEATURE_FLAGS[feature]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    async function checkFlag() {
      setLoading(true);
      setError(null);

      // Timeout after 5 seconds
      timeoutId = setTimeout(() => {
        if (isMounted) {
          setError('Timeout fetching feature flags');
          setLoading(false);
        }
      }, 5000);

      try {
        const flags = await getFeatureFlags();
        if (isMounted) {
          setEnabled(flags[feature]);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch feature flags');
          setLoading(false);
        }
        console.error('[useFeatureFlag] Error fetching feature flags:', err);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    checkFlag();
    const interval = setInterval(checkFlag, 60000);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [feature]);

  return [enabled, loading, error];
} 