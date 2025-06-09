import { useEffect, useState } from 'react';
import VinnovaNav from '../components/VinnovaNav';

export default function VinnovaFinansieradeAktiviteterPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vinnova/finansieradeaktiviteter?limit=10');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (Array.isArray(data.finansieradeAktiviteter)) {
        setActivities(data.finansieradeAktiviteter);
      } else if (Array.isArray(data)) {
        setActivities(data);
      } else if (Array.isArray(data.results)) {
        setActivities(data.results);
      } else {
        setActivities([]);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <VinnovaNav />
      <h1>Vinnova Finansierade Aktiviteter (Top 10)</h1>
      {loading && <p>Loading...</p>}
      {error && (
        <div style={{ color: 'red', margin: '1rem 0' }}>
          <p>Error: {error}</p>
          <button onClick={fetchActivities} style={{ marginTop: 8 }}>Retry</button>
        </div>
      )}
      {!loading && !error && activities.length === 0 && <p>No activities available at this time.</p>}
      <ul>
        {activities.map((activity) => (
          <li key={activity.AktivitetsID || activity.id} style={{ marginBottom: '1.5rem' }}>
            <strong>{activity.Aktivitetsnamn || activity.namn || activity.title}</strong>
            <br />
            <span>{activity.Beskrivning || activity.description}</span>
            <br />
            <small>Startdatum: {activity.Startdatum || activity.startdatum}</small>
            <br />
            <small>Slutdatum: {activity.Slutdatum || activity.slutdatum}</small>
          </li>
        ))}
      </ul>
    </div>
  );
} 