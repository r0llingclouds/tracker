import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const HABITS_BASE_DIR = "/Users/tirso.lopez/Library/Mobile Documents/com~apple~CloudDocs/Documents/more";
const HABITS_FILE = path.join(HABITS_BASE_DIR, "habit-tracker.json");

// Middleware
app.use(cors());
app.use(express.json());

// Helper to read data file
const readData = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      // Return null if file doesn't exist - will trigger sample data creation
      return null;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return null;
  }
};

// Helper to write data file
const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
};

// GET /api/data - Read all data
app.get('/api/data', (req, res) => {
  const data = readData();
  if (data === null) {
    // Return empty state to signal frontend should initialize with sample data
    res.json({ tasks: [], projects: [], tags: [], isNew: true });
  } else {
    res.json(data);
  }
});

// POST /api/data - Save all data
app.post('/api/data', (req, res) => {
  const { tasks, projects, tags } = req.body;
  
  if (!Array.isArray(tasks) || !Array.isArray(projects) || !Array.isArray(tags)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  
  const success = writeData({ tasks, projects, tags });
  
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Helper to read habits file
const readHabits = () => {
  try {
    if (!fs.existsSync(HABITS_FILE)) {
      return null;
    }
    const data = fs.readFileSync(HABITS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading habits file:', error);
    return null;
  }
};

// Helper to write habits file
const writeHabits = (data) => {
  try {
    fs.writeFileSync(HABITS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing habits file:', error);
    return false;
  }
};

// GET /api/habits - Read habits data
app.get('/api/habits', (req, res) => {
  const data = readHabits();
  if (data === null) {
    res.json({ isNew: true });
  } else {
    res.json(data);
  }
});

// POST /api/habits - Save habits data
app.post('/api/habits', (req, res) => {
  const doc = req.body;
  
  if (!doc || typeof doc !== 'object') {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  
  const success = writeHabits(doc);
  
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save habits data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
