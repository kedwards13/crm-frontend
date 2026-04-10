import React from 'react';
import clsx from 'clsx';
import './glass-system.css';

export default function ActionButton({
  as: Component = 'button',
  variant = 'secondary',
  size = 'md',
  className,
  type,
  children,
  ...rest
}) {
  const componentProps =
    Component === 'button'
      ? {
          type: type || 'button',
          ...rest,
        }
      : rest;

  return (
    <Component className={clsx('ui-action-btn', `is-${variant}`, `is-${size}`, className)} {...componentProps}>
      {children}
    </Component>
  );
}
