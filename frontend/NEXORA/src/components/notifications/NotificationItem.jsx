import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, Heart, UserPlus, ShieldAlert, Check, Trash2, ArrowRight } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

export const NotificationItem = ({ notification, onMarkRead, onDelete }) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.type) {
      case 'mention':
        return <AtSign className="w-3.5 h-3.5 text-blue-400" />;
      case 'reaction':
        return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case 'invite':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'system':
      default:
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (notification.targetLink) {
      navigate(notification.targetLink);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-start justify-between gap-3 p-4 rounded-2xl cursor-pointer transition-all border ${
        notification.read
          ? 'bg-[#121522]/30 hover:bg-[#161a29] border-transparent hover:border-white/5 text-slate-300'
          : 'bg-blue-950/20 hover:bg-blue-950/30 border-blue-500/20 text-white shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="relative shrink-0">
          {notification.actor ? (
            <UserAvatar src={notification.actor.avatar} name={notification.actor.name} size="sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#0a0b10]">
            {getIcon()}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-xs font-bold text-white truncate">{notification.title}</h4>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{notification.message}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">{notification.timestamp}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notification.read && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Delete notification"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="p-1.5 text-slate-400">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
