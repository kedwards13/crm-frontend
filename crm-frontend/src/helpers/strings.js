export const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };
  
  export const capitalize = (word = '') =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();