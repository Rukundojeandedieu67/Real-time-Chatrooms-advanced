
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
          {icon}
        </div>
      )}
      {title && <h4 className="text-base font-semibold text-white mb-1.5">{title}</h4>}
      {description && <p className="text-xs text-slate-400 leading-relaxed mb-4">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
