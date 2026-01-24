import { useState, useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/taskStore';

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
];

interface ProjectDetailProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function ProjectDetail({ projectId, open, onClose }: ProjectDetailProps) {
  const {
    projects,
    areas,
    updateProject,
    deleteProject,
    setProjectArea,
    toggleProjectBoss,
  } = useTaskStore();

  const project = projects.find(p => p.id === projectId);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(project?.name || '');

  useEffect(() => {
    if (project) {
      setName(project.name);
    }
  }, [project]);

  useEffect(() => {
    if (open && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [open]);

  if (!open || !project) return null;

  const handleNameBlur = () => {
    if (name.trim() && name !== project.name) {
      updateProject(projectId, { name: name.trim() });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameBlur();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setName(project.name);
      onClose();
    }
  };

  const handleColorChange = (color: string) => {
    updateProject(projectId, { color });
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setProjectArea(projectId, value === 'none' ? null : value);
  };

  const handleDelete = () => {
    if (confirm(`Delete project "${project.name}"? Tasks will be moved to Inbox.`)) {
      deleteProject(projectId);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Project</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    project.color === color
                      ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-800 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Area
            </label>
            <select
              value={project.areaId || 'none'}
              onChange={handleAreaChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            >
              <option value="none">No Area</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          {/* Boss Project */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={project.boss}
                  onChange={() => toggleProjectBoss(projectId)}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-400"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <span className="text-lg">👑</span>
                  Boss Project
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Tasks in boss projects earn <span className="font-semibold text-purple-600 dark:text-purple-400">2x XP</span> when completed and are automatically tagged with <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">#boss</span>
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            Delete project
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
