import fs from 'fs';
import path from 'path';

const MAX_BACKUPS = 5;
const TRACKER_SUBDIRS = ['food', 'habits', 'workout', 'images'];

/**
 * Generate a timestamp string for backup folder names
 * Format: YYYY-MM-DD_HH-MM-SS
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Copy a directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Delete a directory recursively
 * @param {string} dirPath - Directory to delete
 */
function deleteDirSync(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * List all backup folders in the backup directory
 * @param {string} backupDir - Backup directory path
 * @returns {Array<{name: string, date: string, path: string}>} List of backups sorted by date (newest first)
 */
export function listBackups(backupDir) {
  if (!backupDir || !fs.existsSync(backupDir)) {
    return [];
  }
  
  const entries = fs.readdirSync(backupDir, { withFileTypes: true });
  
  const backups = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map(entry => {
      const name = entry.name;
      // Extract date from folder name: backup-YYYY-MM-DD_HH-MM-SS
      const dateMatch = name.match(/^backup-(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})$/);
      const date = dateMatch ? `${dateMatch[1]} ${dateMatch[2].replace(/-/g, ':')}` : name;
      return {
        name,
        date,
        path: path.join(backupDir, name)
      };
    })
    .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name descending (newest first)
  
  return backups;
}

/**
 * Check if a backup exists for today
 * @param {string} backupDir - Backup directory path
 * @returns {boolean} True if a backup exists for today
 */
export function hasBackupForToday(backupDir) {
  const backups = listBackups(backupDir);
  const today = getTodayDate();
  return backups.some(b => b.name.startsWith(`backup-${today}`));
}

/**
 * Clean old backups, keeping only the most recent ones
 * @param {string} backupDir - Backup directory path
 * @param {number} maxBackups - Maximum number of backups to keep
 * @returns {number} Number of backups deleted
 */
export function cleanOldBackups(backupDir, maxBackups = MAX_BACKUPS) {
  const backups = listBackups(backupDir);
  
  if (backups.length <= maxBackups) {
    return 0;
  }
  
  // Backups are sorted newest first, so remove from the end
  const toDelete = backups.slice(maxBackups);
  let deleted = 0;
  
  for (const backup of toDelete) {
    try {
      deleteDirSync(backup.path);
      console.log(`Deleted old backup: ${backup.name}`);
      deleted++;
    } catch (error) {
      console.error(`Failed to delete backup ${backup.name}:`, error);
    }
  }
  
  return deleted;
}

/**
 * Create a backup of all tracker data
 * @param {string} dataDir - Source data directory (TRACKER_DATA_DIR)
 * @param {string} backupDir - Destination backup directory (BACKUP_DIR)
 * @returns {{success: boolean, backupPath?: string, error?: string}} Result object
 */
export function createBackup(dataDir, backupDir) {
  if (!backupDir) {
    return { success: false, error: 'BACKUP_DIR not configured' };
  }
  
  if (!dataDir) {
    return { success: false, error: 'TRACKER_DATA_DIR not configured' };
  }
  
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create timestamped backup folder
    const timestamp = getTimestamp();
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupName);
    
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Copy each tracker subdirectory
    let copiedDirs = 0;
    for (const subdir of TRACKER_SUBDIRS) {
      const srcPath = path.join(dataDir, subdir);
      const destPath = path.join(backupPath, subdir);
      
      if (fs.existsSync(srcPath)) {
        copyDirSync(srcPath, destPath);
        copiedDirs++;
      }
    }
    
    if (copiedDirs === 0) {
      // Clean up empty backup folder
      deleteDirSync(backupPath);
      return { success: false, error: 'No data directories found to backup' };
    }
    
    console.log(`Backup created: ${backupName} (${copiedDirs} directories)`);
    
    // Clean old backups
    const deleted = cleanOldBackups(backupDir, MAX_BACKUPS);
    if (deleted > 0) {
      console.log(`Cleaned ${deleted} old backup(s)`);
    }
    
    return { success: true, backupPath, backupName };
  } catch (error) {
    console.error('Backup failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get backup status information
 * @param {string} backupDir - Backup directory path
 * @returns {{enabled: boolean, backups: Array, hasBackupToday: boolean}} Status object
 */
export function getBackupStatus(backupDir) {
  const enabled = Boolean(backupDir);
  const backups = listBackups(backupDir);
  const hasBackupToday = hasBackupForToday(backupDir);
  
  return {
    enabled,
    backupDir: backupDir || null,
    backups: backups.map(b => ({ name: b.name, date: b.date })),
    count: backups.length,
    maxBackups: MAX_BACKUPS,
    hasBackupToday
  };
}
