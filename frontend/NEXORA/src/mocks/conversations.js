export const MOCK_CONVERSATIONS = [
  {
    id: 'conv_dm_001',
    type: 'direct', // 'direct' | 'group' | 'room'
    participantIds: ['usr_curr_001', 'usr_002'],
    participant: {
      id: 'usr_002',
      name: 'Dr. Elena Rostova',
      username: 'elena_rostova',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      status: 'online',
      statusMessage: 'Analyzing transformer KV cache 🧠'
    },
    title: 'Dr. Elena Rostova',
    lastMessage: {
      id: 'msg_010',
      senderId: 'usr_002',
      text: 'The KV cache pruning dropped latency by 38% without degrading perplexity.',
      timestamp: '2026-11-17T15:35:00Z',
      read: true
    },
    unreadCount: 0,
    pinned: true,
    isTyping: false
  },
  {
    id: 'conv_dm_002',
    type: 'direct',
    participantIds: ['usr_curr_001', 'usr_004'],
    participant: {
      id: 'usr_004',
      name: 'Sarah Chen',
      username: 'sarah_chen',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      status: 'online',
      statusMessage: 'Polishing NEXORA token system 🎨'
    },
    title: 'Sarah Chen',
    lastMessage: {
      id: 'msg_020',
      senderId: 'usr_004',
      text: 'I just uploaded the high-contrast accent tokens for the new dark theme.',
      timestamp: '2026-11-17T15:20:00Z',
      read: false
    },
    unreadCount: 2,
    pinned: true,
    isTyping: true
  },
  {
    id: 'conv_grp_001',
    type: 'group',
    title: 'Core Architecture Guild',
    avatar: '⚡',
    participantIds: ['usr_curr_001', 'usr_002', 'usr_003', 'usr_005', 'usr_007'],
    memberCount: 5,
    lastMessage: {
      id: 'msg_030',
      senderId: 'usr_005',
      text: 'Security review for the message envelope encryption looks solid.',
      timestamp: '2026-11-17T14:45:00Z',
      read: true
    },
    unreadCount: 0,
    pinned: false,
    isTyping: false
  },
  {
    id: 'conv_dm_003',
    type: 'direct',
    participantIds: ['usr_curr_001', 'usr_003'],
    participant: {
      id: 'usr_003',
      name: 'Marcus Vance',
      username: 'marcus_vance',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      status: 'away',
      statusMessage: 'In lab simulation 🔬'
    },
    title: 'Marcus Vance',
    lastMessage: {
      id: 'msg_040',
      senderId: 'usr_curr_001',
      text: 'Have you verified the Kyber-1024 benchmarks against our WebSocket frame size?',
      timestamp: '2026-11-17T13:10:00Z',
      read: true
    },
    unreadCount: 0,
    pinned: false,
    isTyping: false
  },
  {
    id: 'conv_dm_004',
    type: 'direct',
    participantIds: ['usr_curr_001', 'usr_007'],
    participant: {
      id: 'usr_007',
      name: 'Kaito Tanaka',
      username: 'kaito_tanaka',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
      status: 'online',
      statusMessage: 'Testing packet framing 🛰️'
    },
    title: 'Kaito Tanaka',
    lastMessage: {
      id: 'msg_050',
      senderId: 'usr_007',
      text: 'WebTransport fallback to WebSocket over TLS is working smoothly.',
      timestamp: '2026-11-17T11:05:00Z',
      read: true
    },
    unreadCount: 0,
    pinned: false,
    isTyping: false
  }
];
