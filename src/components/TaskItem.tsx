import type { Task, Project } from '../types';

interface TaskItemProps {
  task: Task;
  project?: Project;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

export function TaskItem({ task, project, selected, onSelect, onToggle }: TaskItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer ${
        selected 
          ? 'bg-blue-50 border-l-2 border-blue-500' 
          : 'hover:bg-gray-50 border-l-2 border-transparent'
      } ${task.completed ? 'opacity-60' : ''}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transform hover:scale-110 active:scale-95 ${
          task.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={`truncate ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {task.title}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          {project && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </span>
          )}
          
          {task.tags.length > 0 && (
            <div className="flex gap-1">
              {task.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400">
        <span className="font-mono">space+c</span> complete
      </div>
    </div>
  );
}
