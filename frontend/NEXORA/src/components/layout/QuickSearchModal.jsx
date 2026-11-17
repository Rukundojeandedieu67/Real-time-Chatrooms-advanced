import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Search, MessageSquare, Compass, User, Hash, ArrowRight } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useRooms } from '../../context/RoomContext';
import { MOCK_USERS } from '../../mocks/users';
import { UserAvatar } from '../common/UserAvatar';

export const QuickSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { conversations, setActiveConversationId } = useChat();
  const { rooms } = useRooms();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const q = query.toLowerCase().trim();

  // Filter conversations
  const filteredConversations = q
    ? conversations.filter(c => c.title.toLowerCase().includes(q))
    : conversations.slice(0, 3);

  // Filter rooms
  const filteredRooms = q
    ? rooms.filter(r => r.name.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))
    : rooms.slice(0, 3);

  // Filter users
  const filteredUsers = q
    ? MOCK_USERS.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    : [];

  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    navigate('/chat');
    onClose();
  };

  const handleSelectRoom = (roomId) => {
    navigate(`/rooms/${roomId}`);
    onClose();
  };

  const handleSelectUser = (user) => {
    navigate('/chat');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" className="!p-4">
      <div className="space-y-4">
        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-blue-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search conversations, rooms, or members..."
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 py-3 pl-10 pr-4 text-sm"
          />
        </div>

        {/* Results Sections */}
        <div className="space-y-4 max-h-96 overflow-y-auto px-1">
          {/* Chatrooms */}
          {filteredRooms.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Chatrooms</span>
              </div>
              <div className="space-y-1">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleSelectRoom(room.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono text-sm shrink-0">
                        #
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                          {room.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">#{room.name} • {room.category}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Conversations */}
          {filteredConversations.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                <span>Conversations</span>
              </div>
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {conv.participant ? (
                        <UserAvatar
                          src={conv.participant.avatar}
                          name={conv.participant.name}
                          status={conv.participant.status}
                          size="xs"
                          showIndicator
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center text-xs">
                          {conv.avatar || '💬'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                          {conv.title}
                        </p>
                        {conv.lastMessage && (
                          <p className="text-[10px] text-slate-400 truncate">{conv.lastMessage.text}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          {filteredUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Members</span>
              </div>
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        src={user.avatar}
                        name={user.name}
                        status={user.status}
                        size="xs"
                        showIndicator
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">@{user.username} • {user.title}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-blue-400 group-hover:underline">Message</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q && filteredRooms.length === 0 && filteredConversations.length === 0 && filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400">No results found for "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
