import React from 'react';
import clsx from 'clsx';
import './glass-system.css';

export default function StatCard({ label, value, meta, icon, className, loading = false, ...rest }) {
  return (
    <article className={clsx('ui-stat-card', className)} {...rest}>
      <div>
        <p>{label}</p>
        <strong>{loading ? '...' : value}</strong>
        {meta ? <span>{meta}</span> : null}
      </div>
      {icon ? <span className='ui-stat-icon'>{icon}</span> : null}
    </article>
  );
}
