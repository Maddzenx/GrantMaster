import { useAuth } from '../../app/lib/auth/AuthContext';

export default function LogoutWarningBanner() {
  const { showLogoutWarning, dismissLogoutWarning } = useAuth();

  if (!showLogoutWarning) return null;
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-200 text-yellow-900 px-6 py-3 rounded shadow-lg z-50 flex items-center">
      <span>Your session will expire in 1 minute. Please save your work.</span>
      <button
        className="ml-4 text-sm underline hover:text-yellow-700"
        onClick={dismissLogoutWarning}
      >
        Dismiss
      </button>
    </div>
  );
} 