import { storedEmail } from './api.client';

const REACTION_CODES = {
  '👍': 'like',
  '❤️': 'love',
  '😂': 'laugh',
  '😮': 'wow',
  '😢': 'sad',
  '🎉': 'celebrate',
  '🔥': 'fire',
  '👀': 'eyes',
  '✅': 'yes',
  '👎': 'no',
};

export const REACTION_GLYPHS = Object.keys(REACTION_CODES);

export function reactionCode(emoji) {
  return REACTION_CODES[emoji] || emoji;
}

export function toProfile(profile, email) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    name: profile.display_name,
    bio: profile.bio || '',
    status: profile.status || 'offline',
    avatar: profile.avatar_url,
    avatar_url: profile.avatar_url,
    last_seen_at: profile.last_seen_at,
    created_at: profile.created_at,
    email: email || storedEmail(),
    joinedDate: profile.created_at
      ? new Date(profile.created_at).toLocaleDateString()
      : '',
  };
}

export function toRoom(room) {
  const joined = Boolean(room.my_role) || room.is_member === true;
  const preview = room.last_message;
  return {
    id: room.id,
    name: room.name,
    title: room.name,
    description: room.description || '',
    topic: room.description || '',
    isPrivate: Boolean(room.is_private),
    isJoined: joined,
    memberCount: room.member_count ?? 0,
    myRole: room.my_role,
    unreadCount: room.unread_count || 0,
    avatar: '💬',
    avatarUrl: room.avatar_url || null,
    ownerId: room.created_by || null,
    createdAt: room.created_at,
    maxMembers: room.max_members,
    lastMessage: preview
      ? {
          id: preview.id,
          text: preview.body,
          timestamp: preview.created_at,
          senderName: preview.sender_username,
        }
      : null,
  };
}

export function toConversation(room) {
  const mapped = toRoom(room);
  return {
    id: mapped.id,
    type: 'room',
    title: `#${mapped.name}`,
    avatar: mapped.isPrivate ? '🔒' : '#',
    unreadCount: mapped.unreadCount,
    lastMessage: mapped.lastMessage,
    description: mapped.description,
    isPrivate: mapped.isPrivate,
  };
}

export function toMember(entry) {
  const profile = toProfile(entry.user || entry);
  return {
    ...profile,
    role: entry.role || 'member',
    joinedAt: entry.joined_at,
  };
}

export function toMessage(message, viewerId) {
  const deleted = Boolean(message.deleted);
  return {
    id: message.id,
    conversationId: message.room_id,
    senderId: message.sender?.id,
    senderName: message.sender?.display_name || message.sender?.username || 'Member',
    senderAvatar: message.sender?.avatar_url,
    text: deleted ? 'Message deleted' : message.body || '',
    timestamp: message.created_at,
    edited: Boolean(message.edited_at),
    deleted,
    replyTo: message.reply_to || null,
    reactions: (message.reactions || []).map((reaction) => ({
      emoji: reaction.glyph || reaction.emoji,
      shortcode: reaction.emoji,
      count: reaction.count,
      reactedByMe: reaction.reacted_by_me,
      users: reaction.reacted_by_me && viewerId ? [viewerId] : [],
    })),
    attachments: (message.attachments || []).map((item) => ({
      id: item.id,
      name: item.content_type || 'image',
      type: item.content_type,
      url: item.url,
      size: item.size_bytes ? `${Math.max(1, Math.round(item.size_bytes / 1024))} KB` : '',
    })),
  };
}

export function linkReplies(messages) {
  const byId = new Map(messages.map((message) => [message.id, message]));
  return messages.map((message) => {
    if (!message.replyTo || typeof message.replyTo === 'object') return message;
    const parent = byId.get(message.replyTo);
    return {
      ...message,
      replyTo: parent
        ? { id: parent.id, senderName: parent.senderName, text: parent.text }
        : { id: message.replyTo, senderName: 'Reply', text: '' },
    };
  });
}

export function newClientMessageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
