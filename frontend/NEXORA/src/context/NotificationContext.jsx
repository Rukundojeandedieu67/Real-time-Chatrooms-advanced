import { createContext, useContext, useState, useEffect } from 'react';
import { notificationService } from '../services/notification.service';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    notificationService
      .getNotifications()
      .then(async (data) => {
        if (!active) return;
        setNotifications(data);
        const count = await notificationService.getUnreadCount();
        if (!active) return;
        setUnreadCount(count);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load notifications', err);
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshNotifications = async () => {
    const data = await notificationService.getNotifications();
    setNotifications(data);
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
    setLoaded(true);
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      addToast({
        type: 'info',
        title: 'Notifications Cleared',
        message: 'All notifications marked as read.'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading: !loaded,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
