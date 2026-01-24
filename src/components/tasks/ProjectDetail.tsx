import { useState, useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/taskStore';

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
];

const API_URL = 'http://localhost:3001/api';

type Tab = 'settings' | 'bossCard';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(project?.name || '');
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [description, setDescription] = useState(project?.bossCard?.description || '');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.bossCard?.description || '');
    }
  }, [project]);

  useEffect(() => {
    if (open && nameRef.current && activeTab === 'settings') {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [open, activeTab]);

  // Reset to settings tab when project changes or modal closes
  useEffect(() => {
    if (!open) {
      setActiveTab('settings');
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

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setIsUploading(true);
    
    try {
      // Convert to base64 for upload
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Upload to server
        const response = await fetch(`${API_URL}/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, projectId })
        });
        
        if (response.ok) {
          const { url } = await response.json();
          updateProject(projectId, {
            bossCard: {
              image: url,
              description: project.bossCard?.description || ''
            }
          });
        } else {
          console.error('Failed to upload image');
        }
        
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await fetch(`${API_URL}/delete-image/${projectId}`, {
        method: 'DELETE'
      });
      
      updateProject(projectId, {
        bossCard: {
          image: null,
          description: project.bossCard?.description || ''
        }
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (project.bossCard?.description || '')) {
      updateProject(projectId, {
        bossCard: {
          image: project.bossCard?.image || null,
          description: description
        }
      });
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

        {/* Tabs - only show if boss project */}
        {project.boss && (
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('bossCard')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'bossCard'
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span>👑</span>
              Boss Card
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {activeTab === 'settings' ? (
            <>
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
            </>
          ) : (
            /* Boss Card Tab */
            <>
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Boss Image
                </label>
                
                {project.bossCard?.image ? (
                  /* Image Preview */
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img
                        src={`http://localhost:3001${project.bossCard.image}`}
                        alt="Boss"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Change Image'}
                      </button>
                      <button
                        onClick={handleRemoveImage}
                        disabled={isUploading}
                        className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Upload Area */
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg transition-colors ${
                      isUploading
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 cursor-wait'
                        : isDragging
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 cursor-pointer'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-pointer'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <svg className="w-10 h-10 text-purple-500 animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-sm text-purple-600 dark:text-purple-400">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <svg className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                          <span className="font-medium text-purple-600 dark:text-purple-400">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          PNG, JPG, GIF or WebP
                        </p>
                      </>
                    )}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  placeholder="Describe the boss challenge, its backstory, or what defeating it means..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500 resize-none"
                />
              </div>
            </>
          )}
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
