// src/constants/uiRegistry.js

/**
 * UI Registry (single source of truth)
 * - Centralizes labels, nav, subnav, fields, filters, and deep vertical pages per industry
 * - Role-based visibility (items may include roles: ['Admin','Manager'])
 * - Per-tenant overrides via localStorage('ui_overrides'):
 *   {
 *     "all": { ...merge onto all industries... },
 *     "industries": {
 *       "pest_control": { ...merge only this industry... }
 *     }
 *   }
 *
 * PERFORMANCE NOTES:
 * - This file is just metadata; it does not import components.
 * - Keep routes lazy-loaded at the router level so adding pages here doesn’t bloat bundles.
 * - Navigation/TopBar read only the current industry’s slice.
 */

/* ───────────────── Base (defaults for any industry) ───────────────── */

const base = {
    labels: {
      customers: 'Customers',
      leads: 'Leads',
      deals: 'Deals',
      buyers: 'Customers',
      sellers: 'Leads',
    },
  
    // Keep icons limited to what Navigation ICON_MAP already supports
    // (FiHome, FiFileText, FiUsers, FiCalendar, FiPhone, FiTrendingUp, FiBarChart2, FiTag, FiSettings)
    nav: [
      { path: '/dashboard',      label: 'Dashboard',      icon: 'FiHome' },
      { path: '/leads',          label: 'Leads',          icon: 'FiFileText' },
      { path: '/customers',      label: 'Customers',      icon: 'FiUsers' },
      { path: '/schedule',       label: 'Schedule',       icon: 'FiCalendar' },
      { path: '/communication',  label: 'Communications', icon: 'FiPhone' },
      { path: '/marketing',      label: 'Marketing',      icon: 'FiTag' },
      { path: '/finance',        label: 'Finance',        icon: 'FiBarChart2' },
      { path: '/analytics',      label: 'Analytics',      icon: 'FiTrendingUp' },
      { path: '/revival',       label: 'Revival',        icon: 'FiBarChart2' },
      { path: '/operations',    label: 'Operations',     icon: 'FiBarChart2' },
      { path: '/team',           label: 'Team',           icon: 'FiUsers' },
      { path: '/settings',       label: 'Settings',       icon: 'FiSettings' },
    ],
  
    // Subnav per primary route. Use consistent snake_case keys in code.
    subnav: {
      '/dashboard': [
        { key: 'overview',   label: 'Overview',    path: '/dashboard' },
        { key: 'my_tasks',   label: 'My Tasks',    path: '/dashboard/tasks' },
        { key: 'alerts',     label: 'Alerts',      path: '/dashboard/alerts' },
      ],
  
      '/leads': [
        { key: 'new',            label: 'New Leads',      path: '/leads/new' },
        { key: 'contacted',      label: 'Contacted',      path: '/leads/contacted' },
        { key: 'pipeline',       label: 'Pipeline View',  path: '/leads/pipeline' },
        { key: 'under_contract', label: 'Under Contract', path: '/leads/under-contract' },
        { key: 'closed',         label: 'Closed',         path: '/leads/closed' },
        { key: 'disqualified',   label: 'Disqualified',   path: '/leads/disqualified' },
      ],
  
      '/customers': [
        { key: 'list',     label: 'Customers',      path: '/customers/list' },
        { key: 'import',   label: 'Import',         path: '/customers/import', roles: ['Admin','Manager'] },
        { key: 'care',     label: 'Customer Care',  path: '/customers/care' },
        { key: 'insights', label: 'Customer Insights', path: '/customers/ai' },
        { key: 'revival',  label: 'Revival Scans',  path: '/customers/revival' },
      ],
  
      '/schedule': [
        { key: 'dispatch',    label: 'Dispatch',       path: '/schedule/day' },
      ],
  
      '/communication': [
        { key: 'inbox',      label: 'Inbox',        path: '/communication/inbox' },
        { key: 'sms',        label: 'SMS',          path: '/communication/sms' },
        { key: 'calls',      label: 'Calls',        path: '/communication/calls' },
        { key: 'dialer',     label: 'Dialer',       path: '/communication/dialer' },
        { key: 'email',      label: 'Email',        path: '/communication/email' },
      ],
    
      '/revival': [
        { key: 'overview', label: 'Overview', path: '/revival/overview' },
        { key: 'scanner', label: 'Scan Quote', path: '/revival/scanner' },
        { key: 'campaigns', label: 'Campaigns', path: '/revival/campaigns' },
        { key: 'planner', label: 'Planner', path: '/revival/planner' },
        { key: 'history', label: 'History', path: '/revival/history' },
        { key: 'opportunities', label: 'Revenue Opportunities', path: '/revival/ai' }
      ],
  
      '/analytics': [
        { key: 'overview',   label: 'Overview',     path: '/analytics' },
        { key: 'conversion', label: 'Conversion',   path: '/analytics/conversion' },
        { key: 'funnel',     label: 'Funnel',       path: '/analytics/funnel' },
        { key: 'cohorts',    label: 'Cohorts',      path: '/analytics/cohorts' },
        { key: 'revenue',    label: 'Revenue',      path: '/analytics/revenue' },
      ],

      '/operations': [
        { key: 'technicians', label: 'Employees',      path: '/operations/technicians' },
        { key: 'inventory',   label: 'Inventory',        path: '/operations/inventory' },
        { key: 'fleet',       label: 'Fleet',            path: '/operations/fleet' },
        { key: 'training',    label: 'Training',         path: '/operations/training' },
        { key: 'compliance',  label: 'Compliance',       path: '/operations/compliance' },
      ],
  
      '/finance': [
        { key: 'invoices',      label: 'Invoices',       path: '/finance/invoices' },
        { key: 'payments',      label: 'Payments',       path: '/finance/payments' },
        { key: 'subscriptions', label: 'Subscriptions',  path: '/finance/subscriptions' },
        { key: 'pricing',       label: 'Pricing',        path: '/finance/pricing', roles: ['Admin','Manager'] },
        { key: 'billing',       label: 'Billing',        path: '/finance/billing', roles: ['Admin'] },
      ],
  
      '/marketing': [
        { key: 'campaigns',   label: 'Campaigns',    path: '/marketing/campaigns' },
      ],
  
      '/settings': [
        { key: 'smart_config',     label: 'Smart Config',       path: '/settings/smart-config' },
        { key: 'company',          label: 'Company Profile',    path: '/settings/company' },
        { key: 'team',             label: 'Team & Roles',       path: '/settings/team' },
        { key: 'preferences',      label: 'Theme & Preferences', path: '/settings/preferences' },
        { key: 'campaign_safety',  label: 'Campaign Safety',    path: '/settings/campaign-safety' },
        { key: 'branding',         label: 'Branding',           path: '/settings/branding' },
        { key: 'scheduling',       label: 'Scheduling',         path: '/settings/scheduling' },
        { key: 'documents',        label: 'Document Center',    path: '/settings/documents' },
        { key: 'voice_sms',        label: 'Voice & SMS',        path: '/settings/phones' },
        { key: 'integrations',     label: 'Integrations',       path: '/settings/integrations' },
        { key: 'automations',      label: 'Automation Rules',   path: '/settings/automations' },
        { key: 'security',         label: 'Security',           path: '/settings/security' },
        ],

      '/team': [
        { key: 'members', label: 'Team Directory', path: '/team' },
        { key: 'routing', label: 'Call Routing', path: '/settings/team' },
      ],
    },
  
    // Optional data schemas & filters (can be used to render tables/columns/forms)
    fieldSchemas: {
      leads:     ['name','email','phone_number','service','message','created_at'],
      customers: ['name','email','phone','address','notes'],
      invoices:  ['invoice_no','customer','amount','status','due_date','issued_at'],
    },
  
    filters: {
      leads: ['query','service','dateFrom','dateTo','sortBy'],
      customers: ['query','tag','lastSeenFrom','lastSeenTo','sortBy'],
      communication: ['query','channel','assignee','status','dateFrom','dateTo'],
      analytics: ['dateRange','segment','source'],
      finance: ['status','dateFrom','dateTo','min','max'],
      marketing: ['status','owner','channel'],
    },

    scheduling: {
      serviceLabel: 'Service Type',
      staffLabel: 'Assignee',
      locationLabel: 'Location',
      defaultDurationMins: 60,
    },
  
    // Feature flags (can be checked by routes/components to conditionally render)
    features: {
      subscriptions: false,
      operations: false,
    },
  };
  
  /* ───────────────── Industries (overrides/extensions) ───────────────── */
  
  const industries = {
    general: {
      ...base,
    },
  
    wholesaler: {
      labels: {
        customers: 'Cash Buyers',
        leads: 'Sellers',
        deals: 'Deals',
        buyers: 'Cash Buyers',
        sellers: 'Sellers',
      },
      nav: [
        { path: '/dashboard',     label: 'Dashboard',      icon: 'FiTrendingUp' },
        { path: '/leads',         label: 'Leads',          icon: 'FiFileText' },
        { path: '/customers',     label: 'Cash Buyers',    icon: 'FiUsers' },
        { path: '/communication', label: 'Communications', icon: 'FiPhone' },
        { path: '/schedule',      label: 'Schedule',       icon: 'FiCalendar' },
        { path: '/analytics',     label: 'Analytics',      icon: 'FiBarChart2' },
        { path: '/operations',    label: 'Operations',     icon: 'FiBarChart2' },
        { path: '/finance',       label: 'Finance',        icon: 'FiBarChart2' },
        { path: '/marketing',     label: 'Marketing',      icon: 'FiTag' },
        { path: '/settings',      label: 'Settings',       icon: 'FiSettings' },
      ],
      subnav: {
        ...base.subnav,
        '/customers': [
          { key: 'buyers',   label: 'Buyers List',  path: '/customers/list' },
          { key: 'import',   label: 'Upload CSV',   path: '/customers/import', roles: ['Admin','Manager'] },
          { key: 'followup', label: 'Follow-Ups',   path: '/customers/care' },
          { key: 'ai',       label: 'AI Insights',  path: '/customers/ai' },
        ],
        '/leads': [
          { key: 'new',            label: 'Website Leads',   path: '/leads/new' },
          { key: 'pipeline',       label: 'Pipeline View',   path: '/leads/pipeline' },
          { key: 'under_contract', label: 'Under Contract',  path: '/leads/under-contract' },
          { key: 'closed',         label: 'Closed Deals',    path: '/leads/closed' },
          { key: 'dead',           label: 'Disqualified',    path: '/leads/disqualified' },
        ],
      },
      fieldSchemas: {
        leads:     ['name','phone_number','email','property_address','ask_price','motivation','timeline','created_at'],
        customers: ['company','contact','phone','email','buy_box','notes'],
      },
      scheduling: {
        serviceLabel: 'Deal Type',
        staffLabel: 'Acquisition Rep',
        locationLabel: 'Property Address',
        defaultDurationMins: 30,
      },
      features: {
        ...base.features,
        subscriptions: false,
        operations: false,
      },
    },
  
    real_estate: {
      labels: {
        customers: 'Buyers',
        leads: 'Leads',
        deals: 'Transactions',
        buyers: 'Buyers',
        sellers: 'Sellers',
      },
      nav: [
        { path: '/dashboard',     label: 'Insights',        icon: 'FiTrendingUp' },
        { path: '/leads',         label: 'Seller Leads',    icon: 'FiFileText' },
        { path: '/customers',     label: 'Buyers',          icon: 'FiUsers' },
        { path: '/schedule',      label: 'Appointments',    icon: 'FiCalendar' },
        { path: '/communication', label: 'Communications',  icon: 'FiPhone' },
        { path: '/analytics',     label: 'Analytics',       icon: 'FiBarChart2' },
        { path: '/finance',       label: 'Finance',         icon: 'FiBarChart2' },
        { path: '/marketing',     label: 'Marketing',       icon: 'FiTag' },
        { path: '/settings',      label: 'Settings',        icon: 'FiSettings' },
      ],
      subnav: {
        ...base.subnav,
        '/customers': [
          { key: 'buyers',   label: 'Cash Buyers',     path: '/customers/list' },
          { key: 'import',   label: 'Import List',     path: '/customers/import', roles: ['Admin','Manager'] },
          { key: 'offers',   label: 'Offers Made',     path: '/customers/care' },
          { key: 'insights', label: 'Market AI',       path: '/customers/ai' },
        ],
        '/leads': [
          { key: 'inbound',   label: 'Inbound Leads',  path: '/leads/new' },
          { key: 'pipeline',  label: 'Pipeline View',  path: '/leads/pipeline' }, // fixed path
          { key: 'closed',    label: 'Closed Deals',   path: '/leads/closed' },
          { key: 'dead',      label: 'Disqualified',   path: '/leads/disqualified' },
        ],
      },
      fieldSchemas: {
        leads:     ['name','phone_number','email','property_address','motivation','timeline','created_at'],
        customers: ['name','email','phone','criteria','budget','notes'],
      },
      scheduling: {
        serviceLabel: 'Showing Type',
        staffLabel: 'Agent',
        locationLabel: 'Property Address',
        defaultDurationMins: 45,
      },
      features: {
        ...base.features,
        subscriptions: false,
        operations: false,
      },
    },
  
    pest_control: {
      labels: {
        customers: 'Customers',
        leads: 'Inbound Requests',
        deals: 'Service Agreements',
      },
      // Add Operations to nav for pest (use an existing icon for now)
      nav: [
        { path: '/dashboard',     label: 'Dashboard',      icon: 'FiHome' },
        { path: '/leads',         label: 'Leads',          icon: 'FiFileText' },
        { path: '/customers',     label: 'Customers',      icon: 'FiUsers' },
        { path: '/schedule',      label: 'Schedule',       icon: 'FiCalendar' },
        { path: '/communication', label: 'Communications', icon: 'FiPhone' },
        { path: '/analytics',     label: 'Analytics',      icon: 'FiTrendingUp' },
        { path: '/finance',       label: 'Finance',        icon: 'FiBarChart2' },
        { path: '/revival',       label: 'Revival',        icon: 'FiBarChart2' },
        { path: '/marketing',     label: 'Marketing',      icon: 'FiTag' },
        { path: '/sales',         label: 'Sales',          icon: 'FiFileText', roles: ['admin','owner','manager','sales_rep','Admin','Manager','Owner'] },
        { path: '/operations',    label: 'Operations',     icon: 'FiBarChart2' }, // consider adding a truck/wrench icon in ICON_MAP
        { path: '/settings',      label: 'Settings',       icon: 'FiSettings' },
      ],
      subnav: {
        ...base.subnav,

        '/sales': [
          { key: 'd2d',  label: 'D2D Sale',        path: '/sales/d2d' },
          { key: 'sync', label: 'FieldRoutes Sync', path: '/sales/sync', roles: ['admin','owner','manager','Admin','Manager','Owner'] },
        ],

        // Leads stages streamlined for service businesses
        '/leads': [
          { key: 'new',       label: 'New Requests',   path: '/leads/new' },
          { key: 'offered',   label: 'Quoted',         path: '/leads/offered' },
          { key: 'booked',    label: 'Booked',         path: '/leads/booked' },
          { key: 'scheduled', label: 'Scheduled',      path: '/leads/scheduled' },
          { key: 'completed', label: 'Completed',      path: '/leads/completed' },
          { key: 'lost',      label: 'Lost',           path: '/leads/disqualified' },
        ],
  
        '/schedule': [
          { key: 'dispatch', label: 'Dispatch',        path: '/schedule/day' },
        ],
  
        // Deep operations vertical (pest)
        '/operations': [
          { key: 'technicians', label: 'Technicians',      path: '/operations/technicians' },
          { key: 'inventory',   label: 'Inventory',        path: '/operations/inventory' },
          { key: 'fleet',       label: 'Fleet',            path: '/operations/fleet' },
          { key: 'training',    label: 'Training',         path: '/operations/training' },
          { key: 'compliance',  label: 'Compliance',       path: '/operations/compliance' },
        ],

        '/settings': [
            { key: 'smart_config',    label: 'Smart Config',            path: '/settings/smart-config' },
            { key: 'company',         label: 'Company Profile',        path: '/settings/company' },
            { key: 'team',            label: 'Team & Roles',           path: '/settings/team' },
            { key: 'preferences',     label: 'Preferences',            path: '/settings/preferences' },
            { key: 'campaign_safety', label: 'Campaign Safety',        path: '/settings/campaign-safety' },
            { key: 'services',        label: 'Services & Pricing',     path: '/settings/services' },
            { key: 'routing',         label: 'Scheduling & Routing',   path: '/settings/routing' },
            { key: 'inventory',       label: 'Products & Inventory',   path: '/settings/inventory' },
            { key: 'comms',           label: 'Phone/SMS/Email',        path: '/settings/comms' },
            { key: 'automations',     label: 'Automations',            path: '/settings/automations' },
            { key: 'branding',        label: 'Branding',               path: '/settings/branding' },
            { key: 'integrations',    label: 'Integrations',           path: '/settings/integrations' },
            { key: 'security',        label: 'Security',               path: '/settings/security' },
        ],


      },
      fieldSchemas: {
        leads:     ['name','phone_number','email','service','service_address','message','created_at'],
        customers: ['name','email','phone','service_plan','last_service','next_service'],
      },
      scheduling: {
        serviceLabel: 'Service Type',
        staffLabel: 'Technician',
        locationLabel: 'Service Address',
        defaultDurationMins: 90,
      },
      features: {
        ...base.features,
        subscriptions: false,
        operations: true,
      },
    },

    landscaping: {
      labels: {
        customers: 'Customers',
        leads: 'Inbound Requests',
        deals: 'Service Agreements',
      },
      nav: [
        { path: '/dashboard',     label: 'Dashboard',      icon: 'FiHome' },
        { path: '/leads',         label: 'Leads',          icon: 'FiFileText' },
        { path: '/customers',     label: 'Customers',      icon: 'FiUsers' },
        { path: '/schedule',      label: 'Schedule',       icon: 'FiCalendar' },
        { path: '/communication', label: 'Communications', icon: 'FiPhone' },
        { path: '/analytics',     label: 'Analytics',      icon: 'FiTrendingUp' },
        { path: '/finance',       label: 'Finance',        icon: 'FiBarChart2' },
        { path: '/marketing',     label: 'Marketing',      icon: 'FiTag' },
        { path: '/sales',         label: 'Sales',          icon: 'FiFileText', roles: ['admin','owner','manager','sales_rep','Admin','Manager','Owner'] },
        { path: '/operations',    label: 'Operations',     icon: 'FiBarChart2' },
        { path: '/settings',      label: 'Settings',       icon: 'FiSettings' },
      ],
      subnav: {
        ...base.subnav,
        '/sales': [
          { key: 'd2d', label: 'D2D Sale', path: '/sales/d2d' },
        ],
        '/schedule': [
          { key: 'dispatch', label: 'Dispatch',   path: '/schedule/day' },
        ],
        '/operations': [
          { key: 'crews',      label: 'Crews',        path: '/operations/technicians' },
          { key: 'inventory',  label: 'Inventory',    path: '/operations/inventory' },
          { key: 'fleet',      label: 'Fleet',        path: '/operations/fleet' },
          { key: 'training',   label: 'Training',     path: '/operations/training' },
          { key: 'equipment',  label: 'Equipment',    path: '/operations/compliance' },
        ],
      },
      fieldSchemas: {
        leads: ['name','phone_number','email','service','service_address','message','created_at'],
        customers: ['name','email','phone','service_plan','last_service','next_service'],
      },
      scheduling: {
        serviceLabel: 'Service Program',
        staffLabel: 'Crew Lead',
        locationLabel: 'Property Address',
        defaultDurationMins: 120,
      },
      features: {
        ...base.features,
        subscriptions: false,
        operations: true,
      },
    },
  
    fitness: {
      labels: {
        customers: 'Members',
        leads: 'Prospects',
        deals: 'Packages',
      },
      nav: [
        { path: '/dashboard',     label: 'Dashboard',      icon: 'FiHome' },
        { path: '/leads',         label: 'Prospects',      icon: 'FiFileText' },
        { path: '/customers',     label: 'Members',        icon: 'FiUsers' },
        { path: '/schedule',      label: 'Schedule',       icon: 'FiCalendar' },
        { path: '/communication', label: 'Communications', icon: 'FiPhone' },
        { path: '/analytics',     label: 'Analytics',      icon: 'FiTrendingUp' },
        { path: '/finance',       label: 'Finance',        icon: 'FiBarChart2' },
        { path: '/marketing',     label: 'Marketing',      icon: 'FiTag' },
        { path: '/settings',      label: 'Settings',       icon: 'FiSettings' },
      ],
      subnav: {
        ...base.subnav,
        '/leads': [
          { key: 'new',       label: 'New Prospects', path: '/leads/new' },
          { key: 'trial',     label: 'Trials',        path: '/leads/trial' },
          { key: 'booked',    label: 'Booked',        path: '/leads/booked' },
          { key: 'won',       label: 'Won',           path: '/leads/closed' },
          { key: 'lost',      label: 'Lost',          path: '/leads/disqualified' },
        ],
        '/customers': [
          { key: 'list',   label: 'Members',       path: '/customers/list' },
          { key: 'import', label: 'Import',        path: '/customers/import', roles: ['Admin','Manager'] },
          { key: 'care',   label: 'Member Care',   path: '/customers/care' },
          { key: 'ai',     label: 'AI Coach',      path: '/customers/ai' },
        ],
        '/finance': [
          { key: 'subscriptions', label: 'Subscriptions', path: '/finance/subscriptions' },
          { key: 'payments',      label: 'Payments',      path: '/finance/payments' },
          { key: 'invoices',      label: 'Invoices',      path: '/finance/invoices' },
        ],
      },
      fieldSchemas: {
        leads:     ['name','phone_number','email','preferred_time','package_type','instructor_pref','created_at'],
        customers: ['name','email','phone','membership','trainer','renewal_date'],
      },
      scheduling: {
        serviceLabel: 'Session Type',
        staffLabel: 'Trainer',
        locationLabel: 'Studio',
        defaultDurationMins: 60,
      },
      features: {
        ...base.features,
        subscriptions: true,
        operations: false,
      },
    },

    food_wellness: {
      labels: {
        customers: 'Subscribers',
        leads: 'Requests',
        deals: 'Subscriptions',
      },
      nav: [
        { path: '/dashboard',     label: 'Dashboard',      icon: 'FiHome' },
        { path: '/leads',         label: 'Requests',       icon: 'FiFileText' },
        { path: '/customers',     label: 'Subscribers',    icon: 'FiUsers' },
        { path: '/schedule',      label: 'Schedule',       icon: 'FiCalendar' },
        { path: '/communication', label: 'Communications', icon: 'FiPhone' },
        { path: '/analytics',     label: 'Analytics',      icon: 'FiTrendingUp' },
        { path: '/finance',       label: 'Finance',        icon: 'FiBarChart2' },
        { path: '/revival',       label: 'Revival',        icon: 'FiBarChart2' },
        { path: '/operations',    label: 'Operations',     icon: 'FiBarChart2' },
        { path: '/marketing',     label: 'Marketing',      icon: 'FiTag' },
        { path: '/settings',      label: 'Settings',       icon: 'FiSettings' },
      ],
      subnav: {
        ...base.subnav,
        '/leads': [
          { key: 'new',            label: 'New Requests',   path: '/leads/new' },
          { key: 'contacted',      label: 'Contacted',      path: '/leads/contacted' },
          { key: 'pipeline',       label: 'Pipeline View',  path: '/leads/pipeline' },
          { key: 'under_contract', label: 'Under Contract', path: '/leads/under-contract' },
          { key: 'closed',         label: 'Closed',         path: '/leads/closed' },
          { key: 'disqualified',   label: 'Disqualified',   path: '/leads/disqualified' },
        ],
        '/customers': [
          { key: 'list',   label: 'Subscribers',      path: '/customers/list' },
          { key: 'import', label: 'Import',           path: '/customers/import', roles: ['Admin','Manager'] },
          { key: 'care',   label: 'Subscriber Care',  path: '/customers/care' },
          { key: 'ai',     label: 'AI Insights',      path: '/customers/ai' },
          { key: 'revival', label: 'Revival Scans',   path: '/customers/revival' },
        ],
      },
      fieldSchemas: {
        ...base.fieldSchemas,
      },
      scheduling: {
        serviceLabel: 'Plan Type',
        staffLabel: 'Coordinator',
        locationLabel: 'Delivery Area',
        defaultDurationMins: 60,
      },
      features: {
        ...base.features,
        subscriptions: true,
        operations: false,
      },
    },
  
    // Add "auto" industry the same way later if needed (fleet/inventory heavy)
  };
  
  /* ───────────────── Overrides & helpers ───────────────── */
  
  function getActiveTenant() {
    try {
      const raw = localStorage.getItem('activeTenant');
      return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  
  export function getIndustryKey(fallback = 'general') {
    const tenant = getActiveTenant();
    const k = (tenant?.industry || '').toLowerCase();
    return industries[k] ? k : fallback;
  }
  
  function readOverrides() {
    try {
      const raw = localStorage.getItem('ui_overrides');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  
  function deepMerge(a, b) {
    if (!b) return a;
    const out = Array.isArray(a) ? [...a] : { ...a };
    for (const k of Object.keys(b)) {
      if (a && typeof a[k] === 'object' && !Array.isArray(a[k])) {
        out[k] = deepMerge(a[k] || {}, b[k]);
      } else {
        out[k] = b[k];
      }
    }
    return out;
  }
  
  export function getIndustryConfig(industryKey) {
    const baseCfg = industries[industryKey] || industries.general;
    const overrides = readOverrides();
    const all = overrides?.all || {};
    const per = overrides?.industries?.[industryKey] || {};
    return deepMerge(deepMerge(baseCfg, all), per);
  }
  
  export function roleAllows(itemRoles, userRole = 'Member') {
    if (!itemRoles || !itemRoles.length) return true;
    return itemRoles.includes(userRole);
  }
  
  export function filterByRole(items = [], userRole = 'Member') {
    return items.filter(i => roleAllows(i.roles, userRole));
  }
  
  /* ───────── Public API used across app ───────── */
  
  export function getLabels(industryKey, key) {
    const cfg = getIndustryConfig(industryKey);
    return key ? (cfg.labels?.[key] ?? industries.general.labels[key]) : (cfg.labels || industries.general.labels);
  }
  
export function getNavForIndustry(industryKey, userRole = 'Member') {
  const cfg = getIndustryConfig(industryKey);
  const nav = filterByRole(cfg.nav || industries.general.nav, userRole);
  if (!nav.some((item) => item.path === '/team')) {
    nav.splice(Math.max(nav.length - 1, 0), 0, { path: '/team', label: 'Team', icon: 'FiUsers' });
  }
  return nav;
}
  
  export function getSubNavForPage(basePath, industryKey, userRole = 'Member') {
    const cfg = getIndustryConfig(industryKey);
    const sub = cfg.subnav?.[basePath] || industries.general.subnav?.[basePath] || [];
    return filterByRole(sub, userRole);
  }
  
  export function getFieldSchema(section, industryKey) {
    const cfg = getIndustryConfig(industryKey);
    return cfg.fieldSchemas?.[section] || industries.general.fieldSchemas?.[section] || [];
  }
  
  export function getFiltersFor(section, industryKey) {
    const cfg = getIndustryConfig(industryKey);
    return cfg.filters?.[section] || industries.general.filters?.[section] || [];
  }

  export function getSchedulingConfig(industryKey) {
    const cfg = getIndustryConfig(industryKey);
    return cfg.scheduling || industries.general.scheduling || {};
  }

export function getFeatures(industryKey) {
  const cfg = getIndustryConfig(industryKey);
  return cfg.features || industries.general.features || {};
}

/* ───────── Lightweight UI registry for industry labels/panels ───────── */
export const uiRegistry = {
  landscaping: {
    primaryEntity: 'Job',
    pipelineStages: ['Scheduled', 'In Progress', 'Completed', 'Invoiced'],
    customerPanels: ['Active Jobs', 'Service Schedule', 'Outstanding Balance'],
  },
  general: {
    primaryEntity: 'Job',
    pipelineStages: ['New', 'In Progress', 'Completed', 'Invoiced'],
    customerPanels: ['Active Jobs', 'Upcoming Work', 'Billing'],
  },
};

export function getUiRegistry(industryKey = 'general') {
  const key = industryKey?.toLowerCase();
  return uiRegistry[key] || uiRegistry.landscaping;
}
