import { useState } from 'react';
import { OnlineIndicator } from './OnlineIndicator';

export const UserAvatar = ({
  src,
  name = '',
  status,
  size = 'md',
  className = '',
  showIndicator = false
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const indicatorSizes = {
    xs: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl'
  };

  // Generate 2 initials
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'NX';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}>
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full ring-1 ring-white/10"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-medium ring-1 ring-white/15 select-none">
          {initials}
        </div>
      )}

      {showIndicator && status && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator status={status} size={indicatorSizes[size] || 'md'} />
        </div>
      )}
    </div>
  );
};
