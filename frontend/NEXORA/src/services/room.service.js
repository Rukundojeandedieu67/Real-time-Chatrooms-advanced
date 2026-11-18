import { apiClient, fetchPages } from './api.client';
import { toMember, toRoom } from './map';

async function loadScope(scope) {
  const rows = await fetchPages(`/rooms?scope=${scope}`);
  return rows.map(toRoom);
}

export const roomService = {
  async getRooms({ search = '', filter = 'all' } = {}) {
    let rooms;
    if (filter === 'joined') {
      rooms = await loadScope('mine');
    } else if (filter === 'public') {
      rooms = await loadScope('public');
    } else if (filter === 'private') {
      rooms = (await loadScope('mine')).filter((room) => room.isPrivate);
    } else {
      const [mine, publicRooms] = await Promise.all([loadScope('mine'), loadScope('public')]);
      const byId = new Map();
      [...publicRooms, ...mine].forEach((room) => byId.set(room.id, room));
      rooms = [...byId.values()];
    }

    const query = search.trim().toLowerCase();
    if (!query) return rooms;
    return rooms.filter(
      (room) =>
        room.name.toLowerCase().includes(query) ||
        room.description.toLowerCase().includes(query)
    );
  },

  async getRoom(id) {
    const room = await apiClient(`/rooms/${id}`);
    return toRoom(room);
  },

  async joinRoom(roomId) {
    await apiClient(`/rooms/${roomId}/join`, { method: 'POST' });
    return this.getRoom(roomId);
  },

  async leaveRoom(roomId) {
    await apiClient(`/rooms/${roomId}/leave`, { method: 'POST' });
    try {
      return await this.getRoom(roomId);
    } catch {
      return { id: roomId, isJoined: false };
    }
  },

  async createRoom({ name, description = '', isPrivate = false }) {
    const room = await apiClient('/rooms', {
      method: 'POST',
      body: {
        name: name.trim(),
        description: description.trim(),
        is_private: Boolean(isPrivate),
      },
    });
    return toRoom(room);
  },

  async updateRoom(roomId, updates) {
    const body = {};
    if (updates.name || updates.title) body.name = (updates.name || updates.title).trim();
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.isPrivate !== undefined) body.is_private = updates.isPrivate;
    if (updates.is_private !== undefined) body.is_private = updates.is_private;
    if (updates.max_members !== undefined) body.max_members = updates.max_members;
    const room = await apiClient(`/rooms/${roomId}`, { method: 'PATCH', body });
    return toRoom(room);
  },

  async getRoomMembers(roomId) {
    const rows = await fetchPages(`/rooms/${roomId}/members`);
    return rows.map(toMember);
  },

  async updateMemberRole(roomId, userId, role) {
    const row = await apiClient(`/rooms/${roomId}/members/${userId}`, {
      method: 'PATCH',
      body: { role },
    });
    return toMember(row);
  },

  async removeMember(roomId, userId) {
    await apiClient(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' });
  },

  async createInvite(roomId) {
    return apiClient(`/rooms/${roomId}/invites`, {
      method: 'POST',
      body: { max_uses: 10, expires_in_hours: 168 },
    });
  },

  async acceptInvite(code) {
    return apiClient(`/invites/${encodeURIComponent(code.trim())}/accept`, { method: 'POST' });
  },

  async uploadAvatar(roomId, file) {
    const form = new FormData();
    form.append('file', file);
    const room = await apiClient(`/rooms/${roomId}/avatar`, { method: 'PUT', form });
    return toRoom(room);
  },

  async getPresence(roomId) {
    const data = await apiClient(`/rooms/${roomId}/presence`);
    return data.results || [];
  },

  async getStats(roomId) {
    return apiClient(`/rooms/${roomId}/stats`);
  },
};
