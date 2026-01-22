import { Command } from 'cmdk';
import { useEffect, useState, useRef } from 'react';
import { useTaskStore } from '../store/taskStore';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  mode: 'search' | 'move' | 'tag' | 'newTask';
  initialValue?: string;
}

export function CommandPalette({ open, onClose, mode, initialValue = '' }: CommandPaletteProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    tasks, 
    projects, 
    tags,
    selectedTaskId,
    addTask, 
    moveTask,
    addTagToTask,
    addProject,
    setView,
    selectTask,
  } = useTaskStore();

  useEffect(() => {
    if (open) {
      setInputValue(initialValue);
      // Focus input after a small delay to ensure the dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, mode, initialValue]);

  const handleSelect = (callback: () => void) => {
    callback();
    onClose();
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'newTask':
        return 'What needs to be done?';
      case 'move':
        return 'Move to project...';
      case 'tag':
        return 'Add tag...';
      default:
        return 'Search tasks, projects, or type a command...';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter for new task creation
    if (mode === 'newTask' && e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTask(inputValue.trim());
      onClose();
      return;
    }
    
    // Handle Enter for new tag creation
    if (mode === 'tag' && e.key === 'Enter' && inputValue.trim() && selectedTaskId) {
      e.preventDefault();
      addTagToTask(selectedTaskId, inputValue.trim());
      onClose();
      return;
    }
    
    // Handle Enter for new project creation when moving
    if (mode === 'move' && e.key === 'Enter' && inputValue.trim()) {
      // Check if it matches an existing project
      const existingProject = projects.find(
        p => p.name.toLowerCase() === inputValue.trim().toLowerCase()
      );
      if (!existingProject && selectedTaskId) {
        // Create new project and move task to it
        addProject(inputValue.trim());
        // We need to get the new project id after it's created
        // For now, we'll just close - the user can select it from the list
      }
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <Command
        className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <Command.Input
          ref={inputRef}
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="w-full px-4 py-4 text-lg border-b border-gray-200 outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-gray-500">
            {mode === 'newTask' 
              ? 'Press Enter to create task' 
              : mode === 'tag'
              ? 'Press Enter to create tag'
              : 'No results found'}
          </Command.Empty>

          {mode === 'search' && (
            <>
              {/* Actions */}
              <Command.Group heading="Actions">
                <Command.Item
                  value="new task"
                  onSelect={() => handleSelect(() => {
                    // Will be handled by parent opening in newTask mode
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <span>New Task</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">n</span>
                </Command.Item>
                <Command.Item
                  value="new project"
                  onSelect={() => {
                    const name = prompt('Project name:');
                    if (name) {
                      addProject(name);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">📁</span>
                  <span>New Project</span>
                </Command.Item>
              </Command.Group>

              {/* Navigation */}
              <Command.Group heading="Navigation">
                <Command.Item
                  value="inbox"
                  onSelect={() => handleSelect(() => setView('inbox'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">📥</span>
                  <span>Go to Inbox</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">gi</span>
                </Command.Item>
                <Command.Item
                  value="today"
                  onSelect={() => handleSelect(() => setView('today'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">📅</span>
                  <span>Go to Today</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">gt</span>
                </Command.Item>
              </Command.Group>

              {/* Projects */}
              {projects.length > 0 && (
                <Command.Group heading="Projects">
                  {projects.map(project => (
                    <Command.Item
                      key={project.id}
                      value={`project ${project.name}`}
                      onSelect={() => handleSelect(() => setView('project', project.id))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                    >
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <span>{project.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Tasks */}
              {tasks.filter(t => !t.completed).length > 0 && (
                <Command.Group heading="Tasks">
                  {tasks.filter(t => !t.completed).slice(0, 10).map(task => (
                    <Command.Item
                      key={task.id}
                      value={`task ${task.title}`}
                      onSelect={() => handleSelect(() => selectTask(task.id))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                    >
                      <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      <span className="truncate">{task.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}

          {mode === 'move' && (
            <>
              <Command.Item
                value="inbox"
                onSelect={() => handleSelect(() => {
                  if (selectedTaskId) moveTask(selectedTaskId, null);
                })}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
              >
                <span className="text-lg">📥</span>
                <span>Inbox</span>
              </Command.Item>
              {projects.map(project => (
                <Command.Item
                  key={project.id}
                  value={project.name}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) moveTask(selectedTaskId, project.id);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                </Command.Item>
              ))}
              {inputValue && !projects.some(p => p.name.toLowerCase() === inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    addProject(inputValue);
                    // Move task to the new project - need to do this after project is created
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <span>Create "{inputValue}"</span>
                </Command.Item>
              )}
            </>
          )}

          {mode === 'tag' && (
            <>
              {tags.map(tag => (
                <Command.Item
                  key={tag}
                  value={tag}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) addTagToTask(selectedTaskId, tag);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-gray-400">#</span>
                  <span>{tag}</span>
                </Command.Item>
              ))}
              {inputValue && !tags.includes(inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create tag ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) addTagToTask(selectedTaskId, inputValue);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <span>Create tag "#{inputValue}"</span>
                </Command.Item>
              )}
            </>
          )}

          {mode === 'newTask' && inputValue && (
            <Command.Item
              value={inputValue}
              onSelect={() => handleSelect(() => addTask(inputValue))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
            >
              <span className="text-lg">+</span>
              <span>Create "{inputValue}"</span>
              <span className="ml-auto text-xs text-gray-400">↵</span>
            </Command.Item>
          )}
        </Command.List>
        
        <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </Command>
    </div>
  );
}
