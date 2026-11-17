import React from 'react';
import { Search, Phone, Video, Info, Pin, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useToast } from '../../context/ToastContext';

export const ChatHeader = ({
  conversation,
  onOpenSearch,
  onToggleInfo,
  showInfo
}) => {
  const { addToast } = useToast();

  const handleSimulateCall = (type) => {
    addToast({
      type: 'info',
      title: `${type === 'video' ? 'Video' : 'Voice'} Call Simulated`,
      message: `Establishing encrypted WebRTC channel with ${conversation?.title || 'contact'}... (Simulation Mode)`
    });
  };

  if (!conversation) return null;

  return (
    <div className="h-16 px-4 sm:px-6 bg-[#0e1017]/90 backdrop-blur-md border-b border-[#1e2335] flex items-center justify-between shrink-0">
      {/* Contact / Group Info */}
      <div className="flex items-center gap-3 min-w-0">
        {conversation.participant ? (
          <UserAvatar
            src={conversation.participant.avatar}
            name={conversation.participant.name}
            status={conversation.participant.status}
            size="md"
            showIndicator
          />
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-base shadow-sm font-semibold">
            {conversation.avatar || '⚡'}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white truncate">{conversation.title}</h2>
            {conversation.pinned && (
              <Pin className="w-3 h-3 text-amber-400 rotate-45 shrink-0" />
            )}
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="w-2.5 h-2.5" />
              E2EE
            </span>
          </div>

          <p className="text-[11px] text-slate-400 truncate">
            {conversation.type === 'direct' && conversation.participant ? (
              conversation.participant.statusMessage || `Status: ${conversation.participant.status}`
            ) : (
              `${conversation.memberCount || 4} members active in this channel`
            )}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Search in conversation"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => handleSimulateCall('voice')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors hidden sm:flex"
          title="Voice call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => handleSimulateCall('video')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors hidden sm:flex"
          title="Video call"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleInfo}
          className={`p-2 rounded-xl transition-colors ${
            showInfo ? 'text-blue-400 bg-blue-500/15' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Toggle Details"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
