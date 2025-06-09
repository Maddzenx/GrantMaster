"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function GrantsDashboard() {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchGrants() {
      setLoading(true);
      let { data, error } = await supabase
        .from("grants")
        .select("id, title, description, deadline")
        .order("deadline", { ascending: true });
      if (!error) setGrants(data);
      setLoading(false);
    }
    fetchGrants();
  }, []);

  const filtered = grants.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Grant Discovery Dashboard</h1>
      <input
        type="text"
        placeholder="Search grants..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 p-2 border rounded w-full"
      />
      {loading ? (
        <p>Loading grants...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((grant) => (
            <div key={grant.id} className="p-4 border rounded shadow">
              <h2 className="text-xl font-semibold mb-2">{grant.title}</h2>
              <p className="mb-2 text-gray-700">{grant.description.slice(0, 120)}...</p>
              <p className="mb-2 text-sm text-gray-500">Deadline: {grant.deadline || "N/A"}</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 