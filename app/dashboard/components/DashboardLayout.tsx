'use client';
import React, { useEffect, useState, Suspense } from 'react';
import FilterPanel from './FilterPanel';
import SearchBar from './SearchBar';
import GrantList from './GrantList';
import LogoutButton from '@/components/LogOutButton';
import { useAuth } from '../../lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchApplicationRoundsOpen, fetchUtlysningarOpen } from '../../../lib/vinnovaOpenApi';
import { HiOutlineSpeakerphone, HiOutlineClipboardList } from 'react-icons/hi';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [applicationRounds, setApplicationRounds] = useState<any[]>([]);
  const [appRoundsLoading, setAppRoundsLoading] = useState(true);
  const [appRoundsError, setAppRoundsError] = useState<string | null>(null);
  const [diarienummerList, setDiarienummerList] = useState<string[]>([]);
  const [diarienummerLoading, setDiarienummerLoading] = useState(true);
  const [diarienummerError, setDiarienummerError] = useState<string | null>(null);
  const [ReactMarkdown, setReactMarkdown] = useState<any>(null);
  const [vinnovaMarkdown, setVinnovaMarkdown] = useState('');
  const [vinnovaMarkdownLoading, setVinnovaMarkdownLoading] = useState(true);
  const [vinnovaMarkdownError, setVinnovaMarkdownError] = useState<string | null>(null);

  useEffect(() => {
    console.log('DashboardLayout: loading=', loading, 'user=', user);
    if (!loading && user === null) {
      router.replace('/login?redirectedFrom=/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchApplicationRoundsOpen('2017-07-01')
      .then((data) => {
        setApplicationRounds(Array.isArray(data) ? data : []);
        setAppRoundsError(null);
      })
      .catch((err) => setAppRoundsError(err.message || 'Failed to fetch application rounds'))
      .finally(() => setAppRoundsLoading(false));
  }, []);

  useEffect(() => {
    setDiarienummerLoading(true);
    fetchUtlysningarOpen('2017-07-01')
      .then((data) => {
        const diarienummer = Array.isArray(data)
          ? Array.from(new Set(data.map((item) => item.Diarienummer).filter(Boolean)))
          : [];
        setDiarienummerList(diarienummer);
        setDiarienummerError(null);
      })
      .catch((err) => setDiarienummerError(err.message || 'Failed to fetch Diarienummer'))
      .finally(() => setDiarienummerLoading(false));
  }, []);

  useEffect(() => {
    import('react-markdown').then((mod) => setReactMarkdown(() => mod.default));
  }, []);

  useEffect(() => {
    setVinnovaMarkdownLoading(true);
    fetch('/vinnova_hitta_finansiering.md')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Vinnova info');
        return res.text();
      })
      .then(setVinnovaMarkdown)
      .catch((err) => setVinnovaMarkdownError(err.message || 'Failed to load Vinnova info'))
      .finally(() => setVinnovaMarkdownLoading(false));
  }, []);

  if (loading) return <div>Restoring session...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">Grant Discovery Dashboard</h1>
        <LogoutButton />
      </header>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (filters) */}
        <aside className="hidden md:block w-64 bg-white border-r p-4 overflow-y-auto">
          <FilterPanel />
        </aside>
        {/* Main area */}
        <main className="flex-1 p-4 overflow-y-auto flex flex-col gap-6 bg-gradient-to-br from-blue-50 via-white to-green-50">
          <div className="mb-2">
            <SearchBar />
          </div>
          {/* Welcome Message */}
          <div className="mb-4 p-6 bg-white border border-gray-200 rounded shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-semibold text-blue-900 mb-1">Welcome, {user?.email || 'User'}!</h2>
              <p className="text-gray-700">Discover funding opportunities, application rounds, and more from Vinnova. Use the filters and search to find grants that match your needs.</p>
            </div>
          </div>
          {/* Vinnova Hitta Finansiering Markdown Section */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded shadow-sm max-h-96 overflow-y-auto">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Vinnova: Hitta finansiering</h2>
            {vinnovaMarkdownLoading && <span className="text-gray-500">Loading Vinnova info...</span>}
            {vinnovaMarkdownError && <span className="text-red-600">Error: {vinnovaMarkdownError}</span>}
            {!vinnovaMarkdownLoading && !vinnovaMarkdownError && ReactMarkdown && (
              <div className="prose max-w-none">
                <ReactMarkdown>{vinnovaMarkdown.slice(0, 5000)}</ReactMarkdown>
                <a
                  href="/vinnova_hitta_finansiering.md"
                  download
                  className="mt-4 inline-block text-yellow-700 underline hover:text-yellow-900"
                >
                  Download full guide (Markdown)
                </a>
              </div>
            )}
          </div>
          {/* Calls for Proposals Section */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <HiOutlineSpeakerphone className="text-blue-700 text-2xl mr-2" />
              <h2 className="text-xl font-semibold text-blue-800">Calls for Proposals (Utlysningar)</h2>
            </div>
            <p className="text-blue-900 mb-2">
              Explore current and past funding opportunities from Vinnova. Data is fetched from Vinnova's open data API and updated regularly.
            </p>
            <a
              href="https://data.vinnova.se/utlysningar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline hover:text-blue-900"
            >
              View all Calls for Proposals on Vinnova Open Data
            </a>
          </div>
          {/* Diarienummer List Section */}
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded shadow-sm">
            <h2 className="text-lg font-semibold text-indigo-800 mb-2">All Diarienummer from Calls for Proposals</h2>
            {diarienummerLoading && <span className="text-gray-500">Loading Diarienummer...</span>}
            {diarienummerError && <span className="text-red-600">Error: {diarienummerError}</span>}
            {!diarienummerLoading && !diarienummerError && diarienummerList.length === 0 && (
              <span className="text-gray-500">No Diarienummer found.</span>
            )}
            <div className="max-h-48 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
              {diarienummerList.map((num) => (
                <div key={num} className="bg-white rounded px-3 py-1 border text-indigo-900 text-sm font-mono shadow-sm">
                  {num}
                </div>
              ))}
            </div>
          </div>
          {/* Divider */}
          <div className="w-full border-t border-gray-200 my-2" />
          {/* Application Rounds Section */}
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <HiOutlineClipboardList className="text-green-700 text-2xl mr-2" />
              <h2 className="text-xl font-semibold text-green-800">Application Rounds (Ansökningsomgångar)</h2>
            </div>
            <p className="text-green-900 mb-2">
              Discover application rounds for Vinnova grants. Data is fetched from Vinnova's open data API.
            </p>
            {appRoundsLoading && <span className="text-gray-500">Loading application rounds...</span>}
            {appRoundsError && <span className="text-red-600">Error: {appRoundsError}</span>}
            {!appRoundsLoading && !appRoundsError && applicationRounds.length === 0 && (
              <span className="text-gray-500">No application rounds found.</span>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {applicationRounds.slice(0, 9).map((round, idx) => (
                <div
                  key={round.Diarienummer || round.id || idx}
                  className="bg-white rounded-lg p-4 border shadow hover:shadow-lg transition flex flex-col gap-1 cursor-pointer hover:bg-green-100"
                >
                  <div className="font-semibold text-green-900 text-lg">{round.Titel || round.title || 'Untitled'}</div>
                  <div className="text-gray-700 text-sm line-clamp-3">{round.Beskrivning || round.description || ''}</div>
                  <div className="text-xs text-gray-500 mt-1">{round.Publiceringsdatum || round.date || ''}</div>
                </div>
              ))}
            </div>
            <a
              href="https://data.vinnova.se/ansokningsomgangar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline hover:text-green-900 mt-2 inline-block"
            >
              View all Application Rounds on Vinnova Open Data
            </a>
          </div>
          <GrantList />
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
