import { industrySubnavConfig } from '../constants/subnavRegistry';

/**
 * Returns subnav tabs for a given route and industry.
 */
export const getSubnavTabs = (route, industry = 'general') => {
  const config = industrySubnavConfig[industry] || industrySubnavConfig['general'];
  return config[route] || [];
};

/**
 * Optional: Dynamically build the main nav for the sidebar
 */
export const getMainNav = (industry = 'general') => {
  const config = industrySubnavConfig[industry] || industrySubnavConfig['general'];
  return Object.keys(config).map((basePath) => ({
    basePath,
    tabs: config[basePath],
  }));
};