import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, buttonLabel, onButtonClick, action }) => {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {buttonLabel && onButtonClick && (
            <button
              onClick={onButtonClick}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              <span>{buttonLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
