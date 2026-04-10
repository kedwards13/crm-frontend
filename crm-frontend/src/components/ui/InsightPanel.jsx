import React from 'react';
import WidgetPanel from './WidgetPanel';
import './glass-system.css';

export default function InsightPanel({
  title,
  subtitle,
  items = [],
  empty = 'No insights available.',
  renderRight,
  actions,
}) {
  return (
    <WidgetPanel title={title} subtitle={subtitle} actions={actions}>
      {items.length ? (
        <ul className='ui-insight-list'>
          {items.map((item, index) => {
            const key = item.id || item.key || `${title}-${index}`;
            return (
              <li key={key} className='ui-insight-item'>
                <div>
                  <strong>{item.title || item.label}</strong>
                  <span>{item.subtitle || item.meta || ''}</span>
                </div>
                {renderRight ? renderRight(item) : <em>{item.value || ''}</em>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className='ui-insight-empty'>{empty}</p>
      )}
    </WidgetPanel>
  );
}
