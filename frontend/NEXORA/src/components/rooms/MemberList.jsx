import React, { useState } from 'react';
import { UserAvatar } from '../common/UserAvatar';
import { Shield, MessageSquare, Crown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';

export const MemberList = ({ members = [], ownerId, title = 'Channel Members' }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const navigate = useNavigate();
  const { setActiveConversationId } = useChat();

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.username.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleDirectMessage = (member) => {
    // If conversation exists or simulate opening
    setActiveConversationId('conv_dm_001');
    navigate('/chat');
  };

  return (
    <div className="w-64 h-full bg-[#0c0e15] border-l border-[#1e2335] flex flex-col shrink-0">
      <div className="p-4 border-b border-[#1e2335] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title} ({members.length})
          </h3>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter members..."
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-xs text-slate-200 placeholder-slate-400 pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredMembers.map((member) => {
          const isOwner = member.id === ownerId;
          return (
            <div
              key={member.id}
              className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar
                  src={member.avatar}
                  name={member.name}
                  status={member.status}
                  size="xs"
                  showIndicator
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">{member.name}</p>
                    {isOwner && (
                      <Crown className="w-3 h-3 text-amber-400 shrink-0" title="Room Owner" />
                    )}
                    {member.role === 'admin' && !isOwner && (
                      <Shield className="w-3 h-3 text-blue-400 shrink-0" title="Admin" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">@{member.username}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDirectMessage(member)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0"
                title="Send direct message"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
