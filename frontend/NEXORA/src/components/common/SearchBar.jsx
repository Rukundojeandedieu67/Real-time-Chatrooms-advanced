import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search messages, rooms or members...',
  shortcut = '⌘K',
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-3.5 text-sm',
    lg: 'py-2.5 px-4 text-base'
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-all pl-9 pr-14 ${sizeClasses[size] || sizeClasses.md}`}
      />
      <div className="absolute right-2.5 flex items-center gap-1.5">
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          shortcut && (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white/5 border border-white/10 rounded">
              {shortcut}
            </kbd>
          )
        )}
      </div>
    </div>
  );
};
