import { useAuth } from './useAuth';

export default function LogOutEverywhereButton() {
  const { logOutEverywhere, loading } = useAuth();

  return (
    <button
      onClick={logOutEverywhere}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      Log out everywhere
    </button>
  );
} 