import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { readJSON, writeJSON } from '../utils/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Data file path (use TRACKER_DATA_DIR/tasks/ or default to server/data/tasks/)
const BASE_DATA_DIR = process.env.TRACKER_DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_DIR = path.join(BASE_DATA_DIR, 'tasks');
const IMAGES_DIR = path.join(BASE_DATA_DIR, 'images');
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

// POST /api/upload-image - Upload a boss card image
router.post('/upload-image', (req, res) => {
  const { image, projectId } = req.body;
  
  if (!image || !projectId) {
    return res.status(400).json({ error: 'Missing image or projectId' });
  }
  
  // Extract base64 data and mime type
  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid image format' });
  }
  
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const base64Data = matches[2];
  const filename = `boss-${projectId}.${ext}`;
  const filepath = path.join(IMAGES_DIR, filename);
  
  try {
    // Delete any existing boss image for this project (different extension)
    const existingFiles = fs.readdirSync(IMAGES_DIR);
    for (const file of existingFiles) {
      if (file.startsWith(`boss-${projectId}.`)) {
        fs.unlinkSync(path.join(IMAGES_DIR, file));
      }
    }
    
    // Write the new image
    fs.writeFileSync(filepath, base64Data, 'base64');
    
    res.json({ 
      success: true, 
      filename,
      url: `/api/images/${filename}`
    });
  } catch (error) {
    console.error('Failed to save image:', error);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

// DELETE /api/delete-image/:projectId - Delete a boss card image
router.delete('/delete-image/:projectId', (req, res) => {
  const { projectId } = req.params;
  
  try {
    // Find and delete any boss image for this project
    const existingFiles = fs.readdirSync(IMAGES_DIR);
    let deleted = false;
    
    for (const file of existingFiles) {
      if (file.startsWith(`boss-${projectId}.`)) {
        fs.unlinkSync(path.join(IMAGES_DIR, file));
        deleted = true;
      }
    }
    
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Failed to delete image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
