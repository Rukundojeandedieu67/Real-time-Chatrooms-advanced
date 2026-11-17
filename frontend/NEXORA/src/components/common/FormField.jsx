import React from 'react';

export const FormField = ({
  label,
  error,
  helperText,
  required = false,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-300">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-400 font-medium flex items-center gap-1">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};
