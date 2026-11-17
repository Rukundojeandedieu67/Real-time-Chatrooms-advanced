
export const OnlineIndicator = ({ status = 'online', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-[1.5px]',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2'
  };

  const statusColors = {
    online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
    away: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    busy: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    offline: 'bg-slate-500'
  };

  return (
    <span
      title={`Status: ${status}`}
      className={`inline-block rounded-full border-[#0a0b10] shrink-0 transition-colors ${sizeClasses[size] || sizeClasses.md} ${statusColors[status] || statusColors.offline} ${className}`}
    />
  );
};
