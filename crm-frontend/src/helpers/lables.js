import { industryLabels } from '../constants/industryLabels';

export const getLabel = (key, industry = 'general') => {
  const group = industryLabels[industry] || industryLabels['general'];
  return group[key] || key;
};