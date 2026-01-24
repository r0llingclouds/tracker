import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  parseTaskInput,
  isTypingTag,
  isTypingLocation,
  insertTagIntoInput,
  insertLocationIntoInput,
  type ParsedTaskInput,
} from '../../lib/tasks/parsing';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Area {
  id: string;
  name: string;
}

export interface SmartTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onParsedChange?: (parsed: ParsedTaskInput) => void;
  onSubmit?: (parsed: ParsedTaskInput) => void;
  onCancel?: () => void;
  projects: Project[];
  areas: Area[];
  tags: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  showPreview?: boolean;
}

export function SmartTaskInput({
  value,
  onChange,
  onParsedChange,
  onSubmit,
  onCancel,
  projects,
  areas,
  tags,
  placeholder = 'Type task name...',
  autoFocus = false,
  className = '',
  showPreview = true,
}: SmartTaskInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Parse input on every change
  const parsed = parseTaskInput(value);
  const tagTyping = isTypingTag(value);
  const locationTyping = isTypingLocation(value);

  // Resolve project/area from parsed location name
  const resolvedProject = parsed.projectName
    ? projects.find(p => p.name.toLowerCase() === parsed.projectName)
    : null;
  const resolvedArea = !resolvedProject && parsed.areaName
    ? areas.find(a => a.name.toLowerCase() === parsed.areaName)
    : null;

  // Filter suggestions based on typing
  const filteredTags = tagTyping.isTyping
    ? tags.filter(t => t.toLowerCase().includes(tagTyping.query))
    : [];
  const filteredProjects = locationTyping.isTyping
    ? projects.filter(p => p.name.toLowerCase().includes(locationTyping.query))
    : [];
  const filteredAreas = locationTyping.isTyping
    ? areas.filter(a => a.name.toLowerCase().includes(locationTyping.query))
    : [];

  const suggestions = [
    ...filteredTags.map(t => ({ type: 'tag' as const, value: t, label: `#${t}` })),
    ...filteredProjects.map(p => ({ type: 'project' as const, value: p.name, label: p.name, color: p.color })),
    ...filteredAreas.map(a => ({ type: 'area' as const, value: a.name, label: `@${a.name}` })),
  ];

  // Show create new tag option
  const canCreateTag = tagTyping.isTyping && tagTyping.query && !tags.includes(tagTyping.query);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    setShowDropdown(suggestions.length > 0 || !!canCreateTag);
    setSelectedIndex(0);
  }, [suggestions.length, canCreateTag]);

  useEffect(() => {
    onParsedChange?.(parsed);
  }, [value, onParsedChange]);

  const handleInsertTag = (tag: string) => {
    const newValue = insertTagIntoInput(value, tag);
    onChange(newValue);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleInsertLocation = (name: string) => {
    const newValue = insertLocationIntoInput(value, name);
    onChange(newValue);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (index: number) => {
    if (canCreateTag && index === suggestions.length) {
      // Create new tag
      handleInsertTag(tagTyping.query);
      return;
    }
    const suggestion = suggestions[index];
    if (!suggestion) return;
    
    if (suggestion.type === 'tag') {
      handleInsertTag(suggestion.value);
    } else {
      handleInsertLocation(suggestion.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + (canCreateTag ? 1 : 0);

    if (showDropdown && totalItems > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % totalItems);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + totalItems) % totalItems);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(selectedIndex);
        return;
      }
      if (e.key === 'Enter' && (tagTyping.isTyping || locationTyping.isTyping)) {
        e.preventDefault();
        handleSelectSuggestion(selectedIndex);
        return;
      }
    }

    if (e.key === 'Enter' && !tagTyping.isTyping && !locationTyping.isTyping) {
      e.preventDefault();
      onSubmit?.(parsed);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (showDropdown) {
        setShowDropdown(false);
      } else {
        onCancel?.();
      }
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay to allow click on dropdown
          setTimeout(() => setShowDropdown(false), 150);
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 ${className}`}
      />

      {/* Autocomplete Dropdown */}
      {showDropdown && (suggestions.length > 0 || canCreateTag) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.value}`}
              type="button"
              onClick={() => handleSelectSuggestion(index)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${
                index === selectedIndex
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {suggestion.type === 'tag' && (
                <span className="text-gray-400 dark:text-gray-500">#</span>
              )}
              {suggestion.type === 'project' && (
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: suggestion.color }}
                />
              )}
              {suggestion.type === 'area' && (
                <span className="text-gray-400 dark:text-gray-500">@</span>
              )}
              <span className="text-gray-900 dark:text-gray-100">{suggestion.value}</span>
              {index === selectedIndex && (
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Tab</span>
              )}
            </button>
          ))}
          {canCreateTag && (
            <button
              type="button"
              onClick={() => handleSelectSuggestion(suggestions.length)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${
                selectedIndex === suggestions.length
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="text-lg">+</span>
              <span className="text-gray-900 dark:text-gray-100">Create tag "#{tagTyping.query}"</span>
            </button>
          )}
        </div>
      )}

      {/* Preview badges */}
      {showPreview && value && !tagTyping.isTyping && !locationTyping.isTyping && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {resolvedProject && (
            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: resolvedProject.color }}
              />
              {resolvedProject.name}
            </span>
          )}
          {resolvedArea && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
              @{resolvedArea.name}
            </span>
          )}
          {parsed.tags.map(tag => (
            <span
              key={tag}
              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded"
            >
              #{tag}
            </span>
          ))}
          {parsed.scheduledDate && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(parsed.scheduledDate, 'EEE, MMM d')}
            </span>
          )}
          {parsed.deadline && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              Due {format(parsed.deadline, 'EEE, MMM d')}
            </span>
          )}
          {parsed.url && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="truncate max-w-[150px]">{parsed.url}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
