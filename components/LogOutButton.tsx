'use client';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import LogoutButton from '../components/LogOutButton';  

export default function LogOutButton() {
  const supabase = useSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Optionally, redirect or refresh the page
    window.location.reload();
  };

  return (
    <button onClick={handleLogout} style={{ padding: 8, margin: 8 }}>
      Log out
    </button>
  );
}
