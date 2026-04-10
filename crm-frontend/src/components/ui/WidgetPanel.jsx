import React from 'react';
import clsx from 'clsx';
import GlassPanel from './GlassPanel';

export default function WidgetPanel({ className, ...props }) {
  return <GlassPanel className={clsx('ui-widget-panel', className)} {...props} />;
}
