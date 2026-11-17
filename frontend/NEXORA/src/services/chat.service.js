/**
 * NEXORA CHAT & MESSAGING SERVICE (MOCK IMPLEMENTATION)
 * 
 * NOTE FOR BACKEND INTEGRATION:
 * When integrating with Django REST framework and Supabase Realtime / WebSockets:
 * - Replace mock arrays with API endpoints:
 *   GET /api/v1/conversations/
 *   GET /api/v1/conversations/:id/messages/
 *   POST /api/v1/conversations/:id/messages/
 *   PATCH /api/v1/messages/:id/
 *   DELETE /api/v1/messages/:id/
 *   POST /api/v1/messages/:id/reactions/
 * - Connect incoming message listener via WebSocket or Supabase Realtime channel
 */

import { MOCK_CONVERSATIONS } from '../mocks/conversations';
import { INITIAL_MESSAGES } from '../mocks/messages';
import { MOCK_CURRENT_USER } from '../mocks/users';

const delay = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory message store for local reactive simulation
let messagesStore = { ...INITIAL_MESSAGES };
let conversationsStore = [...MOCK_CONVERSATIONS];

export const chatService = {
  /**
   * Fetch all active conversations
   */
  async getConversations() {
    await delay(150);
    return [...conversationsStore];
  },

  /**
   * Get single conversation details
   */
  async getConversation(id) {
    await delay(100);
    return conversationsStore.find(c => c.id === id) || null;
  },

  /**
   * Get messages for a conversation or room
   */
  async getMessages(conversationId) {
    await delay(150);
    return messagesStore[conversationId] ? [...messagesStore[conversationId]] : [];
  },

  /**
   * Send a new message
   */
  async sendMessage({ conversationId, text, attachments = [], replyTo = null, sender = MOCK_CURRENT_USER }) {
    await delay(200);

    const newMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      text,
      timestamp: new Date().toISOString(),
      status: 'sent',
      reactions: [],
      attachments,
      replyTo,
      edited: false
    };

    if (!messagesStore[conversationId]) {
      messagesStore[conversationId] = [];
    }

    messagesStore[conversationId] = [...messagesStore[conversationId], newMessage];

    // Update conversation lastMessage preview
    conversationsStore = conversationsStore.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: {
            id: newMessage.id,
            senderId: sender.id,
            text: newMessage.text || (attachments.length ? `[Attachment: ${attachments[0].name}]` : ''),
            timestamp: newMessage.timestamp,
            read: true
          }
        };
      }
      return c;
    });

    return newMessage;
  },

  /**
   * Edit an existing message
   */
  async editMessage({ conversationId, messageId, newText }) {
    await delay(150);
    if (!messagesStore[conversationId]) return null;

    let updatedMsg = null;
    messagesStore[conversationId] = messagesStore[conversationId].map(msg => {
      if (msg.id === messageId) {
        updatedMsg = { ...msg, text: newText, edited: true };
        return updatedMsg;
      }
      return msg;
    });

    return updatedMsg;
  },

  /**
   * Delete a message
   */
  async deleteMessage({ conversationId, messageId }) {
    await delay(150);
    if (!messagesStore[conversationId]) return false;

    messagesStore[conversationId] = messagesStore[conversationId].filter(msg => msg.id !== messageId);
    return true;
  },

  /**
   * Toggle a reaction on a message
   */
  async toggleReaction({ conversationId, messageId, emoji, userId = MOCK_CURRENT_USER.id }) {
    await delay(100);
    if (!messagesStore[conversationId]) return null;

    let updatedMsg = null;
    messagesStore[conversationId] = messagesStore[conversationId].map(msg => {
      if (msg.id === messageId) {
        const reactions = [...(msg.reactions || [])];
        const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);

        if (existingReactionIndex > -1) {
          const reaction = { ...reactions[existingReactionIndex] };
          const userIndex = reaction.users.indexOf(userId);

          if (userIndex > -1) {
            // Remove user reaction
            reaction.users = reaction.users.filter(u => u !== userId);
            reaction.count -= 1;
            if (reaction.count <= 0) {
              reactions.splice(existingReactionIndex, 1);
            } else {
              reactions[existingReactionIndex] = reaction;
            }
          } else {
            // Add user to reaction
            reaction.users = [...reaction.users, userId];
            reaction.count += 1;
            reactions[existingReactionIndex] = reaction;
          }
        } else {
          // New reaction
          reactions.push({
            emoji,
            count: 1,
            users: [userId]
          });
        }

        updatedMsg = { ...msg, reactions };
        return updatedMsg;
      }
      return msg;
    });

    return updatedMsg;
  },

  /**
   * Mark all messages in conversation as read
   */
  async markAsRead(conversationId) {
    await delay(80);
    conversationsStore = conversationsStore.map(c => {
      if (c.id === conversationId) {
        return { ...c, unreadCount: 0 };
      }
      return c;
    });
    return true;
  },

  /**
   * Search within a conversation or across conversations
   */
  async searchMessages(query, conversationId = null) {
    await delay(180);
    const q = query.toLowerCase().trim();
    if (!q) return [];

    let results = [];

    if (conversationId && messagesStore[conversationId]) {
      results = messagesStore[conversationId].filter(m => m.text && m.text.toLowerCase().includes(q));
    } else {
      Object.keys(messagesStore).forEach(cId => {
        const matches = messagesStore[cId].filter(m => m.text && m.text.toLowerCase().includes(q));
        results = [...results, ...matches];
      });
    }

    return results;
  }
};
