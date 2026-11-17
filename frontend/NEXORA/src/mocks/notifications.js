export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif_001',
    type: 'mention', // 'mention' | 'reaction' | 'invite' | 'system'
    title: 'Mentioned in #ai-autonomous-agents',
    message: 'Dr. Elena Rostova mentioned you in topic "Multi-Agent Coordination Protocols".',
    timestamp: '15 minutes ago',
    read: false,
    actor: {
      name: 'Dr. Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'
    },
    targetLink: '/rooms/room_001'
  },
  {
    id: 'notif_002',
    type: 'reaction',
    title: 'Reaction to your message',
    message: 'Sarah Chen and 2 others reacted with 🚀 to your inference pipeline update.',
    timestamp: '45 minutes ago',
    read: false,
    actor: {
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80'
    },
    targetLink: '/chat/conv_dm_001'
  },
  {
    id: 'notif_003',
    type: 'invite',
    title: 'Room Invitation',
    message: 'Devon Miles invited you to join confidential room "#security-intelligence".',
    timestamp: '2 hours ago',
    read: true,
    actor: {
      name: 'Devon Miles',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80'
    },
    targetLink: '/rooms/room_004'
  },
  {
    id: 'notif_004',
    type: 'system',
    title: 'Security Session Alert',
    message: 'New login detected from Zurich, Switzerland (macOS / Brave Browser).',
    timestamp: 'Yesterday at 18:24',
    read: true,
    actor: null,
    targetLink: '/settings'
  }
];
