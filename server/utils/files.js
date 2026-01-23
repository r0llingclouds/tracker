import fs from 'fs';

/**
 * Read and parse a JSON file
 * @param {string} filepath - Path to the JSON file
 * @param {object} defaultValue - Default value if file doesn't exist
 * @returns {object} Parsed JSON data
 */
export function readJSON(filepath, defaultValue = { nextId: 1, items: [] }) {
  try {
    if (!fs.existsSync(filepath)) {
      return defaultValue;
    }
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filepath}:`, error);
    return defaultValue;
  }
}

/**
 * Write data to a JSON file
 * @param {string} filepath - Path to the JSON file
 * @param {object} data - Data to write
 * @returns {boolean} Success status
 */
export function writeJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filepath}:`, error);
    return false;
  }
}
