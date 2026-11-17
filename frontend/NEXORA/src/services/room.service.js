/**
 * NEXORA ROOM SERVICE (MOCK IMPLEMENTATION)
 * 
 * NOTE FOR BACKEND INTEGRATION:
 * When integrating with Django REST framework:
 * - Replace mock store with API endpoints:
 *   GET /api/v1/rooms/
 *   POST /api/v1/rooms/
 *   GET /api/v1/rooms/:id/
 *   PATCH /api/v1/rooms/:id/
 *   POST /api/v1/rooms/:id/join/
 *   POST /api/v1/rooms/:id/leave/
 *   GET /api/v1/rooms/:id/members/
 */

import { MOCK_ROOMS } from '../mocks/rooms';
import { MOCK_USERS, MOCK_CURRENT_USER } from '../mocks/users';

const delay = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms));

let roomsStore = [...MOCK_ROOMS];

export const roomService = {
  /**
   * Fetch all rooms with optional filtering
   */
  async getRooms({ category = 'All', search = '', filter = 'all' } = {}) {
    await delay(160);
    let results = [...roomsStore];

    if (category && category !== 'All') {
      results = results.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }

    if (filter === 'joined') {
      results = results.filter(r => r.isJoined);
    } else if (filter === 'public') {
      results = results.filter(r => !r.isPrivate);
    } else if (filter === 'private') {
      results = results.filter(r => r.isPrivate);
    }

    return results;
  },

  /**
   * Get single room details
   */
  async getRoom(id) {
    await delay(120);
    return roomsStore.find(r => r.id === id || r.name === id) || null;
  },

  /**
   * Join a room
   */
  async joinRoom(roomId, userId = MOCK_CURRENT_USER.id) {
    await delay(200);
    let updated = null;
    roomsStore = roomsStore.map(room => {
      if (room.id === roomId) {
        const members = Array.from(new Set([...room.members, userId]));
        updated = {
          ...room,
          isJoined: true,
          members,
          memberCount: members.length
        };
        return updated;
      }
      return room;
    });
    return updated;
  },

  /**
   * Leave a room
   */
  async leaveRoom(roomId, userId = MOCK_CURRENT_USER.id) {
    await delay(200);
    let updated = null;
    roomsStore = roomsStore.map(room => {
      if (room.id === roomId) {
        const members = room.members.filter(m => m !== userId);
        updated = {
          ...room,
          isJoined: false,
          members,
          memberCount: Math.max(0, members.length)
        };
        return updated;
      }
      return room;
    });
    return updated;
  },

  /**
   * Create a new room
   */
  async createRoom({ name, title, category, description, isPrivate = false, topic = '', rules = [] }) {
    await delay(300);

    const formattedName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const newRoom = {
      id: `room_${Date.now()}`,
      name: formattedName,
      title: title || formattedName,
      category: category || 'General Lounge',
      description,
      isPrivate,
      memberCount: 1,
      members: [MOCK_CURRENT_USER.id],
      ownerId: MOCK_CURRENT_USER.id,
      avatar: isPrivate ? '🔒' : '💬',
      bannerGradient: 'from-blue-600/30 to-indigo-600/30',
      createdAt: new Date().toISOString(),
      isJoined: true,
      topic: topic || 'Welcome to the room!',
      rules: rules.length ? rules : ['Be respectful to all participants.'],
      lastActivity: 'Just now'
    };

    roomsStore = [newRoom, ...roomsStore];
    return newRoom;
  },

  /**
   * Update room settings
   */
  async updateRoom(roomId, updates) {
    await delay(200);
    let updated = null;
    roomsStore = roomsStore.map(room => {
      if (room.id === roomId) {
        updated = { ...room, ...updates };
        return updated;
      }
      return room;
    });
    return updated;
  },

  /**
   * Get members of a room
   */
  async getRoomMembers(roomId) {
    await delay(120);
    const room = roomsStore.find(r => r.id === roomId);
    if (!room) return [];

    return MOCK_USERS.filter(u => room.members.includes(u.id));
  }
};
