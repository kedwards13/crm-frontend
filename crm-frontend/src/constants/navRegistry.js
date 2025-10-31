// src/constants/navRegistry.js
import {
  getIndustryKey,
  getNavForIndustry,
  getSubNavForPage as _getSubNavForPage,
} from './uiRegistry';

/**
 * Back-compat exports for existing imports.
 * navRegistry: resolve a static snapshot for all industries.
 * Prefer using getNavForCurrentIndustry() / getSubNavForPage().
 */

export const navRegistry = {
  general: getNavForIndustry('general'),
  wholesaler: getNavForIndustry('wholesaler'),
  pest_control: getNavForIndustry('pest_control'),
  real_estate: getNavForIndustry('real_estate'),
  fitness: getNavForIndustry('fitness'),
};

/** Prefer this in new code */
export function getNavForCurrentIndustry(userRole = 'Member') {
  const industry = getIndustryKey('general');
  return getNavForIndustry(industry, userRole);
}

/** Subnav back-compat structure (snapshot). */
export const industrySubnavConfig = {
  // We keep keys you already referenced; they’ll be resolved on demand anyway.
  general: {},
  real_estate: {},
  wholesaler: {},
  pest_control: {},
  fitness: {},
};

/** Preferred helper used by Layout/TopBar */
export const getSubNavForPage = (basePath, industry = null, userRole = 'Member') => {
  const key = industry || getIndustryKey('general');
  return _getSubNavForPage(basePath, key, userRole);
};