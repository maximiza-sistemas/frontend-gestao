import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  children: React.ReactNode;
  icon?: string;
}

const Button: React.FC<ButtonProps> = ({ variant = 'secondary', children, icon, ...props }) => {
  const baseClasses = "px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center font-semibold";
  
  const variantClasses = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`} {...props}>
      {icon && <i className={`${icon} mr-2`}></i>}
      {children}
    </button>
  );
};

export default Button;
