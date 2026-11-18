import { useState } from 'react';
import { UserAvatar } from '../common/UserAvatar';
import { Shield, Crown, Search } from 'lucide-react';

export const MemberList = ({
  members = [],
  ownerId,
  title = 'Channel Members',
  myRole,
  currentUserId,
  onChangeRole,
  onRemove,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredMembers = members.filter((member) =>
    (member.name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (member.username || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

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
              {myRole === 'owner' && member.id !== currentUserId && member.role !== 'owner' && (
                <div className="flex items-center gap-1">
                  <select
                    value={member.role}
                    onChange={(event) => onChangeRole?.(member.id, event.target.value)}
                    className="bg-[#121522] border border-[#24293d] rounded-lg text-[10px] text-slate-200 py-1 px-1"
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemove?.(member.id)}
                    className="text-[10px] text-rose-400 px-1"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
