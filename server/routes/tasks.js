import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJSON, writeJSON } from '../utils/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Data file path (use env variable if set, otherwise default to server/data/)
const DATA_FILE = process.env.TASKS_DATA_FILE 
  || path.join(__dirname, '..', 'data', 'tasks.json');

// GET /api/data - Read all task data
router.get('/data', (req, res) => {
  const data = readJSON(DATA_FILE, null);
  if (data === null) {
    // Return empty state to signal frontend should initialize with sample data
    res.json({ tasks: [], projects: [], areas: [], tags: [], isNew: true });
  } else {
    res.json(data);
  }
});

// POST /api/data - Save all task data
router.post('/data', (req, res) => {
  const { tasks, projects, areas, tags } = req.body;
  
  if (!Array.isArray(tasks) || !Array.isArray(projects) || !Array.isArray(tags) || !Array.isArray(areas)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  
  const success = writeJSON(DATA_FILE, { tasks, projects, areas, tags });
  
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

export default router;
