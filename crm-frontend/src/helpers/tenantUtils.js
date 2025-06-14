export const getActiveTenantIndustry = () => {
    try {
      const tenant = JSON.parse(localStorage.getItem('activeTenant'));
      return tenant?.industry?.toLowerCase() || 'general';
    } catch (e) {
      return 'general';
    }
  };