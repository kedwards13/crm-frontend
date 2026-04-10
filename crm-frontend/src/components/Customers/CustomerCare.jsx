import React from 'react';
import WidgetPanel from '../ui/WidgetPanel';

const CustomerCare = () => {
  return (
    <div className='customers-dashboard'>
      <WidgetPanel title='Customer Care' subtitle='Respond to inquiries, manage reviews, and follow-up tasks'>
        <p className='customers-note'>Use follow-up queue recommendations in the right panel to prioritize next actions.</p>
      </WidgetPanel>
    </div>
  );
};

export default CustomerCare;
