import SupabaseTest from './components/SupabaseTest';
import LogoutButton from '../components/LogOutButton';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-6xl bg-red-500 text-white p-4">GrantMaster MVP</h1>
      <p className="mb-4 text-lg text-gray-700">This is a test page to verify Tailwind CSS and Supabase integration.</p>
      <button className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 mb-8">
        Tailwind Button
      </button>
      <SupabaseTest />
      <LogoutButton />
    </div>
  );
}