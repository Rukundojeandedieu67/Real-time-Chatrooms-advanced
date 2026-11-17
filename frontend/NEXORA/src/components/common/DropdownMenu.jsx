import React, { useState, useRef, useEffect } from 'react';

export const DropdownMenu = ({
  trigger,
  children,
  align = 'right',
  width = 'w-56',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignmentClasses = {
    right: 'right-0',
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className={`absolute ${alignmentClasses[align] || alignmentClasses.right} mt-2 ${width} glass-dropdown rounded-xl border border-white/10 shadow-2xl py-1.5 z-40 focus:outline-none animate-in fade-in duration-150 ${className}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};
