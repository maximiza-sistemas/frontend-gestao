import React from 'react';
import Button from './Button';

interface FilterBarProps {
  onClearFilters: () => void;
  children: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = ({ onClearFilters, children }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
        {children}
      </div>
      <button onClick={onClearFilters} className="text-sm text-orange-600 hover:underline">
        Limpar Filtros
      </button>
    </div>
  );
};

export default FilterBar;
