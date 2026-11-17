import { Pin } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

export const ConversationItem = ({
  conversation,
  isActive = false,
  onClick
}) => {
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
        isActive
          ? 'bg-blue-600/15 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] text-white'
          : 'bg-[#121522]/40 hover:bg-[#161a29] border-transparent hover:border-white/5 text-slate-300'
      }`}
    >
      {/* Avatar */}
      {conversation.participant ? (
        <UserAvatar
          src={conversation.participant.avatar}
          name={conversation.participant.name}
          status={conversation.participant.status}
          size="md"
          showIndicator
        />
      ) : (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-base font-semibold shadow-sm shrink-0">
          {conversation.avatar || '⚡'}
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <h3 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
              {conversation.title}
            </h3>
            {conversation.pinned && (
              <Pin className="w-2.5 h-2.5 text-amber-400 rotate-45 shrink-0" />
            )}
          </div>
          {conversation.lastMessage && (
            <span className="text-[10px] text-slate-400 shrink-0 ml-1">
              {formatTime(conversation.lastMessage.timestamp)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400 truncate">
            {conversation.isTyping ? (
              <span className="text-blue-400 italic font-medium">typing...</span>
            ) : (
              conversation.lastMessage?.text || 'Start conversation...'
            )}
          </p>

          {conversation.unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 shadow-sm">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
