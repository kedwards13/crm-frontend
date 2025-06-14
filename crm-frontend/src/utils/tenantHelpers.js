export const getIndustry = () => {
    try {
      const tenant = JSON.parse(localStorage.getItem('activeTenant'));
      return tenant?.industry?.toLowerCase() || 'general';
    } catch {
      return 'general';
    }
  };