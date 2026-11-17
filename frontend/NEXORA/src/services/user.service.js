/**
 * NEXORA USER & PROFILE SERVICE (MOCK IMPLEMENTATION)
 * 
 * NOTE FOR BACKEND INTEGRATION:
 * When integrating with Django REST framework:
 * - Replace mock calls with API endpoints:
 *   GET /api/v1/users/
 *   GET /api/v1/users/:id/
 *   PATCH /api/v1/users/me/
 *   PATCH /api/v1/users/me/presence/
 *   PATCH /api/v1/users/me/preferences/
 */

import { MOCK_USERS, MOCK_CURRENT_USER } from '../mocks/users';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

let currentUserStore = { ...MOCK_CURRENT_USER };
let usersStore = [...MOCK_USERS];

export const userService = {
  /**
   * Get all directory users
   */
  async getAllUsers() {
    await delay(120);
    return [...usersStore];
  },

  /**
   * Get user profile by ID or username
   */
  async getUser(idOrUsername) {
    await delay(120);
    if (idOrUsername === 'me' || idOrUsername === currentUserStore.id || idOrUsername === currentUserStore.username) {
      return { ...currentUserStore };
    }
    return usersStore.find(u => u.id === idOrUsername || u.username === idOrUsername) || null;
  },

  /**
   * Update current user profile
   */
  async updateProfile(updates) {
    await delay(250);
    currentUserStore = {
      ...currentUserStore,
      ...updates
    };

    // Update in usersStore
    usersStore = usersStore.map(u => u.id === currentUserStore.id ? currentUserStore : u);

    // Also sync demo cache
    localStorage.setItem('nexora_demo_user', JSON.stringify(currentUserStore));

    return { ...currentUserStore };
  },

  /**
   * Update presence status
   */
  async updatePresence(status, statusMessage = '') {
    await delay(100);
    currentUserStore = {
      ...currentUserStore,
      status,
      statusMessage: statusMessage || currentUserStore.statusMessage
    };

    usersStore = usersStore.map(u => u.id === currentUserStore.id ? currentUserStore : u);
    localStorage.setItem('nexora_demo_user', JSON.stringify(currentUserStore));

    return { ...currentUserStore };
  },

  /**
   * Update preferences
   */
  async updatePreferences(preferences) {
    await delay(180);
    currentUserStore = {
      ...currentUserStore,
      preferences: {
        ...currentUserStore.preferences,
        ...preferences
      }
    };

    localStorage.setItem('nexora_demo_user', JSON.stringify(currentUserStore));
    return { ...currentUserStore };
  }
};
