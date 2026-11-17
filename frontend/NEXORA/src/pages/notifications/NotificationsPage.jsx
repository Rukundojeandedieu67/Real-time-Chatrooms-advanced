import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { EmptyState } from '../../components/common/EmptyState';

export const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const [filterType, setFilterType] = useState('all'); // 'all' | 'mention' | 'reaction' | 'system'

  const filtered = notifications.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Notifications Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2335]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Real-time mentions, peer reactions, system alerts, and vault invitations.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: 'All Alerts', value: 'all' },
          { label: 'Mentions (@)', value: 'mention' },
          { label: 'Reactions (❤️)', value: 'reaction' },
          { label: 'Security & System', value: 'system' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              filterType === tab.value
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                : 'bg-[#121522] text-slate-400 hover:text-slate-200 border-[#24293d]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Feed */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-7 h-7 text-slate-400" />}
            title="No notifications in this view"
            description="You are completely up to date with activity across all connected chatrooms and direct channels."
          />
        ) : (
          filtered.map((item) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>
    </div>
  );
};
