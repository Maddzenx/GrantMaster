export async function fetchUtlysningarOpen(date: string = '2017-07-01') {
  const res = await fetch(`/api/vinnova/open-utlysningar?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch utlysningar');
  return res.json();
}

export async function fetchApplicationRoundsOpen(date: string = '2017-07-01') {
  const res = await fetch(`/api/vinnova/open-application-rounds?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch application rounds');
  return res.json();
} 