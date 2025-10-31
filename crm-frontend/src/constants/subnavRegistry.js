export const industrySubnavConfig = {
  // ───────── General Defaults ─────────
  general: {
    '/customers': [
      { key: 'list', label: 'Customers', path: '/customers/list' },
      { key: 'import', label: 'Import', path: '/customers/import' },
      { key: 'care', label: 'Customer Care', path: '/customers/care' },
      { key: 'revival',  label: 'Revival Scans',  path: '/customers/revival' },
      { key: 'ai', label: 'AI Insights', path: '/customers/ai' },
    ],
    '/leads': [
      { key: 'new', label: 'New Leads', path: '/leads/new' },
      { key: 'contacted', label: 'Contacted', path: '/leads/contacted' },
      { key: 'under-contract', label: 'Under Contract', path: '/leads/under-contract' },
      { key: 'closed', label: 'Closed', path: '/leads/closed' },
      { key: 'disqualified', label: 'Disqualified', path: '/leads/disqualified' }
    ],
    '/schedule': [
      { key: 'calendar', label: 'Calendar View', path: '/schedule/calendar' },
      { key: 'routing', label: 'Route Planner', path: '/schedule/routing' },
      { key: 'unscheduled', label: 'Unscheduled Jobs', path: '/schedule/unscheduled' }
    ],
    '/revival': [
      { key: 'overview', label: 'Overview', path: '/revival/overview' },
      { key: 'campaigns', label: 'Campaigns', path: '/revival/campaigns' },
      { key: 'planner', label: 'Planner', path: '/revival/planner' },
      { key: 'history', label: 'History', path: '/revival/history' },
      { key: 'ai', label: 'AI Insights', path: '/revival/ai' }
    ],
    '/settings': [
      { key: 'team', label: 'Team', path: '/settings/team' },
      { key: 'preferences', label: 'Preferences', path: '/settings/preferences' },
      { key: 'branding', label: 'Branding', path: '/settings/branding' }
    ]
  },

  // 🏠 Real Estate Investor CRM
  real_estate: {
    '/customers': [
      { key: 'buyers', label: 'Cash Buyers', path: '/customers/list' },
      { key: 'import', label: 'Import List', path: '/customers/import' },
      { key: 'offers', label: 'Offers Made', path: '/customers/care' },
      { key: 'insights', label: 'Market AI', path: '/customers/ai' }
    ],
    '/leads': [
      { key: 'inbound', label: 'Inbound Leads', path: '/leads/new' },
      { key: 'pipeline', label: 'Pipeline View', path: '/leads/contacted' },
      { key: 'deals', label: 'Closed Deals', path: '/leads/closed' }
    ],
    '/schedule': [
      { key: 'calendar', label: 'Showings', path: '/schedule/calendar' },
      { key: 'offers', label: 'Offer Deadlines', path: '/schedule/offers' }
    ],
    '/settings': [
      { key: 'team', label: 'Agents & Roles', path: '/settings/team' },
      { key: 'branding', label: 'Branding', path: '/settings/branding' },
      { key: 'preferences', label: 'Preferences', path: '/settings/preferences' }
    ]
  },

  // 💰 Wholesaling OS
  wholesaler: {
    '/customers': [
      { key: 'buyers', label: 'Buyers List', path: '/customers/list' },
      { key: 'import', label: 'Upload CSV', path: '/customers/import' },
      { key: 'followup', label: 'Follow-Ups', path: '/customers/care' },
      { key: 'ai', label: 'AI Insights', path: '/customers/ai' }
    ],
    '/leads': [
      { key: 'tian', label: 'Website Leads', path: '/leads/new' },
      { key: 'pipeline', label: 'Pipeline View', path: '/leads/pipeline' },
      { key: 'under_contract', label: 'Under Contract', path: '/leads/under-contract' },
      { key: 'closed', label: 'Closed Deals', path: '/leads/closed' }
    ],
    '/deals': [
      { key: 'active', label: 'Active Deals', path: '/deals/active' },
      { key: 'under_review', label: 'Review Offers', path: '/deals/review' },
      { key: 'ai', label: 'AI Deal Analysis', path: '/deals/ai' }
    ],
    '/marketing': [
      { key: 'campaigns', label: 'Campaigns', path: '/marketing/campaigns' },
      { key: 'texts', label: 'Text Blasts', path: '/marketing/texts' },
      { key: 'ai', label: 'AI Writer', path: '/marketing/ai' }
    ],
    '/settings': [
      { key: 'team', label: 'Team Members', path: '/settings/team' },
      { key: 'branding', label: 'Branding & Logos', path: '/settings/branding' },
      { key: 'preferences', label: 'Workflow Rules', path: '/settings/preferences' }
    ]
  },

  // 🐜 Pest Control SaaS
  pest_control: {
    '/customers': [
      { key: 'list', label: 'All Clients', path: '/customers/list' },
      { key: 'import', label: 'Import CSV', path: '/customers/import' },
      { key: 'care', label: 'Care & Follow-Up', path: '/customers/care' },
      { key: 'ai', label: 'AI Assistant', path: '/customers/ai' }
    ],
    '/schedule': [
      { key: 'map', label: 'Map View', path: '/schedule/map' },
      { key: 'routes', label: 'Monthly Routes', path: '/schedule/routes' },
      { key: 'pool', label: 'Job Pool', path: '/schedule/pool' }
    ],
    '/settings': [
      { key: 'technicians', label: 'Technicians', path: '/settings/team' },
      { key: 'routing', label: 'Routing Rules', path: '/settings/preferences' },
      { key: 'logo', label: 'Company Logo', path: '/settings/branding' }
    ]
  }
};

export const getSubNavForPage = (basePath, industry = 'general') => {
  const config = industrySubnavConfig[industry] || industrySubnavConfig['general'];
  return config[basePath] || [];
};