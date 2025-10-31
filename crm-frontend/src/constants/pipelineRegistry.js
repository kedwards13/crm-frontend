// Single source of truth for Pipeline per industry.
// Each industry defines:
// - stages: ordered array of { key, label }
// - displayedFields: which fields to surface on cards (in order)
// - valueField: which numeric field to treat like "deal value" (optional)
// - emptyCopy: message when no leads are in a stage

export const pipelineRegistry = {
    // ----- Default fallback -----
    general: {
      stages: [
        { key: 'new',            label: 'New' },
        { key: 'qualified',      label: 'Qualified' },
        { key: 'offered',        label: 'Offer Sent' },
        { key: 'under_contract', label: 'In Progress' },
        { key: 'closed',         label: 'Closed' },
        { key: 'dead',           label: 'Disqualified' },
      ],
      displayedFields: ['source', 'email', 'phone_number', 'message'],
      valueField: 'estimated_price',
      emptyCopy: 'No leads in this stage.',
    },
  
    // ----- Real Estate (agent/investor) -----
    real_estate: {
      stages: [
        { key: 'new',            label: 'New Leads' },
        { key: 'qualified',      label: 'Qualified' },
        { key: 'offered',        label: 'Offer Sent' },
        { key: 'under_contract', label: 'Under Contract' },
        { key: 'closed',         label: 'Closed Deals' },
        { key: 'dead',           label: 'Disqualified' },
      ],
      displayedFields: ['address', 'beds', 'baths', 'source', 'email', 'phone_number'],
      valueField: 'estimated_price',
      emptyCopy: 'No properties currently in this stage.',
    },
  
    // Alias for wholesaler if you use that industry name
    wholesaler: {
      stages: [
        { key: 'new',            label: 'New Leads' },
        { key: 'qualified',      label: 'Qualified' },
        { key: 'offered',        label: 'Offer Sent' },
        { key: 'under_contract', label: 'Under Contract' },
        { key: 'closed',         label: 'Closed Deals' },
        { key: 'dead',           label: 'Disqualified' },
      ],
      displayedFields: ['address', 'arv', 'source', 'email', 'phone_number'],
      valueField: 'estimated_price',
      emptyCopy: 'No deals here yet.',
    },
  
    // ----- Pest Control (streamlined, appointment-centric) -----
    pest_control: {
      stages: [
        { key: 'new',       label: 'New' },
        { key: 'offered',   label: 'Quoted' },
        { key: 'booked',    label: 'Booked' },
        { key: 'completed', label: 'Completed' },
        { key: 'follow_up', label: 'Follow-Up' },
        { key: 'dead',      label: 'Lost' },
      ],
      displayedFields: ['service', 'preferred_time', 'address', 'email', 'phone_number', 'message'],
      valueField: 'quoted_amount',
      emptyCopy: 'No service requests in this stage.',
    },
  
    // ----- Fitness (trial/intro -> membership) -----
    fitness: {
      stages: [
        { key: 'new',        label: 'New' },
        { key: 'trial',      label: 'Trial Booked' },
        { key: 'attended',   label: 'Trial Attended' },
        { key: 'member',     label: 'Member' },
        { key: 'churn',      label: 'Churn Risk' },
        { key: 'dead',       label: 'Lost' },
      ],
      displayedFields: ['interest', 'preferred_time', 'email', 'phone_number', 'notes'],
      valueField: 'membership_value',
      emptyCopy: 'No prospects in this stage.',
    },
  
    // ----- Auto Services (quote -> appointment -> done) -----
    auto: {
      stages: [
        { key: 'new',        label: 'New' },
        { key: 'quoted',     label: 'Quoted' },
        { key: 'scheduled',  label: 'Scheduled' },
        { key: 'in_shop',    label: 'In Shop' },
        { key: 'completed',  label: 'Completed' },
        { key: 'dead',       label: 'Lost' },
      ],
      displayedFields: ['vehicle', 'service', 'preferred_time', 'email', 'phone_number', 'notes'],
      valueField: 'estimate_total',
      emptyCopy: 'No vehicles in this stage.',
    },
  };
  
  // Helper to safely resolve a config
  export const getPipelineConfig = (industry) =>
    pipelineRegistry[industry] || pipelineRegistry.general;