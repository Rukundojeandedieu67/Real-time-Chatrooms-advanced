import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Search } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

export const ConversationSearchModal = ({
  isOpen,
  onClose,
  messages = [],
  conversationTitle = 'Conversation'
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const q = searchTerm.toLowerCase().trim();
  const results = q ? messages.filter((m) => m.text?.toLowerCase().includes(q)) : [];

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Search in ${conversationTitle}`}
      subtitle="Find prior discussions, links, and code snippets"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type keywords to filter message history..."
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {q && results.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">
              No messages found containing "{searchTerm}".
            </p>
          )}

          {!q && (
            <p className="text-xs text-slate-400 text-center py-6">
              Enter a search phrase to locate specific statements.
            </p>
          )}

          {results.map((msg) => (
            <div
              key={msg.id}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <UserAvatar src={msg.senderAvatar} name={msg.senderName} size="xs" />
                  <span className="text-xs font-semibold text-white">{msg.senderName}</span>
                </div>
                <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{msg.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
