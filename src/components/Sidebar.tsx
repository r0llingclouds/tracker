import type { AppMode, Theme } from '../App';

type SidebarProps = {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  theme: Theme;
  toggleTheme: () => void;
};

export function Sidebar({ appMode, setAppMode, theme, toggleTheme }: SidebarProps) {
  const getThemeLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-screen">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <select
          value={appMode}
          onChange={(e) => setAppMode(e.target.value as AppMode)}
          className="text-xl font-bold bg-transparent border-none outline-none cursor-pointer text-zinc-900 dark:text-zinc-50 w-full appearance-none pr-6 bg-no-repeat bg-right"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: '1.25rem'
          }}
        >
          <option value="habits">Habits</option>
          <option value="food">Food</option>
          <option value="workout">Workout</option>
        </select>
      </div>
      
      <div className="flex-1 p-4">
        {appMode === 'habits' && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Track your daily habits with a GitHub-style heatmap visualization.
          </p>
        )}
        {appMode === 'food' && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Track your daily nutrition, water intake, and intermittent fasting.
          </p>
        )}
        {appMode === 'workout' && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Track your kettlebell swings and push ups.
          </p>
        )}
      </div>
      
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
        >
          <span>Theme</span>
          <span className="text-zinc-500 dark:text-zinc-400">{getThemeLabel()}</span>
        </button>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 px-3">
          <kbd className="font-mono">Cmd+Shift+L</kbd> toggle theme
        </p>
      </div>
    </aside>
  );
}
