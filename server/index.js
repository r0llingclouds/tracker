import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const HABITS_FILE = process.env.HABITS_DATA_FILE || path.join(__dirname, 'habits.json');

// Food tracker data files
const FOOD_DATA_DIR = process.env.FOOD_DATA_DIR || path.join(__dirname, 'food-data');
const FOODS_FILE = path.join(FOOD_DATA_DIR, 'foods.json');
const LOGS_FILE = path.join(FOOD_DATA_DIR, 'logs.json');
const DAILY_FILE = path.join(FOOD_DATA_DIR, 'daily.json');

// Ensure food data directory exists
if (!fs.existsSync(FOOD_DATA_DIR)) {
  fs.mkdirSync(FOOD_DATA_DIR, { recursive: true });
}

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

// ============ FOOD TRACKER HELPERS ============

// Helper to get date string (YYYY-MM-DD) from ISO timestamp in local timezone
function getDateString(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get today's date string in local timezone
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to read food JSON files
function readFoodJSON(filepath) {
  try {
    if (!fs.existsSync(filepath)) {
      return { nextId: 1, items: [] };
    }
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filepath}:`, error);
    return { nextId: 1, items: [] };
  }
}

// Helper to write food JSON files
function writeFoodJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filepath}:`, error);
    return false;
  }
}

// ============ FOODS API ============

