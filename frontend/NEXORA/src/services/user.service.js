import { apiClient, fetchPages } from './api.client';
import { toProfile } from './map';

const PREFS_KEY = 'nexora_preferences';

function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

export const userService = {
  async searchUsers(search) {
    if (!search?.trim()) return [];
    const rows = await fetchPages(`/users?search=${encodeURIComponent(search.trim())}`);
    return rows.map((row) => toProfile(row));
  },

  async getUser(id) {
    const profile = await apiClient(`/users/${id}`);
    return toProfile(profile);
  },

  async updateProfile(updates) {
    const body = {};
    const displayName = updates.display_name || updates.name;
    if (displayName) body.display_name = displayName;
    if (updates.bio !== undefined) body.bio = updates.bio;
    if (updates.status) body.status = updates.status === 'busy' ? 'away' : updates.status;
    const profile = await apiClient('/users/me', { method: 'PATCH', body });
    return { ...toProfile(profile), preferences: readPreferences() };
  },

  async updatePresence(status) {
    const safe = status === 'away' || status === 'offline' ? status : 'online';
    return this.updateProfile({ status: safe });
  },

  async updatePreferences(preferences) {
    const next = { ...readPreferences(), ...preferences };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    const profile = await apiClient('/users/me');
    return { ...toProfile(profile), preferences: next };
  },

  async uploadAvatar(file) {
    const form = new FormData();
    form.append('file', file);
    const profile = await apiClient('/users/me/avatar', { method: 'PUT', form });
    return { ...toProfile(profile), preferences: readPreferences() };
  },

  async getRoomActivity() {
    return fetchPages('/analytics/messages-per-room');
  },
};
