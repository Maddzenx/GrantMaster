import { useEffect, useState } from 'react';
import { Grant } from '../types/grant';
import { fetchUtlysningarOpen } from '../../../lib/vinnovaOpenApi';

interface UseGrantsResult {
  grants: Grant[];
  loading: boolean;
  error: string | null;
}

export function useGrants(): UseGrantsResult {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchUtlysningarOpen('2017-07-01')
      .then((data: any[]) => {
        // Map the open API data to the Grant type
        const mapped = Array.isArray(data)
          ? data.map((item) => ({
              id: item.Diarienummer || item.id || '',
              title: item.Titel || item.title || '',
              description: item.Beskrivning || item.description || '',
              deadline: item.Publiceringsdatum || item.deadline || '',
              sector: item.sector || null,
              stage: item.stage || null,
              fundingAmount: item.fundingAmount || null,
              tags: item.tags || [],
            }))
          : [];
        setGrants(mapped);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch grants');
      })
      .finally(() => setLoading(false));
  }, []);

  return { grants, loading, error };
}
