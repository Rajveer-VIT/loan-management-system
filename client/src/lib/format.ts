/**
 * Formats a numeric value into Indian Rupee currency format (e.g., ₹1,50,000.00).
 */
export function formatCurrency(amount: number = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a ISO date string into readable Indian date format (DD/MM/YYYY or 10 Oct 2026).
 */
export function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats file size in bytes to readable string (e.g. 2.4 MB).
 */
export function formatFileSize(bytes: number = 0): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
