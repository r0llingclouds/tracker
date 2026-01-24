import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import cron from 'node-cron';

// Route modules
import tasksRouter from './routes/tasks.js';
import foodRouter from './routes/food.js';
import workoutsRouter from './routes/workouts.js';

// Backup utilities
import { createBackup, getBackupStatus, hasBackupForToday } from './utils/backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Base data directory - use TRACKER_DATA_DIR from env or default to server/data/
const DATA_DIR = process.env.TRACKER_DATA_DIR || path.join(__dirname, 'data');

// Backup configuration
const BACKUP_DIR = process.env.BACKUP_DIR || null;
const BACKUP_HOUR = parseInt(process.env.BACKUP_HOUR, 10) || 2; // Default: 2:00 AM

// Tracker subdirectories
const TRACKER_SUBDIRS = ['food', 'habits', 'tasks', 'workout', 'images'];

// Ensure data directory and all subdirectories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
for (const subdir of TRACKER_SUBDIRS) {
  const subdirPath = path.join(DATA_DIR, subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
  }
}

// Serve static images from the data/images directory
app.use('/api/images', express.static(path.join(DATA_DIR, 'images')));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for image uploads

// Mount routes
app.use('/api', tasksRouter);
app.use('/api', foodRouter);
app.use('/api', workoutsRouter);

// ============ BACKUP API ============

// GET /api/backup/status - Get backup status and list
app.get('/api/backup/status', (req, res) => {
  const status = getBackupStatus(BACKUP_DIR);
  res.json(status);
});

// POST /api/backup - Trigger manual backup
app.post('/api/backup', (req, res) => {
  if (!BACKUP_DIR) {
    return res.status(503).json({ error: 'Backups not configured - BACKUP_DIR not set' });
  }
  
  const result = createBackup(DATA_DIR, BACKUP_DIR);
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: `Backup created: ${result.backupName}`,
      backupPath: result.backupPath
    });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// ============ SCHEDULED BACKUP ============

function runScheduledBackup() {
  if (!BACKUP_DIR) {
    return;
  }
  
  console.log('Running scheduled backup...');
  const result = createBackup(DATA_DIR, BACKUP_DIR);
  
  if (result.success) {
    console.log(`Scheduled backup completed: ${result.backupName}`);
  } else {
    console.error(`Scheduled backup failed: ${result.error}`);
  }
}

// Schedule daily backup at configured hour (default: 2:00 AM)
if (BACKUP_DIR) {
  cron.schedule(`0 ${BACKUP_HOUR} * * *`, () => {
    runScheduledBackup();
  });
  console.log(`Backup scheduled daily at ${BACKUP_HOUR}:00`);
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  
  // Log backup configuration
  if (BACKUP_DIR) {
    console.log(`Backup directory: ${BACKUP_DIR}`);
    
    // Check if we need to run a startup backup (no backup today)
    if (!hasBackupForToday(BACKUP_DIR)) {
      console.log('No backup found for today, creating one...');
      runScheduledBackup();
    }
  } else {
    console.log('Backups disabled (BACKUP_DIR not set)');
  }
});
