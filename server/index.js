import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Route modules
import tasksRouter from './routes/tasks.js';
import foodRouter from './routes/food.js';
import workoutsRouter from './routes/workouts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Base data directory - use TRACKER_DATA_DIR from env or default to server/data/
const DATA_DIR = process.env.TRACKER_DATA_DIR || path.join(__dirname, 'data');

// Tracker subdirectories
const TRACKER_SUBDIRS = ['food', 'habits', 'tasks', 'workout'];

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

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api', tasksRouter);
app.use('/api', foodRouter);
app.use('/api', workoutsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
