import React from 'react';
import clsx from 'clsx';
import './glass-system.css';

export default function GlassPanel({
  as: Component = 'section',
  className,
  padded = true,
  title,
  subtitle,
  actions,
  children,
  ...rest
}) {
  return (
    <Component className={clsx('ui-glass-panel', padded && 'is-padded', className)} {...rest}>
      {title || subtitle || actions ? (
        <header className='ui-panel-head'>
          <div>
            {title ? <h3 className='ui-panel-title'>{title}</h3> : null}
            {subtitle ? <p className='ui-panel-subtitle'>{subtitle}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </Component>
  );
}