// GET /api/foods - List all foods (with optional search)
app.get('/api/foods', (req, res) => {
  try {
    const { search } = req.query;
    const { items } = readFoodJSON(FOODS_FILE);
    let foods = [...items];
    
    if (search) {
      const searchLower = search.toLowerCase();
      foods = foods.filter(f => f.name.toLowerCase().includes(searchLower));
    }
    
    // Sort by name ascending
    foods.sort((a, b) => a.name.localeCompare(b.name));
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/foods/:id - Get single food
app.get('/api/foods/:id', (req, res) => {
  try {
    const { items } = readFoodJSON(FOODS_FILE);
    const food = items.find(f => f.id === Number(req.params.id));
    
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }
    
    res.json(food);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/foods - Create new food
app.post('/api/foods', (req, res) => {
  try {
    const { name, kcal = 0, protein = 0, carbs = 0, fats = 0, sodium = 0, caffeine = 0, total_grams = null } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Food name is required' });
    }
    
    const store = readFoodJSON(FOODS_FILE);
    
    // Check for duplicate name (case-insensitive)
    const nameLower = name.trim().toLowerCase();
    const duplicate = store.items.find(f => f.name.toLowerCase() === nameLower);
    if (duplicate) {
      return res.status(409).json({ error: 'A food with this name already exists' });
    }
    
    const food = {
      id: store.nextId,
      name: name.trim(),
      kcal: Number(kcal) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      sodium: Number(sodium) || 0,
      caffeine: Number(caffeine) || 0,
      total_grams: Number(total_grams) || null,
      created_at: new Date().toISOString()
    };
    
    store.items.push(food);
    store.nextId++;
    writeFoodJSON(FOODS_FILE, store);
    
    res.status(201).json(food);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/foods/parse - Parse text with AI (requires Anthropic API key)
app.post('/api/foods/parse', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI parsing not available - ANTHROPIC_API_KEY not configured' });
    }

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract nutritional information from the following text and return ONLY a valid JSON object with no additional text or explanation.

The JSON must have exactly these fields:
- "name": a descriptive name for the food/meal (string)
- "kcal": calories in kcal (number, no units)
- "protein": protein in grams (number, no units)
- "carbs": carbohydrates in grams (number, no units)
- "fats": fats in grams (number, no units)
- "sodium": sodium in milligrams (number, no units)
- "caffeine": caffeine in milligrams (number, default to 0 if not mentioned)

Important:
- Remove any ~ or approximate symbols, just use the number
- Convert all values to numbers (not strings)
- If a value uses commas as decimal separators (European format like 1.360), convert to proper number (1360)
- If sodium is given as salt, convert: 1g salt ≈ 400mg sodium

Text to parse:
${text}

Return ONLY the JSON object, nothing else.`
        }
      ]
    });

    // Extract the text content from Claude's response
    const responseText = message.content[0].text.trim();
    
    // Parse the JSON response
    let parsedFood;
    try {
      parsedFood = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedFood = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({ error: 'Failed to parse AI response as JSON', raw: responseText });
      }
    }

    // Validate and sanitize the parsed data
    const foodData = {
      name: String(parsedFood.name || 'Unknown Food').trim(),
      kcal: Number(parsedFood.kcal) || 0,
      protein: Number(parsedFood.protein) || 0,
      carbs: Number(parsedFood.carbs) || 0,
      fats: Number(parsedFood.fats) || 0,
      sodium: Number(parsedFood.sodium) || 0,
      caffeine: Number(parsedFood.caffeine) || 0,
      total_grams: Number(parsedFood.total_grams) || null,
    };

    res.json({ parsed: foodData });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse text with AI' });
  }
});

// POST /api/foods/meal-lookup - Search nutrition info online (requires Perplexity + Anthropic API keys)
app.post('/api/foods/meal-lookup', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Meal description is required' });
    }

    // Check for API keys
    if (!process.env.ANTHROPIC_API_KEY || !process.env.PERPLEXITY_API_KEY) {
      return res.status(503).json({ error: 'Meal lookup not available - API keys not configured' });
    }

    // Query Perplexity for nutritional information
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: `What are the nutritional values (calories, protein, carbs, fats, sodium, caffeine) for: ${description.trim()}? Provide approximate totals for all items combined.`
          }
        ]
      })
    });

    if (!perplexityResponse.ok) {
      throw new Error('Failed to query Perplexity API');
    }

    const perplexityData = await perplexityResponse.json();
    const perplexityContent = perplexityData.choices?.[0]?.message?.content || '';
    const sources = perplexityData.citations || [];

    // Use Anthropic to parse the Perplexity response into structured JSON
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract nutritional information from the following text and return ONLY a valid JSON object with no additional text or explanation.

The JSON must have exactly these fields:
- "name": a descriptive name for the food/meal based on the description "${description}" (string)
- "kcal": calories in kcal (number, no units)
- "protein": protein in grams (number, no units)
- "carbs": carbohydrates in grams (number, no units)
- "fats": fats in grams (number, no units)
- "sodium": sodium in milligrams (number, no units)
- "caffeine": caffeine in milligrams (number, default to 0 if not mentioned)

Important:
- Use the TOTAL/COMBINED values if multiple items are listed
- Remove any ~ or approximate symbols, just use the number
- Convert all values to numbers (not strings)
- Use the middle of any ranges provided (e.g., 662-744 kcal → 703 kcal)

Text to parse:
${perplexityContent}

Return ONLY the JSON object, nothing else.`
        }
      ]
    });

    // Extract the text content from Claude's response
    const responseText = message.content[0].text.trim();
    
    // Parse the JSON response
    let parsedFood;
    try {
      parsedFood = JSON.parse(responseText);
    } catch (parseError) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedFood = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({ 
          error: 'Failed to parse AI response as JSON', 
          raw: responseText,
          perplexityContent 
        });
      }
    }

    // Validate and sanitize the parsed data
    const foodData = {
      name: String(parsedFood.name || description.trim()).trim(),
      kcal: Number(parsedFood.kcal) || 0,
      protein: Number(parsedFood.protein) || 0,
      carbs: Number(parsedFood.carbs) || 0,
      fats: Number(parsedFood.fats) || 0,
      sodium: Number(parsedFood.sodium) || 0,
      caffeine: Number(parsedFood.caffeine) || 0,
      total_grams: Number(parsedFood.total_grams) || null,
    };

    res.json({ 
      parsed: foodData,
      rawResponse: perplexityContent,
      sources,
    });
  } catch (error) {
    console.error('Meal lookup error:', error);
    res.status(500).json({ error: error.message || 'Failed to lookup meal nutrition' });
  }
});

