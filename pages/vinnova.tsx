import { useEffect, useState } from 'react';
import VinnovaNav from '../components/VinnovaNav';

export default function VinnovaUtlysningarPage() {
  const [grants, setGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vinnova/utlysningar?Publik=1&limit=10');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (Array.isArray(data.utlysningar)) {
        setGrants(data.utlysningar);
      } else if (Array.isArray(data)) {
        setGrants(data);
      } else if (Array.isArray(data.results)) {
        setGrants(data.results);
      } else {
        setGrants([]);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <VinnovaNav />
      <h1>Vinnova Utlysningar (Public, Top 10)</h1>
      {loading && <p>Loading...</p>}
      {error && (
        <div style={{ color: 'red', margin: '1rem 0' }}>
          <p>Error: {error}</p>
          <button onClick={fetchGrants} style={{ marginTop: 8 }}>Retry</button>
        </div>
      )}
      {!loading && !error && grants.length === 0 && <p>No grants available at this time.</p>}
      <ul>
        {grants.map((grant) => (
          <li key={grant.Diarienummer || grant.id} style={{ marginBottom: '1.5rem' }}>
            <strong>{grant.Titel || grant.title}</strong>
            <br />
            <span>{grant.Beskrivning || grant.description}</span>
            <br />
            <small>Publiceringsdatum: {grant.Publiceringsdatum || grant.deadline}</small>
          </li>
        ))}
      </ul>
    </div>
  );
} 