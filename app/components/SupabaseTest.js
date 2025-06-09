"use client";

import { useEffect, useState } from "react";
import { supabase } from '../../lib/supabaseClient';

export default function SupabaseTest() {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGrants() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("grants").select("id, title, description").limit(5);
      if (error) setError(error.message);
      else setGrants(data || []);
      setLoading(false);
    }
    fetchGrants();
  }, []);

  if (loading) return <p>Loading grants from Supabase...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!grants.length) return <p>No grants found in Supabase.</p>;

  return (
    <div className="my-6 p-4 border rounded">
      <h2 className="text-lg font-bold mb-2">Supabase Grants Test</h2>
      <ul className="list-disc pl-6">
        {grants.map((grant) => (
          <li key={grant.id}>
            <span className="font-semibold">{grant.title}</span>: {grant.description?.slice(0, 60)}
          </li>
        ))}
      </ul>
    </div>
  );
} 