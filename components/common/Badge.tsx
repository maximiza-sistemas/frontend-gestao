import React from 'react';
import { BadgeVariant } from '../../types';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  neutral: 'bg-gray-100 text-gray-800',
  admin: 'bg-red-200 text-red-900',
  manager: 'bg-blue-200 text-blue-900',
  seller: 'bg-green-200 text-green-900',
};

const Badge: React.FC<BadgeProps> = ({ variant, children }) => {
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badgeStyles[variant]}`}>
      {children}
    </span>
  );
};

export default Badge;
