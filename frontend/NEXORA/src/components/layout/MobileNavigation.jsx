import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Compass,
  Bell,
  User,
  Settings
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export const MobileNavigation = () => {
  const { unreadCount } = useNotifications();

  const navItems = [
    { label: 'Dash', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Chat', path: '/chat', icon: MessageSquare },
    { label: 'Rooms', path: '/rooms', icon: Compass },
    { label: 'Alerts', path: '/notifications', icon: Bell, badge: unreadCount },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Config', path: '/settings', icon: Settings }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0e1017]/95 backdrop-blur-lg border-t border-[#1e2335] flex items-center justify-around px-2 z-40">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#0e1017]" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
