# Gamified Tracker

A full-stack personal productivity application combining **habit tracking**, **nutrition logging**, and **workout tracking** in one unified interface. Built with React, TypeScript, and Express.js, featuring AI-powered food parsing and visual gamification through heatmaps and scoring systems.

## Features

### Habits Tracker

Daily habit tracking with visual feedback through a GitHub-style contribution heatmap.

- **Habit Types**: Checkbox (done/not done) and count-based (with optional targets)
- **Heatmap Visualization**: 52-week calendar view with 5-level color intensity
- **Interactive Tooltips**: Hover over any day to see detailed per-habit breakdown
- **Scoring System**: Daily progress calculated as percentage (0-100%)
- **Drag-and-Drop**: Reorder habits by dragging
- **Archiving**: Soft-delete habits (hidden but data preserved for history)
- **Export/Import**: Backup and restore your data as JSON
- **Special Presets**: Built-in support for kettlebell swings with weight tracking
- **Dual Storage**: Saves to both localStorage and server API for reliability
- **Auto-refresh**: Automatically updates at midnight for the new day

### Food Tracker

Comprehensive nutrition logging with AI-powered assistance.

- **Nutritional Tracking**: Calories, protein, carbs, fats, sodium, caffeine, and total grams
- **AI Food Parser**: Paste nutritional text and let Claude extract the values automatically
  - Handles European number formats (comma decimals)
  - Smart salt-to-sodium conversion (1g salt ≈ 400mg sodium)
- **Meal Lookup**: Describe meals in natural language, search online via Perplexity API
- **Food Search**: Real-time search with keyboard navigation (arrow keys, Enter, Escape)
- **Servings Calculator**: Adjustable servings with live nutrition preview
- **Copy to Clipboard**: Quickly copy food nutritional info
- **Water Intake**: Visual water drop tracker with quick-add buttons (+250mL, +500mL, -250mL)
- **Intermittent Fasting**: Track fasting completion with customizable eating windows (default: 1 PM - 8 PM)
- **Daily Summaries**: Aggregated nutrition totals with color-coded cards

### Workout Tracker

Track kettlebell swings and push-ups with timers and visual progress heatmaps.

- **Kettlebell Logging**: Track weight, reps, and single/double-handed swings
- **Push-up Logging**: Simple rep tracking for each set
- **Stopwatch Timers**: Separate timers for kettlebell and push-up sessions
- **Volume Calculation**: Automatic calculation of total weight lifted (weight × reps × hand multiplier)
- **Daily Summary**: View total swings, volume, push-ups, and time spent
- **Heatmap Visualization**: GitHub-style heatmaps showing daily kettlebell volume and push-up totals over 52 weeks
- **Workout History**: Color-coded intensity levels based on configurable thresholds

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4 |
| UI Components | @dnd-kit (drag & drop) |
| Backend | Express.js 4, Node.js |
| Storage | File-based JSON (no database required) |
| AI | Anthropic Claude (food parsing), Perplexity API (meal lookup) |

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gamified-tracker.git
   cd gamified-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. Set up environment variables (optional, required for AI features):
   ```bash
   cp server/.env.example server/.env
   ```

   Edit `server/.env` and add your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

4. Start the development servers:
   ```bash
   npm run dev
   ```

   This runs both the frontend (Vite) and backend (Express) concurrently:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

### Production Build

```bash
npm run build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+L` | Toggle dark mode |

## API Endpoints

### Food

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/foods` | List all foods (optional `?search=`) |
| POST | `/api/foods` | Create a new food |
| PUT | `/api/foods/:id` | Update a food |
| DELETE | `/api/foods/:id` | Delete a food |
| POST | `/api/foods/parse` | AI parse nutritional text |
| POST | `/api/foods/meal-lookup` | Search meals online |

### Food Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Get logs (optional `?date=YYYY-MM-DD`) |
| GET | `/api/logs/summary` | Get daily nutrition summary |
| POST | `/api/logs` | Create a log entry |
| PUT | `/api/logs/:id` | Update a log entry |
| DELETE | `/api/logs/:id` | Delete a log entry |

### Daily Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/daily` | Get daily data (fasting, water) |
| PUT | `/api/daily` | Update fasting settings |
| POST | `/api/daily/water` | Add/subtract water intake |

### Habits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | Get habits data |
| POST | `/api/habits` | Save habits data |

### Workouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workouts/kettlebell` | Get kettlebell entries (optional `?date=`) |
| POST | `/api/workouts/kettlebell` | Log a kettlebell entry |
| PUT | `/api/workouts/kettlebell/:id` | Update a kettlebell entry |
| DELETE | `/api/workouts/kettlebell/:id` | Delete a kettlebell entry |
| GET | `/api/workouts/pushups` | Get push-up entries (optional `?date=`) |
| POST | `/api/workouts/pushups` | Log a push-up entry |
| PUT | `/api/workouts/pushups/:id` | Update a push-up entry |
| DELETE | `/api/workouts/pushups/:id` | Delete a push-up entry |
| GET | `/api/workouts/summary` | Get daily workout summary |
| GET | `/api/workouts/daily` | Get daily timer data |
| PUT | `/api/workouts/daily` | Update daily timer data |
| GET | `/api/workouts/history` | Get aggregated history for heatmaps |

## Data Storage

Data is stored as JSON files in `server/data/`:

```
server/data/
├── food/
│   ├── foods.json       # Food database
│   ├── food-logs.json   # Daily food logs
│   └── daily.json       # Fasting and water data
├── habits/
│   └── habits.json      # Habits and daily entries
├── workout/
│   ├── kettlebell.json    # Kettlebell swing entries
│   ├── pushups.json       # Push-up entries
│   └── workout-daily.json # Workout timer data
└── images/              # Uploaded images
```

### Cloud Sync (Optional)

To sync data across devices, configure a custom data directory in `server/.env`:

```bash
# Store in iCloud Drive
TRACKER_DATA_DIR=/Users/you/Library/Mobile Documents/com~apple~CloudDocs/tracker/
```

## Project Structure

```
gamified-tracker/
├── src/
│   ├── components/
│   │   ├── habits/        # Habit tracking UI
│   │   ├── food/          # Food tracking UI
│   │   ├── workout/       # Workout tracking UI
│   │   └── Sidebar.tsx    # Navigation sidebar
│   ├── hooks/             # Custom React hooks
│   ├── lib/habits/        # Habits logic and storage
│   ├── types/             # TypeScript types
│   └── App.tsx            # Main app component
├── server/
│   ├── routes/
│   │   ├── food.js        # Food & nutrition API
│   │   └── workouts.js    # Workout tracking API
│   ├── utils/             # Server utilities
│   └── index.js           # Express server
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## License

MIT