// PUT /api/foods/:id - Update food
app.put('/api/foods/:id', (req, res) => {
  try {
    const { name, kcal, protein, carbs, fats, sodium, caffeine, total_grams } = req.body;
    const store = readFoodJSON(FOODS_FILE);
    const index = store.items.findIndex(f => f.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Food not found' });
    }
    
    const existing = store.items[index];
    
    // Check for duplicate name if name is being changed
    if (name !== undefined && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameLower = name.trim().toLowerCase();
      const duplicate = store.items.find(f => f.id !== Number(req.params.id) && f.name.toLowerCase() === nameLower);
      if (duplicate) {
        return res.status(409).json({ error: 'A food with this name already exists' });
      }
    }
    
    const updated = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      kcal: kcal !== undefined ? Number(kcal) : existing.kcal,
      protein: protein !== undefined ? Number(protein) : existing.protein,
      carbs: carbs !== undefined ? Number(carbs) : existing.carbs,
      fats: fats !== undefined ? Number(fats) : existing.fats,
      sodium: sodium !== undefined ? Number(sodium) : existing.sodium,
      caffeine: caffeine !== undefined ? Number(caffeine) : existing.caffeine,
      total_grams: total_grams !== undefined ? (Number(total_grams) || null) : existing.total_grams
    };
    
    store.items[index] = updated;
    writeFoodJSON(FOODS_FILE, store);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/foods/:id - Delete food
app.delete('/api/foods/:id', (req, res) => {
  try {
    const store = readFoodJSON(FOODS_FILE);
    const index = store.items.findIndex(f => f.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Food not found' });
    }
    
    store.items.splice(index, 1);
    writeFoodJSON(FOODS_FILE, store);
    
    // Cascade delete: remove all logs referencing this food
    const logStore = readFoodJSON(LOGS_FILE);
    logStore.items = logStore.items.filter(log => log.food_id !== Number(req.params.id));
    writeFoodJSON(LOGS_FILE, logStore);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LOGS API ============

// GET /api/logs - Get food logs (with optional date filter)
app.get('/api/logs', (req, res) => {
  try {
    const { date } = req.query;
    const logStore = readFoodJSON(LOGS_FILE);
    const foodStore = readFoodJSON(FOODS_FILE);
    
    // Create a map for quick food lookup
    const foodMap = new Map(foodStore.items.map(f => [f.id, f]));
    
    // Filter by date
    const targetDate = date || getTodayString();
    let logs = logStore.items.filter(log => {
      const logDate = getDateString(log.logged_at);
      return logDate === targetDate;
    });
    
    // Join with foods and format response
    logs = logs.map(log => {
      const food = foodMap.get(log.food_id);
      return {
        id: log.id,
        food_id: log.food_id,
        servings: log.servings,
        logged_at: log.logged_at,
        name: food?.name || 'Unknown',
        kcal: food?.kcal || 0,
        protein: food?.protein || 0,
        carbs: food?.carbs || 0,
        fats: food?.fats || 0,
        sodium: food?.sodium || 0,
        caffeine: food?.caffeine || 0,
        total_grams: food?.total_grams || null
      };
    });
    
    // Sort by logged_at descending
    logs.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logs/summary - Get daily summary
app.get('/api/logs/summary', (req, res) => {
  try {
    const { date } = req.query;
    const logStore = readFoodJSON(LOGS_FILE);
    const foodStore = readFoodJSON(FOODS_FILE);
    
    const foodMap = new Map(foodStore.items.map(f => [f.id, f]));
    const targetDate = date || getTodayString();
    
    const logs = logStore.items.filter(log => {
      const logDate = getDateString(log.logged_at);
      return logDate === targetDate;
    });
    
    const summary = logs.reduce((acc, log) => {
      const food = foodMap.get(log.food_id);
      if (food) {
        acc.total_kcal += (food.kcal || 0) * log.servings;
        acc.total_protein += (food.protein || 0) * log.servings;
        acc.total_carbs += (food.carbs || 0) * log.servings;
        acc.total_fats += (food.fats || 0) * log.servings;
        acc.total_sodium += (food.sodium || 0) * log.servings;
        acc.total_caffeine += (food.caffeine || 0) * log.servings;
      }
      acc.total_entries++;
      return acc;
    }, {
      total_kcal: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fats: 0,
      total_sodium: 0,
      total_caffeine: 0,
      total_entries: 0
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/logs - Create new food log entry
app.post('/api/logs', (req, res) => {
  try {
    const { food_id, servings = 1 } = req.body;
    
    if (!food_id) {
      return res.status(400).json({ error: 'food_id is required' });
    }
    
    // Verify food exists
    const foodStore = readFoodJSON(FOODS_FILE);
    const food = foodStore.items.find(f => f.id === Number(food_id));
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }
    
    const store = readFoodJSON(LOGS_FILE);
    
    const log = {
      id: store.nextId,
      food_id: Number(food_id),
      servings: Number(servings) || 1,
      logged_at: new Date().toISOString()
    };
    
    store.items.push(log);
    store.nextId++;
    writeFoodJSON(LOGS_FILE, store);
    
    // Return with food data joined
    res.status(201).json({
      id: log.id,
      food_id: log.food_id,
      servings: log.servings,
      logged_at: log.logged_at,
      name: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      sodium: food.sodium,
      caffeine: food.caffeine,
      total_grams: food.total_grams
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/logs/:id - Update log entry (servings and/or logged_at)
app.put('/api/logs/:id', (req, res) => {
  try {
    const { servings, logged_at } = req.body;
    const store = readFoodJSON(LOGS_FILE);
    const index = store.items.findIndex(l => l.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    const existing = store.items[index];
    const updated = {
      ...existing,
      servings: servings !== undefined ? Number(servings) : existing.servings,
      logged_at: logged_at !== undefined ? logged_at : existing.logged_at
    };
    
    store.items[index] = updated;
    writeFoodJSON(LOGS_FILE, store);
    
    // Return with food data joined
    const foodStore = readFoodJSON(FOODS_FILE);
    const food = foodStore.items.find(f => f.id === updated.food_id);
    
    res.json({
      id: updated.id,
      food_id: updated.food_id,
      servings: updated.servings,
      logged_at: updated.logged_at,
      name: food?.name || 'Unknown',
      kcal: food?.kcal || 0,
      protein: food?.protein || 0,
      carbs: food?.carbs || 0,
      fats: food?.fats || 0,
      sodium: food?.sodium || 0,
      caffeine: food?.caffeine || 0,
      total_grams: food?.total_grams || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/logs/:id - Delete log entry
app.delete('/api/logs/:id', (req, res) => {
  try {
    const store = readFoodJSON(LOGS_FILE);
    const index = store.items.findIndex(l => l.id === Number(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    store.items.splice(index, 1);
    writeFoodJSON(LOGS_FILE, store);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DAILY TRACKING API ============

function readDailyJSON() {
  try {
    if (!fs.existsSync(DAILY_FILE)) {
      return { items: [] };
    }
    const data = fs.readFileSync(DAILY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading daily file:', error);
    return { items: [] };
  }
}

// GET /api/daily - Get daily tracking data (with optional date filter)
app.get('/api/daily', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayString();
    const store = readDailyJSON();
    
    let daily = store.items.find(d => d.date === targetDate);
    
    // Return existing record or defaults
    if (!daily) {
      daily = {
        date: targetDate,
        fasting_done: false,
        eating_start: 13,
        eating_end: 20,
        water_ml: 0
      };
    }
    
    res.json(daily);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/daily - Update fasting settings
app.put('/api/daily', (req, res) => {
  try {
    const { date } = req.query;
    const { fasting_done, eating_start, eating_end } = req.body;
    const targetDate = date || getTodayString();
    const store = readDailyJSON();
    
    let index = store.items.findIndex(d => d.date === targetDate);
    
    if (index === -1) {
      // Create new record with defaults
      store.items.push({
        date: targetDate,
        fasting_done: false,
        eating_start: 13,
        eating_end: 20,
        water_ml: 0
      });
      index = store.items.length - 1;
    }
    
    const existing = store.items[index];
    const updated = {
      ...existing,
      fasting_done: fasting_done !== undefined ? fasting_done : existing.fasting_done,
      eating_start: eating_start !== undefined ? Number(eating_start) : existing.eating_start,
      eating_end: eating_end !== undefined ? Number(eating_end) : existing.eating_end,
      water_ml: existing.water_ml
    };
    
    store.items[index] = updated;
    writeFoodJSON(DAILY_FILE, store);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/daily/water - Add or subtract water intake
app.post('/api/daily/water', (req, res) => {
  try {
    const { date } = req.query;
    const { amount } = req.body;
    
    if (amount === undefined || amount === 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const targetDate = date || getTodayString();
    const store = readDailyJSON();
    
    let index = store.items.findIndex(d => d.date === targetDate);
    
    if (index === -1) {
      // Create new record with defaults
      store.items.push({
        date: targetDate,
        fasting_done: false,
        eating_start: 13,
        eating_end: 20,
        water_ml: 0
      });
      index = store.items.length - 1;
    }
    
    const newAmount = store.items[index].water_ml + Number(amount);
    store.items[index].water_ml = Math.max(0, newAmount); // Prevent negative values
    writeFoodJSON(DAILY_FILE, store);
    
    res.json(store.items[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Food data directory: ${FOOD_DATA_DIR}`);
});
