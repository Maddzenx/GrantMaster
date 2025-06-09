import React from 'react';
import { useGrants } from '../hooks/useGrants';
import GrantCard from './GrantCard';

const GrantList: React.FC = () => {
  const { grants, loading, error } = useGrants();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></span>
        <span className="ml-2 text-gray-500">Loading grants...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-8">Error: {error}</div>
    );
  }

  if (!grants.length) {
    return (
      <div className="text-gray-500 text-center py-8">No grants found.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {grants.map((grant) => (
        <GrantCard key={grant.id} grant={grant} />
      ))}
    </div>
  );
};

export default GrantList;
