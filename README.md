# Gamified Tracker

A full-stack personal productivity application combining **task management**, **habit tracking**, and **nutrition logging** in one unified interface. Built with React, TypeScript, and Express.js, featuring keyboard-driven workflows, AI-powered food parsing, and visual gamification through heatmaps and scoring systems.

## Features

### Tasks Tracker

A powerful task management system inspired by Things 3 with keyboard-first design.

- **Organization**: Projects, areas, and tags for flexible task categorization
- **Smart Views**: Inbox, Today, Upcoming, and Someday lists
- **Command Palette**: Quick actions via `Cmd/Ctrl+K` with natural language date parsing
- **Recurring Tasks**: Daily, weekly (with specific weekdays), monthly, and yearly recurrence
- **Time Tracking**: Built-in per-task timer with start/pause/reset controls
- **Keyboard Shortcuts**: Vim-inspired space leader commands for rapid task management
- **Natural Language**: Create tasks with dates like "tomorrow", "next monday", or "21 jun"

### Habits Tracker

Daily habit tracking with visual feedback through a GitHub-style contribution heatmap.

- **Habit Types**: Checkbox (done/not done) and count-based (with optional targets)
- **Heatmap Visualization**: 52-week calendar view with 5-level color intensity
- **Scoring System**: Daily progress calculated as percentage (0-100%)
- **Drag-and-Drop**: Reorder habits by dragging
- **Export/Import**: Backup and restore your data as JSON
- **Special Presets**: Built-in support for kettlebell swings with weight tracking

### Food Tracker

Comprehensive nutrition logging with AI-powered assistance.

- **Nutritional Tracking**: Calories, protein, carbs, fats, sodium, caffeine, and total grams
- **AI Food Parser**: Paste nutritional text and let Claude extract the values automatically
- **Meal Lookup**: Describe meals in natural language, search online via Perplexity API
- **Water Intake**: Visual water drop tracker with quick-add buttons
- **Intermittent Fasting**: Track fasting completion with customizable eating windows
- **Daily Summaries**: Aggregated nutrition totals with color-coded cards

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| UI Components | @dnd-kit (drag & drop), cmdk (command palette) |
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

### Global

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+K` | Open command palette |
| `Cmd/Ctrl+Shift+L` | Toggle dark mode |
| `Escape` | Close palette/modal |
| `Arrow Up/Down` | Navigate tasks |
| `Enter` | Complete selected task |

### Space Leader Commands (when task is selected)

| Shortcut | Action |
|----------|--------|
| `Space + n` | New task |
| `Space + c` | Complete task |
| `Space + d` | Delete task |
| `Space + m` | Move task to project |
| `Space + t` | Add/remove tags |
| `Space + s` | Schedule task |
| `Space + e` | Set deadline |
| `Space + p` | Play/pause timer |

### Command Palette Navigation

| Command | Action |
|---------|--------|
| `gi` | Go to Inbox |
| `gt` | Go to Today |
| `gu` | Go to Upcoming |
| `gs` | Go to Someday |

### Natural Language in Command Palette

When creating or scheduling tasks, use natural language dates:
- `today`, `tomorrow`, `tom`
- `monday`, `mon`, `next week`
- `21 jun`, `jun 21`, `21/6`
- Deadlines: prefix with `d/` (e.g., `d/monday`, `d/21jun`)

## API Endpoints

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Get all tasks, projects, areas |
| POST | `/api/data` | Save all tasks data |

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

## Data Storage

Data is stored as JSON files in `server/data/`:

```
server/data/
├── tasks.json      # Tasks, projects, areas
├── foods.json      # Food database
├── food-logs.json  # Daily food logs
├── daily.json      # Fasting and water data
└── habits.json     # Habits and daily entries
```

### Cloud Sync (Optional)

To sync data across devices, configure custom paths in `server/.env`:

```bash
# Store in iCloud Drive
TASKS_DATA_FILE=/Users/you/Library/Mobile Documents/com~apple~CloudDocs/tracker/tasks.json
HABITS_DATA_FILE=/Users/you/Library/Mobile Documents/com~apple~CloudDocs/tracker/habits.json
FOOD_DATA_DIR=/Users/you/Library/Mobile Documents/com~apple~CloudDocs/tracker/food/
```

## Project Structure

```
gamified-tracker/
├── src/
│   ├── components/
│   │   ├── tasks/         # Task management UI
│   │   ├── habits/        # Habit tracking UI
│   │   ├── food/          # Food tracking UI
│   │   └── Sidebar.tsx    # Navigation sidebar
│   ├── store/
│   │   └── taskStore.ts   # Zustand store for tasks
│   ├── hooks/             # Custom React hooks
│   ├── lib/habits/        # Habits logic and storage
│   ├── types/             # TypeScript types
│   └── App.tsx            # Main app component
├── server/
│   ├── routes/
│   │   ├── tasks.js       # Tasks API
│   │   └── food.js        # Food & nutrition API
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
