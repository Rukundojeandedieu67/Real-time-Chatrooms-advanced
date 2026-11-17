import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Compass,
  Bell,
  User,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Sparkles,
  Plus,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useRooms } from '../../context/RoomContext';
import { UserAvatar } from '../common/UserAvatar';
import { Modal } from '../common/Modal';

export const AppSidebar = ({ onOpenCreateRoom }) => {
  const { user, logout, updatePresence } = useAuth();
  const { unreadCount } = useNotifications();
  const { rooms } = useRooms();
  const navigate = useNavigate();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const joinedRooms = rooms.filter(r => r.isJoined).slice(0, 5);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Direct Messages', path: '/chat', icon: MessageSquare },
    { label: 'Chatrooms', path: '/rooms', icon: Compass },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { label: 'My Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  const handleStatusChange = (status) => {
    updatePresence(status);
    setShowStatusMenu(false);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };

  return (
    <>
      <aside className="w-64 h-screen bg-[#0e1017] border-r border-[#1e2335] flex flex-col shrink-0 select-none hidden md:flex">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1e2335] flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white tracking-wider text-base">NEXORA</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Connect beyond boundaries</p>
            </div>
          </NavLink>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Overview
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Joined Rooms List */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Joined Rooms
              </span>
              <button
                onClick={onOpenCreateRoom}
                className="text-slate-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-white/5"
                title="Create Room"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {joinedRooms.map((room) => (
              <NavLink
                key={room.id}
                to={`/rooms/${room.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                <span className="text-slate-400 font-mono text-sm">#</span>
                <span className="truncate">{room.name}</span>
                {room.isPrivate && (
                  <span className="ml-auto text-[10px] text-amber-400/80">🔒</span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Quick Mock Notice */}
          <div className="px-3">
            <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300/80 leading-relaxed">
              <p className="font-semibold text-blue-300 mb-0.5">Frontend Preview</p>
              Simulating state locally with mock services. Ready for Django REST + WebSocket integration.
            </div>
          </div>
        </div>

        {/* User Footer Profile & Status */}
        <div className="p-3 border-t border-[#1e2335] relative">
          {showStatusMenu && (
            <div className="absolute bottom-20 left-3 right-3 glass-dropdown rounded-xl border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Set Presence
              </div>
              <button
                onClick={() => handleStatusChange('online')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                <span>Online</span>
              </button>
              <button
                onClick={() => handleStatusChange('away')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span>Away</span>
              </button>
              <button
                onClick={() => handleStatusChange('busy')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <span>Do Not Disturb</span>
              </button>
              <button
                onClick={() => handleStatusChange('offline')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>Invisible / Offline</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-3 text-left min-w-0 flex-1"
            >
              <UserAvatar
                src={user?.avatar}
                name={user?.name}
                status={user?.status}
                size="sm"
                showIndicator
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">@{user?.username}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out of NEXORA"
        subtitle="Are you sure you want to end your current session?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            You will be returned to the login portal. Your local simulated session data will be preserved for quick re-login.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all"
            >
              Confirm Logout
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
