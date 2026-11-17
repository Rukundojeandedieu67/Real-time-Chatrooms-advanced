import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({
  message = 'Loading...',
  description = '',
  size = 'md',
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="relative flex items-center justify-center mb-3">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse" />
        <Loader2 className={`animate-spin text-blue-400 ${iconSizes[size] || iconSizes.md}`} />
      </div>
      <p className="text-sm font-medium text-slate-200">{message}</p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </div>
  );
};
