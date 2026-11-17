import { apiClient, fetchPages } from './api.client';
import { linkReplies, newClientMessageId, reactionCode, toConversation, toMessage } from './map';

async function history(roomId, viewerId) {
  const data = await apiClient(`/rooms/${roomId}/messages?limit=50`);
  return linkReplies((data.results || []).map((row) => toMessage(row, viewerId)).reverse());
}

export const chatService = {
  async getConversations() {
    const rooms = await fetchPages('/rooms?scope=mine');
    return rooms.map(toConversation);
  },

  async getMessages(roomId, viewerId) {
    return history(roomId, viewerId);
  },

  async sendMessage({ conversationId, text, attachments = [], replyTo = null, sender }) {
    const attachmentIds = [];
    for (const attachment of attachments) {
      if (!attachment.file) continue;
      const form = new FormData();
      form.append('file', attachment.file);
      const uploaded = await apiClient(`/rooms/${conversationId}/attachments`, {
        method: 'POST',
        form,
      });
      attachmentIds.push(uploaded.id);
    }

    const created = await apiClient(`/rooms/${conversationId}/messages`, {
      method: 'POST',
      body: {
        body: text || '',
        client_message_id: newClientMessageId(),
        ...(replyTo?.id ? { reply_to: replyTo.id } : {}),
        ...(attachmentIds.length ? { attachment_ids: attachmentIds } : {}),
      },
    });
    const message = toMessage(created, sender?.id);
    if (replyTo) message.replyTo = replyTo;
    return message;
  },

  async editMessage({ messageId, newText, senderId }) {
    const updated = await apiClient(`/messages/${messageId}`, {
      method: 'PATCH',
      body: { body: newText },
    });
    return toMessage(updated, senderId);
  },

  async deleteMessage({ messageId, senderId }) {
    const updated = await apiClient(`/messages/${messageId}`, { method: 'DELETE' });
    return toMessage(updated, senderId);
  },

  async toggleReaction({ messageId, emoji, userId }) {
    const code = reactionCode(emoji);
    const current = await apiClient(`/messages/${messageId}`);
    const mine = (current.reactions || []).find((item) => item.emoji === code && item.reacted_by_me);
    if (mine) {
      await apiClient(`/messages/${messageId}/reactions/${code}`, { method: 'DELETE' });
    } else {
      await apiClient(`/messages/${messageId}/reactions/${code}`, { method: 'PUT' });
    }
    const updated = await apiClient(`/messages/${messageId}`);
    return toMessage(updated, userId);
  },

  async markAsRead(roomId, messageId) {
    if (!messageId) return null;
    return apiClient(`/rooms/${roomId}/read`, {
      method: 'POST',
      body: { last_read_message_id: messageId },
    });
  },

  async setTyping(roomId, isTyping) {
    await apiClient(`/rooms/${roomId}/typing`, {
      method: 'POST',
      body: { is_typing: Boolean(isTyping) },
    });
  },

  async getTyping(roomId) {
    const data = await apiClient(`/rooms/${roomId}/typing`);
    return data.results || [];
  },
};
