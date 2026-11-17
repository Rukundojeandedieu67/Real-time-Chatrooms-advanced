/**
 * NEXORA NOTIFICATION SERVICE (MOCK IMPLEMENTATION)
 * 
 * NOTE FOR BACKEND INTEGRATION:
 * When integrating with Django REST framework:
 * - Replace mock stores with API endpoints:
 *   GET /api/v1/notifications/
 *   PATCH /api/v1/notifications/:id/read/
 *   POST /api/v1/notifications/mark-all-read/
 *   DELETE /api/v1/notifications/:id/
 */

import { MOCK_NOTIFICATIONS } from '../mocks/notifications';

const delay = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

let notificationsStore = [...MOCK_NOTIFICATIONS];

export const notificationService = {
  /**
   * Fetch all notifications
   */
  async getNotifications() {
    await delay(120);
    return [...notificationsStore];
  },

  /**
   * Mark a specific notification as read
   */
  async markAsRead(id) {
    await delay(100);
    notificationsStore = notificationsStore.map(n => n.id === id ? { ...n, read: true } : n);
    return notificationsStore.find(n => n.id === id);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    await delay(150);
    notificationsStore = notificationsStore.map(n => ({ ...n, read: true }));
    return [...notificationsStore];
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id) {
    await delay(100);
    notificationsStore = notificationsStore.filter(n => n.id !== id);
    return true;
  },

  /**
   * Get total unread count
   */
  async getUnreadCount() {
    await delay(80);
    return notificationsStore.filter(n => !n.read).length;
  }
};
