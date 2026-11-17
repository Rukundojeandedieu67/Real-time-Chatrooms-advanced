import { useState } from 'react';
import { Search, Bell, Plus, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';

export const TopBar = ({ title, subtitle, onOpenCreateRoom, onOpenSearch }) => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { user } = useAuth();
  const [showNotifPreview, setShowNotifPreview] = useState(false);

  const recentNotifs = notifications.slice(0, 4);

  return (
    <header className="h-16 px-6 bg-[#0e1017]/80 backdrop-blur-md border-b border-[#1e2335] flex items-center justify-between shrink-0 z-30 sticky top-0">
      {/* Title & Context */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121522] border border-[#24293d] hover:border-blue-500/50 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-sm group"
        >
          <Search className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 rounded border border-white/10">
            ⌘K
          </kbd>
        </button>

        {/* Quick Action / Create Room Button */}
        <button
          onClick={onOpenCreateRoom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create Room</span>
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifPreview(!showNotifPreview)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#0e1017] animate-pulse" />
            )}
          </button>

          {showNotifPreview && (
            <div
              className="absolute right-0 mt-2 w-80 glass-dropdown rounded-2xl border border-white/10 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications
                </span>
                <NavLink
                  to="/notifications"
                  onClick={() => setShowNotifPreview(false)}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  View All
                </NavLink>
              </div>

              <div className="space-y-1 max-h-72 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications</p>
                ) : (
                  recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        setShowNotifPreview(false);
                      }}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        n.read ? 'hover:bg-white/5 text-slate-400' : 'bg-blue-950/20 text-slate-200 border border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.actor ? (
                          <UserAvatar src={n.actor.avatar} name={n.actor.name} size="xs" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">
                            <Shield className="w-3 h-3" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                          <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Link */}
        <NavLink to="/profile" className="p-0.5 rounded-full hover:ring-2 hover:ring-blue-500/50 transition-all">
          <UserAvatar src={user?.avatar} name={user?.name} size="sm" status={user?.status} showIndicator />
        </NavLink>
      </div>
    </header>
  );
};
