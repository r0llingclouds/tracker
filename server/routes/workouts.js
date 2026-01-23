import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJSON, writeJSON } from '../utils/files.js';
import { getTodayString } from '../utils/dates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Data file paths
const DATA_DIR = process.env.WORKOUT_DATA_DIR 
  || path.join(__dirname, '..', 'data');
const KETTLEBELL_FILE = path.join(DATA_DIR, 'kettlebell.json');
const PUSHUPS_FILE = path.join(DATA_DIR, 'pushups.json');
const DAILY_FILE = path.join(DATA_DIR, 'workout-daily.json');

// ============ KETTLEBELL API ============

// GET /api/workouts/kettlebell - Get kettlebell entries (with optional date filter)
router.get('/workouts/kettlebell', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();
    const store = readJSON(KETTLEBELL_FILE);
    
    let entries = store.items.filter(entry => entry.date === targetDate);
    
    // Sort by created_at descending
    entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workouts/kettlebell/summary - Get kettlebell summary for a date
router.get('/workouts/kettlebell/summary', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();
    const store = readJSON(KETTLEBELL_FILE);
    
    const entries = store.items.filter(entry => entry.date === targetDate);
    
    const summary = entries.reduce((acc, entry) => {
      const totalReps = entry.series * entry.reps;
      const handMultiplier = entry.singleHanded ? 1 : 2;
      acc.total_reps += totalReps;
      acc.total_volume += entry.weight * totalReps * handMultiplier;
      acc.total_entries++;
      return acc;
    }, {
      total_reps: 0,
      total_volume: 0,
      total_entries: 0
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workouts/kettlebell - Create new kettlebell entry
router.post('/workouts/kettlebell', (req, res) => {
  try {
    const { weight, series, reps, singleHanded = false, date } = req.body;
    
    if (!weight || weight <= 0) {
      return res.status(400).json({ error: 'Weight is required and must be positive' });
    }
    if (!series || series <= 0) {
      return res.status(400).json({ error: 'Series is required and must be positive' });
    }
    if (!reps || reps <= 0) {
      return res.status(400).json({ error: 'Reps is required and must be positive' });
    }
    
    const store = readJSON(KETTLEBELL_FILE);
    
    const entry = {
      id: store.nextId,
      date: date || getTodayString(),
      weight: Number(weight),
      series: Number(series),
      reps: Number(reps),
      singleHanded: Boolean(singleHanded),
      created_at: new Date().toISOString()
    };
    
    store.items.push(entry);
    store.nextId++;
    writeJSON(KETTLEBELL_FILE, store);
    
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/workouts/kettlebell/:id - Update kettlebell entry
router.put('/workouts/kettlebell/:id', (req, res) => {
  try {
    const { weight, series, reps, singleHanded } = req.body;
    const store = readJSON(KETTLEBELL_FILE);
    const index = store.items.findIndex(e => e.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const existing = store.items[index];
    const updated = {
      ...existing,
      weight: weight !== undefined ? Number(weight) : existing.weight,
      series: series !== undefined ? Number(series) : existing.series,
      reps: reps !== undefined ? Number(reps) : existing.reps,
      singleHanded: singleHanded !== undefined ? Boolean(singleHanded) : existing.singleHanded
    };
    
    store.items[index] = updated;
    writeJSON(KETTLEBELL_FILE, store);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/workouts/kettlebell/:id - Delete kettlebell entry
router.delete('/workouts/kettlebell/:id', (req, res) => {
  try {
    const store = readJSON(KETTLEBELL_FILE);
    const index = store.items.findIndex(e => e.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    store.items.splice(index, 1);
    writeJSON(KETTLEBELL_FILE, store);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PUSH UPS API ============

// GET /api/workouts/pushups - Get push up entries (with optional date filter)
router.get('/workouts/pushups', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();
    const store = readJSON(PUSHUPS_FILE);
    
    let entries = store.items.filter(entry => entry.date === targetDate);
    
    // Sort by created_at descending
    entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workouts/pushups/summary - Get push ups summary for a date
router.get('/workouts/pushups/summary', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();
    const store = readJSON(PUSHUPS_FILE);
    
    const entries = store.items.filter(entry => entry.date === targetDate);
    
    const summary = entries.reduce((acc, entry) => {
      acc.total_reps += entry.series * entry.reps;
      acc.total_entries++;
      return acc;
    }, {
      total_reps: 0,
      total_entries: 0
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workouts/pushups - Create new push up entry
router.post('/workouts/pushups', (req, res) => {
  try {
    const { series, reps, date } = req.body;
    
    if (!series || series <= 0) {
      return res.status(400).json({ error: 'Series is required and must be positive' });
    }
    if (!reps || reps <= 0) {
      return res.status(400).json({ error: 'Reps is required and must be positive' });
    }
    
    const store = readJSON(PUSHUPS_FILE);
    
    const entry = {
      id: store.nextId,
      date: date || getTodayString(),
      series: Number(series),
      reps: Number(reps),
      created_at: new Date().toISOString()
    };
    
    store.items.push(entry);
    store.nextId++;
    writeJSON(PUSHUPS_FILE, store);
    
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/workouts/pushups/:id - Update push up entry
router.put('/workouts/pushups/:id', (req, res) => {
  try {
    const { series, reps } = req.body;
    const store = readJSON(PUSHUPS_FILE);
    const index = store.items.findIndex(e => e.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const existing = store.items[index];
    const updated = {
      ...existing,
      series: series !== undefined ? Number(series) : existing.series,
      reps: reps !== undefined ? Number(reps) : existing.reps
    };
    
    store.items[index] = updated;
    writeJSON(PUSHUPS_FILE, store);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/workouts/pushups/:id - Delete push up entry
router.delete('/workouts/pushups/:id', (req, res) => {
  try {
    const store = readJSON(PUSHUPS_FILE);
    const index = store.items.findIndex(e => e.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    store.items.splice(index, 1);
    writeJSON(PUSHUPS_FILE, store);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DAILY TIMER DATA API ============

// GET /api/workouts/daily - Get daily workout timer data
router.get('/workouts/daily', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();
    const store = readJSON(DAILY_FILE, { items: [] });
    
    let daily = store.items.find(d => d.date === targetDate);
    
    // Return existing record or defaults
    if (!daily) {
      daily = {
        date: targetDate,
        kettlebell_time: 0,
        pushup_time: 0
      };
    }
    
    res.json(daily);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/workouts/daily - Update daily workout timer data
router.put('/workouts/daily', (req, res) => {
  try {
    const { date } = req.query;
    const { kettlebell_time, pushup_time } = req.body;
    const targetDate = date || getTodayString();
    const store = readJSON(DAILY_FILE, { items: [] });
    
    let index = store.items.findIndex(d => d.date === targetDate);
    
    if (index === -1) {
      // Create new record with defaults
      store.items.push({
        date: targetDate,
        kettlebell_time: 0,
        pushup_time: 0
      });
      index = store.items.length - 1;
    }
    
    const existing = store.items[index];
    const updated = {
      ...existing,
      kettlebell_time: kettlebell_time !== undefined ? Number(kettlebell_time) : existing.kettlebell_time,
      pushup_time: pushup_time !== undefined ? Number(pushup_time) : existing.pushup_time
    };
    
    store.items[index] = updated;
    writeJSON(DAILY_FILE, store);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HISTORY API (for heatmaps) ============

// GET /api/workouts/history - Get aggregated daily totals for all dates
router.get('/workouts/history', (req, res) => {
  try {
    const kettlebellStore = readJSON(KETTLEBELL_FILE);
    const pushupStore = readJSON(PUSHUPS_FILE);
    
    // Aggregate kettlebell entries by date
    const kettlebell = {};
    for (const entry of kettlebellStore.items) {
      const date = entry.date;
      if (!kettlebell[date]) {
        kettlebell[date] = { reps: 0, volume: 0 };
      }
      const totalReps = entry.series * entry.reps;
      const handMultiplier = entry.singleHanded ? 1 : 2;
      kettlebell[date].reps += totalReps;
      kettlebell[date].volume += entry.weight * totalReps * handMultiplier;
    }
    
    // Aggregate push-up entries by date
    const pushups = {};
    for (const entry of pushupStore.items) {
      const date = entry.date;
      if (!pushups[date]) {
        pushups[date] = { reps: 0 };
      }
      pushups[date].reps += entry.series * entry.reps;
    }
    
    res.json({ kettlebell, pushups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ COMBINED SUMMARY API ============

// GET /api/workouts/summary - Get combined workout summary for a date
router.get('/workouts/summary', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();
    
    const kettlebellStore = readJSON(KETTLEBELL_FILE);
    const pushupStore = readJSON(PUSHUPS_FILE);
    const dailyStore = readJSON(DAILY_FILE, { items: [] });
    
    const kettlebellEntries = kettlebellStore.items.filter(e => e.date === targetDate);
    const pushupEntries = pushupStore.items.filter(e => e.date === targetDate);
    const dailyData = dailyStore.items.find(d => d.date === targetDate) || { kettlebell_time: 0, pushup_time: 0 };
    
    const summary = {
      // Kettlebell
      kettlebell_total_reps: 0,
      kettlebell_total_volume: 0,
      kettlebell_total_time: dailyData.kettlebell_time,
      kettlebell_entries: kettlebellEntries.length,
      // Push ups
      pushup_total_reps: 0,
      pushup_total_time: dailyData.pushup_time,
      pushup_entries: pushupEntries.length
    };
    
    for (const entry of kettlebellEntries) {
      const totalReps = entry.series * entry.reps;
      const handMultiplier = entry.singleHanded ? 1 : 2;
      summary.kettlebell_total_reps += totalReps;
      summary.kettlebell_total_volume += entry.weight * totalReps * handMultiplier;
    }
    
    for (const entry of pushupEntries) {
      summary.pushup_total_reps += entry.series * entry.reps;
    }
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
