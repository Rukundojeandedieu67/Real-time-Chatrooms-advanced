import React, { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { useAuth } from '../../context/AuthContext';

export const ReactionBar = ({ reactions = [], onToggleReaction, className = '' }) => {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);

  if (!reactions || reactions.length === 0) {
    return null;
  }

  return (
    <div className={`relative flex flex-wrap items-center gap-1.5 mt-1.5 ${className}`}>
      {reactions.map((r) => {
        const hasReacted = user && r.users?.includes(user.id);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onToggleReaction(r.emoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
              hasReacted
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="font-semibold text-[11px]">{r.count}</span>
          </button>
        );
      })}

      {/* Quick Add Reaction Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          title="Add reaction"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>

        {showPicker && (
          <div className="absolute left-0 bottom-7 z-30">
            <EmojiPicker
              onSelect={(emoji) => {
                onToggleReaction(emoji);
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
