import { normalizeIndustry } from "../helpers/tenantHelpers";

export const industryCopy = {
  general: {
    customers: "Customers",
    customer: "Customer",
    leads: "Leads",
    lead: "Lead",
    pipelineTitle: "Deals Pipeline",
    webLeadTitle: "New Requests",
    leadsEmpty: "No leads match your filters.",
    searchPlaceholder: "Search customers, leads, tasks...",
  },
  pest_control: {
    customers: "Customers",
    customer: "Customer",
    leads: "Requests",
    lead: "Request",
    pipelineTitle: "Service Pipeline",
    webLeadTitle: "New Requests",
    leadsEmpty: "No requests match your filters.",
    searchPlaceholder: "Search customers, requests, tasks...",
  },
  fitness: {
    customers: "Members",
    customer: "Member",
    leads: "Prospects",
    lead: "Prospect",
    pipelineTitle: "Membership Pipeline",
    webLeadTitle: "New Prospects",
    leadsEmpty: "No prospects match your filters.",
    searchPlaceholder: "Search members, prospects, tasks...",
  },
  food_wellness: {
    customers: "Subscribers",
    customer: "Subscriber",
    leads: "Requests",
    lead: "Request",
    pipelineTitle: "Subscription Pipeline",
    webLeadTitle: "New Requests",
    leadsEmpty: "No requests match your filters.",
    searchPlaceholder: "Search subscribers, requests, tasks...",
  },
  real_estate: {
    customers: "Buyers",
    customer: "Buyer",
    leads: "Leads",
    lead: "Lead",
    pipelineTitle: "Deals Pipeline",
    webLeadTitle: "New Leads",
    leadsEmpty: "No leads match your filters.",
    searchPlaceholder: "Search buyers, leads, tasks...",
  },
  wholesaler: {
    customers: "Cash Buyers",
    customer: "Cash Buyer",
    leads: "Sellers",
    lead: "Seller",
    pipelineTitle: "Deals Pipeline",
    webLeadTitle: "New Sellers",
    leadsEmpty: "No sellers match your filters.",
    searchPlaceholder: "Search cash buyers, sellers, tasks...",
  },
  auto: {
    customers: "Customers",
    customer: "Customer",
    leads: "Leads",
    lead: "Lead",
    pipelineTitle: "Shop Pipeline",
    webLeadTitle: "New Requests",
    leadsEmpty: "No leads match your filters.",
    searchPlaceholder: "Search customers, leads, tasks...",
  },
};

export const getIndustryCopy = (industryKey = "general") => {
  const key = normalizeIndustry(industryKey);
  return industryCopy[key] || industryCopy.general;
};
