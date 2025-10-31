import React from 'react';
import clsx from 'clsx';

const badgeColors = {
  gray: 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  blue: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-800/20 dark:text-blue-300 dark:border-blue-500/40',
  emerald: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-800/20 dark:text-green-300 dark:border-green-500/40',
  yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500/40',
  red: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-800/20 dark:text-red-300 dark:border-red-500/40',
  purple: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-800/20 dark:text-purple-300 dark:border-purple-500/40',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium shadow-sm transition-colors duration-150',
        badgeColors[color] || badgeColors.gray,
        className
      )}
    >
      {children}
    </span>
  );
}