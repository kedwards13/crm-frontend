import React from 'react';
import WidgetPanel from '../ui/WidgetPanel';

const CustomerInsights = () => {
  return (
    <div className='customers-dashboard'>
      <WidgetPanel title='Customer Insights' subtitle='Smart suggestions, engagement scores, and churn risk'>
        <p className='customers-note'>Operational AI insights are surfaced in the right control panel based on context.</p>
      </WidgetPanel>
    </div>
  );
};

export default CustomerInsights;
