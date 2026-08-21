/**
 * Standardized US Dollar Currency Formatter
 * Formats numbers into US locale currency string ($X,XXX.XX)
 * Safely handles null, undefined, and non-numeric values.
 */
export const formatToUSD = (value, fallback = '$0.00') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

export const formatCurrencyOrDash = (value) => {
  if (value === null || value === undefined || value === '' || Number(value) === 0) {
    return '-';
  }
  return formatToUSD(value, '-');
};
