import React from 'react';
import clsx from 'clsx';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  icon = null,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-sm hover:opacity-90',
    outline:
      'bg-transparent border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800',
    ghost:
      'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    subtle:
      'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && (
        <span className="loader mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      )}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};