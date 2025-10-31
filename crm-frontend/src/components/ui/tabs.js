import React from 'react';
import clsx from 'clsx';

// Container for entire tabs block
export const Tabs = ({ value, onValueChange, children, className = '' }) => {
  return <div className={clsx('w-full', className)}>{children}</div>;
};

// Tab List Header Row
export const TabsList = ({ children, className = '' }) => {
  return (
    <div
      className={clsx(
        'flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-3',
        className
      )}
    >
      {children}
    </div>
  );
};

// Individual Tab Button
export const TabsTrigger = ({ value, current, onClick, children, className = '' }) => {
  const active = value === current;

  return (
    <button
      onClick={() => onClick(value)}
      className={clsx(
        'px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2',
        active
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
        className
      )}
    >
      {children}
    </button>
  );
};

// Content panel below the tab row
export const TabsContent = ({ value, current, children, className = '' }) => {
  return value === current ? (
    <div className={clsx('mt-2', className)}>{children}</div>
  ) : null;
};