import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Compass,
  Bell,
  Users,
  Sparkles,
  ArrowRight,
  Shield,
  Activity,
  Plus,
  Zap,
  Globe,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useRooms } from '../../context/RoomContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserAvatar } from '../../components/common/UserAvatar';
import { MOCK_USERS } from '../../mocks/users';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { conversations, setActiveConversationId } = useChat();
  const { rooms } = useRooms();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();

  const onlineUsers = MOCK_USERS.filter((u) => u.status === 'online' && u.id !== user?.id);
  const featuredRooms = rooms.slice(0, 3);
  const recentDMs = conversations.slice(0, 4);

  const handleOpenChat = (convId) => {
    setActiveConversationId(convId);
    navigate('/chat');
  };

  const handleOpenRoom = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-violet-900/40 border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>NEXORA Network Online • Real-time Node</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Alex'}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Connect beyond boundaries. Access technical discourse channels, coordinate with researchers, and stream messages via low-latency simulated endpoints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Messages</span>
            </button>
            <button
              onClick={() => navigate('/rooms')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all active:scale-95"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Chatrooms</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#121522]/60 border border-[#23293e] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Joined Rooms</span>
            <p className="text-xl font-bold text-white">{user?.stats?.roomsJoined || 8}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121522]/60 border border-[#23293e] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Messages Sent</span>
            <p className="text-xl font-bold text-white">{user?.stats?.messagesSent || 1420}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121522]/60 border border-[#23293e] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Online Peers</span>
            <p className="text-xl font-bold text-white">{onlineUsers.length + 1}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121522]/60 border border-[#23293e] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Unread Alerts</span>
            <p className="text-xl font-bold text-white">{unreadCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Conversations & Online Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Direct Messages */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Recent Conversations
              </h2>
            </div>
            <button
              onClick={() => navigate('/chat')}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              View All Messages →
            </button>
          </div>

          <div className="space-y-2">
            {recentDMs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleOpenChat(conv.id)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#121522]/60 hover:bg-[#161a29] border border-[#23293e] hover:border-blue-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {conv.participant ? (
                    <UserAvatar
                      src={conv.participant.avatar}
                      name={conv.participant.name}
                      status={conv.participant.status}
                      size="md"
                      showIndicator
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center text-base font-bold">
                      {conv.avatar || '💬'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                        {conv.title}
                      </h3>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          {conv.unreadCount} new
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {conv.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
              </div>
            ))}
          </div>

          {/* Featured Chatrooms */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Trending Chatrooms
                </h2>
              </div>
              <button
                onClick={() => navigate('/rooms')}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Browse All Rooms →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {featuredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleOpenRoom(room.id)}
                  className="p-4 rounded-2xl bg-[#121522]/60 hover:bg-[#161a29] border border-[#23293e] hover:border-violet-500/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{room.avatar || '💬'}</span>
                      <span className="text-[10px] font-mono font-medium text-slate-400">
                        {room.memberCount} members
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">#{room.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {room.description}
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-violet-400 mt-3 block">
                    Enter Channel →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Online Network Users & Quick Profile Summary */}
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="p-5 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={user?.avatar}
                name={user?.name}
                status={user?.status}
                size="lg"
                showIndicator
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{user?.name}</h3>
                <p className="text-xs text-blue-400 truncate">@{user?.username}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
              "{user?.bio || 'Building resilient decentralized communication protocols.'}"
            </p>

            <button
              onClick={() => navigate('/profile')}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all text-center"
            >
              Edit Identity & Privacy Settings
            </button>
          </div>

          {/* Active Online Network Peers */}
          <div className="p-5 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Online Peers ({onlineUsers.length})
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {onlineUsers.map((peer) => (
                <div
                  key={peer.id}
                  onClick={() => handleOpenChat('conv_dm_001')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      src={peer.avatar}
                      name={peer.name}
                      status={peer.status}
                      size="xs"
                      showIndicator
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                        {peer.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{peer.title}</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Chat
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
