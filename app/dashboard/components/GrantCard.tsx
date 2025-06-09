import React from 'react';
import { Grant } from '../types/grant';

interface GrantCardProps {
  grant: Grant;
}

const GrantCard: React.FC<GrantCardProps> = ({ grant }) => (
  <div className="bg-white rounded-lg shadow p-4 border hover:shadow-lg transition flex flex-col gap-2">
    <h2 className="text-lg font-semibold mb-1">{grant.title}</h2>
    <p className="text-gray-600 mb-1">{grant.description}</p>
    <div className="flex flex-wrap gap-2 text-sm text-gray-500">
      {grant.deadline && (
        <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Deadline: {grant.deadline}</span>
      )}
      {grant.sector && (
        <span className="inline-block bg-green-50 text-green-700 px-2 py-0.5 rounded">Sector: {grant.sector}</span>
      )}
      {grant.stage && (
        <span className="inline-block bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">Stage: {grant.stage}</span>
      )}
      {grant.fundingAmount && (
        <span className="inline-block bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Funding: {grant.fundingAmount}</span>
      )}
    </div>
    {grant.tags && grant.tags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-1">
        {grant.tags.map((tag) => (
          <span key={tag} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
            {tag}
          </span>
        ))}
      </div>
    )}
  </div>
);

export default GrantCard;
