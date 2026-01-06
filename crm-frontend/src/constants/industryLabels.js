// src/constants/industryLabels.js
import { getIndustryKey, getLabels } from './uiRegistry';

/**
 * Back-compat export for places that import a plain object.
 * We resolve it once at module load to avoid breaking old code.
 * Prefer calling getLabel() below for dynamic access.
 */
const key = getIndustryKey('general');
export const industryLabels = {
  general: getLabels('general'),
  wholesaling: getLabels('wholesaler'),     // keep your legacy name mapped
  real_estate: getLabels('real_estate'),
  pest_control: getLabels('pest_control'),
  fitness: getLabels('fitness'),
  food_wellness: getLabels('food_wellness'),
};

/** Preferred helper for dynamic lookups */
export function getLabel(labelKey, fallback) {
  const k = getIndustryKey('general');
  const value = getLabels(k, labelKey);
  return value ?? fallback ?? labelKey;
}
