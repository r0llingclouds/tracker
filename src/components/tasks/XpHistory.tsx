import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import type { XpEvent } from '../../types';

interface XpHistoryProps {
  open: boolean;
  onClose: () => void;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';
type TypeFilter = 'all' | 'earned' | 'revoked';

export function XpHistory({ open, onClose }: XpHistoryProps) {
  const { userProgress, tasks } = useTaskStore();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    let history = [...userProgress.xpHistory].reverse();
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = startOfDay(now);
      let startDate: Date;
      
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'week':
          startDate = subDays(today, 7);
          break;
        case 'month':
          startDate = subDays(today, 30);
          break;
        default:
          startDate = today;
      }
      
      history = history.filter(event => 
        isWithinInterval(new Date(event.timestamp), {
          start: startDate,
          end: endOfDay(now)
        })
      );
    }
    
    // Type filter
    if (typeFilter === 'earned') {
      history = history.filter(event => event.xp > 0);
    } else if (typeFilter === 'revoked') {
      history = history.filter(event => event.xp < 0);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      history = history.filter(event => 
        event.taskTitle.toLowerCase().includes(query)
      );
    }
    
    return history;
  }, [userProgress.xpHistory, dateFilter, typeFilter, searchQuery]);

  // Calculate stats for the filtered period
  const stats = useMemo(() => {
    const totalEarned = filteredHistory
      .filter(e => e.xp > 0)
      .reduce((sum, e) => sum + e.xp, 0);
    const totalRevoked = filteredHistory
      .filter(e => e.xp < 0)
      .reduce((sum, e) => sum + Math.abs(e.xp), 0);
    const netXp = totalEarned - totalRevoked;
    const tasksCompleted = filteredHistory.filter(e => e.xp > 0).length;
    
    return { totalEarned, totalRevoked, netXp, tasksCompleted };
  }, [filteredHistory]);

  // Group events by date
  const groupedHistory = useMemo(() => {
    const groups = new Map<string, XpEvent[]>();
    
    filteredHistory.forEach(event => {
      const dateKey = format(new Date(event.timestamp), 'yyyy-MM-dd');
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });
    
    return Array.from(groups.entries()).map(([date, events]) => ({
      date,
      events,
      totalXp: events.reduce((sum, e) => sum + e.xp, 0)
    }));
  }, [filteredHistory]);

  // Find the current task for a given XP event (if it still exists)
  const getTaskForEvent = (event: XpEvent) => {
    return tasks.find(t => t.id === event.taskId);
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative z-10 w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">XP History</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Level {userProgress.level} - {userProgress.totalXp} total XP
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                +{stats.totalEarned}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Earned</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                -{stats.totalRevoked}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Revoked</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${stats.netXp >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.netXp >= 0 ? '+' : ''}{stats.netXp}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Net XP</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {stats.tasksCompleted}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Tasks</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[150px] px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as DateFilter)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as TypeFilter)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All events</option>
            <option value="earned">XP earned</option>
            <option value="revoked">XP revoked</option>
          </select>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6">
          {groupedHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || dateFilter !== 'all' || typeFilter !== 'all'
                  ? 'No events match your filters'
                  : 'No XP earned yet. Complete tasks to start gaining XP!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedHistory.map(({ date, events, totalXp }) => (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </h4>
                    <span className={`text-sm font-mono ${
                      totalXp >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {totalXp >= 0 ? '+' : ''}{totalXp} XP
                    </span>
                  </div>
                  <div className="space-y-2">
                    {events.map(event => {
                      const task = getTaskForEvent(event);
                      const isEarned = event.xp > 0;
                      
                      return (
                        <div 
                          key={event.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isEarned
                              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            isEarned
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {isEarned ? '+' : ''}{event.xp}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {event.taskTitle}
                              </span>
                              {task?.completed && (
                                <span className="text-green-600 dark:text-green-400">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>{format(new Date(event.timestamp), 'h:mm a')}</span>
                              <span>•</span>
                              <span>Level {event.levelAtTime} at time</span>
                              {!task && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 dark:text-amber-400">Task deleted</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                            ID: {event.taskId.slice(0, 6)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredHistory.length} event{filteredHistory.length !== 1 ? 's' : ''} shown
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
