import { useEffect, useState } from 'react';
import VinnovaNav from '../components/VinnovaNav';

export default function VinnovaAnsokningarPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/vinnova/ansokningar?status=Beviljad&limit=10')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data.ansokningar)) {
          setApplications(data.ansokningar);
        } else if (Array.isArray(data)) {
          setApplications(data);
        } else if (Array.isArray(data.results)) {
          setApplications(data.results);
        } else {
          setApplications([]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <VinnovaNav />
      <h1>Vinnova Ansökningar (Beviljade, Top 10)</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <ul>
        {applications.map((app) => (
          <li key={app.Diarienummer || app.id} style={{ marginBottom: '1.5rem' }}>
            <strong>{app.Titel || app.title}</strong>
            <br />
            <span>{app.Beskrivning || app.description}</span>
            <br />
            <small>Status: {app.Status || app.status}</small>
            <br />
            <small>Beslutsdatum: {app.Beslutsdatum || app.beslutsdatum}</small>
          </li>
        ))}
      </ul>
    </div>
  );
} 