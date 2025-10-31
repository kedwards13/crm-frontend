export function formatCurrency(amount) {
    if (!amount) return '$0.00';
    return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }