/**
 * Get date string (YYYY-MM-DD) from ISO timestamp in local timezone
 * @param {string} isoString - ISO date string
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getDateString(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date string in local timezone
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
