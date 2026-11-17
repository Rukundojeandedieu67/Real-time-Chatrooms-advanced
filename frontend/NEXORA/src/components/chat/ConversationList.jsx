import React, { useState } from 'react';
import { SearchBar } from '../common/SearchBar';
import { ConversationItem } from './ConversationItem';
import { MessageSquarePlus, Users, MessageSquare } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

export const ConversationList = ({
  conversations = [],
  activeId,
  onSelectConversation,
  onNewConversation
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'direct' | 'group'

  const filtered = conversations.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'direct') return c.type === 'direct';
    if (filter === 'group') return c.type === 'group';
    return true;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col border-r border-[#1e2335] bg-[#0c0e15] shrink-0">
      {/* List Header */}
      <div className="p-4 border-b border-[#1e2335] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">Messages</h2>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-slate-300">
              {conversations.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onNewConversation}
            className="p-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-colors"
            title="Start new conversation"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Filter conversations..."
          size="sm"
        />

        {/* Category Tabs */}
        <div className="flex p-0.5 rounded-xl bg-[#141724] border border-[#24293d]">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('direct')}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
              filter === 'direct'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct
          </button>
          <button
            type="button"
            onClick={() => setFilter('group')}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
              filter === 'group'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Groups
          </button>
        </div>
      </div>

      {/* Conversation Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-5 h-5 text-slate-400" />}
            title="No conversations found"
            description={search ? `No matches for "${search}".` : 'Start a new conversation to connect.'}
          />
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onClick={() => onSelectConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
