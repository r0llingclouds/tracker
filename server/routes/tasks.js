import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJSON, writeJSON } from '../utils/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Data file path (use TRACKER_DATA_DIR/tasks/ or default to server/data/tasks/)
const DATA_DIR = process.env.TRACKER_DATA_DIR 
  ? path.join(process.env.TRACKER_DATA_DIR, 'tasks')
  : path.join(__dirname, '..', 'data', 'tasks');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// GET /api/data - Read all task data
router.get('/data', (req, res) => {
  const data = readJSON(DATA_FILE, null);
  if (data === null) {
    // Return empty state to signal frontend should initialize with sample data
    res.json({ 
      tasks: [], 
      projects: [], 
      areas: [], 
      tags: [], 
      userProgress: { totalXp: 0, level: 1, xpHistory: [] },
      isNew: true 
    });
  } else {
    // Ensure userProgress exists (migration for existing data)
    if (!data.userProgress) {
      data.userProgress = { totalXp: 0, level: 1, xpHistory: [] };
    }
    res.json(data);
  }
});

// POST /api/data - Save all task data
router.post('/data', (req, res) => {
  const { tasks, projects, areas, tags, userProgress } = req.body;
  
  if (!Array.isArray(tasks) || !Array.isArray(projects) || !Array.isArray(tags) || !Array.isArray(areas)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  
  // Default userProgress if not provided
  const progress = userProgress || { totalXp: 0, level: 1, xpHistory: [] };
  
  const success = writeJSON(DATA_FILE, { tasks, projects, areas, tags, userProgress: progress });
  
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

export default router;
