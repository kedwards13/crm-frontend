import React from 'react';
import clsx from 'clsx';
import './glass-system.css';

export default function WidgetGrid({ columns = 4, className, style, children }) {
  return (
    <div
      className={clsx('ui-widget-grid', className)}
      style={{
        '--widget-columns': columns,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
