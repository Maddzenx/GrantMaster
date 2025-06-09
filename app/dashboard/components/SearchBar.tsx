import React from 'react';

const SearchBar: React.FC = () => (
  <input
    className="w-full px-3 py-2 border rounded-md"
    placeholder="Search grants..."
    disabled
  />
);

export default SearchBar;
