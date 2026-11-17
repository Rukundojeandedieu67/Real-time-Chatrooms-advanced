import React from 'react';

const COMMON_EMOJIS = [
  '👍', '❤️', '🔥', '🚀', '💡', '🎉',
  '😂', '👀', '👏', '💯', '⚡', '🛡️',
  '✨', '🧠', '☕', '🤖', '🔒', '🎯'
];

export const EmojiPicker = ({ onSelect, onClose }) => {
  return (
    <div className="p-2 glass-dropdown rounded-2xl border border-white/10 shadow-2xl w-64 animate-in fade-in zoom-in-95">
      <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 mb-1 border-b border-white/10">
        Reactions & Emojis
      </div>
      <div className="grid grid-cols-6 gap-1 p-1">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji);
              if (onClose) onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-white/10 active:scale-90 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
