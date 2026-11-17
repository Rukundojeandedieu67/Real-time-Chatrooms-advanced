export const INITIAL_MESSAGES = {
  // Direct message with Dr. Elena Rostova
  conv_dm_001: [
    {
      id: 'msg_001_01',
      conversationId: 'conv_dm_001',
      senderId: 'usr_002',
      senderName: 'Dr. Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      text: 'Hey Alex! Did you get a chance to inspect the attention head activation patterns from the distributed benchmark run?',
      timestamp: '2026-11-17T15:10:00Z',
      status: 'read',
      reactions: [
        { emoji: '⚡', count: 2, users: ['usr_curr_001', 'usr_002'] }
      ]
    },
    {
      id: 'msg_001_02',
      conversationId: 'conv_dm_001',
      senderId: 'usr_curr_001',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      text: 'Yes! The memory footprint drops significantly once we discard redundant attention weights across the long-context chunks.',
      timestamp: '2026-11-17T15:15:00Z',
      status: 'read',
      reactions: [
        { emoji: '🔥', count: 1, users: ['usr_002'] }
      ]
    },
    {
      id: 'msg_001_03',
      conversationId: 'conv_dm_001',
      senderId: 'usr_002',
      senderName: 'Dr. Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      text: 'Exactly what we wanted. Here is the comparative throughput plot and latency breakdown.',
      timestamp: '2026-11-17T15:22:00Z',
      status: 'read',
      attachments: [
        {
          id: 'att_01',
          name: 'kv-cache-latency-v2.png',
          size: '1.4 MB',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
        }
      ]
    },
    {
      id: 'msg_001_04',
      conversationId: 'conv_dm_001',
      senderId: 'usr_curr_001',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      text: 'That curve looks outstanding. I will integrate the inference pipeline scheduler tonight.',
      timestamp: '2026-11-17T15:28:00Z',
      status: 'read',
      replyTo: {
        id: 'msg_001_03',
        senderName: 'Dr. Elena Rostova',
        text: 'Exactly what we wanted. Here is the comparative throughput plot and latency breakdown.'
      }
    },
    {
      id: 'msg_001_05',
      conversationId: 'conv_dm_001',
      senderId: 'usr_002',
      senderName: 'Dr. Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      text: 'The KV cache pruning dropped latency by 38% without degrading perplexity.',
      timestamp: '2026-11-17T15:35:00Z',
      status: 'read',
      reactions: [
        { emoji: '🚀', count: 3, users: ['usr_curr_001', 'usr_002', 'usr_004'] },
        { emoji: '👏', count: 2, users: ['usr_curr_001', 'usr_003'] }
      ]
    }
  ],

  // Direct message with Sarah Chen
  conv_dm_002: [
    {
      id: 'msg_002_01',
      conversationId: 'conv_dm_002',
      senderId: 'usr_curr_001',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      text: 'Sarah, how are the new component tokens coming along for the high-density desktop views?',
      timestamp: '2026-11-17T15:00:00Z',
      status: 'read'
    },
    {
      id: 'msg_002_02',
      conversationId: 'conv_dm_002',
      senderId: 'usr_004',
      senderName: 'Sarah Chen',
      senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      text: 'Almost done! I unified the charcoal border elevations and glassmorphism backdrop blur factors.',
      timestamp: '2026-11-17T15:12:00Z',
      status: 'read'
    },
    {
      id: 'msg_002_03',
      conversationId: 'conv_dm_002',
      senderId: 'usr_004',
      senderName: 'Sarah Chen',
      senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      text: 'I just uploaded the high-contrast accent tokens for the new dark theme.',
      timestamp: '2026-11-17T15:20:00Z',
      status: 'delivered',
      reactions: [
        { emoji: '❤️', count: 1, users: ['usr_curr_001'] }
      ]
    }
  ],

  // Core Architecture Guild
  conv_grp_001: [
    {
      id: 'msg_003_01',
      conversationId: 'conv_grp_001',
      senderId: 'usr_007',
      senderName: 'Kaito Tanaka',
      senderAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
      text: 'Team, the binary framing spec for real-time channel presence is drafted in RFC-104.',
      timestamp: '2026-11-17T14:30:00Z',
      status: 'read'
    },
    {
      id: 'msg_003_02',
      conversationId: 'conv_grp_001',
      senderId: 'usr_005',
      senderName: 'Devon Miles',
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      text: 'Security review for the message envelope encryption looks solid.',
      timestamp: '2026-11-17T14:45:00Z',
      status: 'read',
      reactions: [
        { emoji: '🛡️', count: 4, users: ['usr_curr_001', 'usr_002', 'usr_003', 'usr_007'] }
      ]
    }
  ],

  // Room: ai-autonomous-agents
  room_001: [
    {
      id: 'msg_r01_01',
      conversationId: 'room_001',
      senderId: 'usr_002',
      senderName: 'Dr. Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      text: 'Welcome everyone! Today we are discussing multi-agent communication coordination protocols. How should agents handle conflicting tool actions?',
      timestamp: '2026-11-17T14:00:00Z',
      status: 'read',
      reactions: [
        { emoji: '💡', count: 5, users: ['usr_curr_001', 'usr_004', 'usr_007'] }
      ]
    },
    {
      id: 'msg_r01_02',
      conversationId: 'room_001',
      senderId: 'usr_curr_001',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      text: 'A hierarchical consensus arbiter with transactional rollback is the cleanest approach. Each agent proposes an intent step, and the arbiter verifies invariant safety before committing.',
      timestamp: '2026-11-17T14:15:00Z',
      status: 'read',
      reactions: [
        { emoji: '🚀', count: 7, users: ['usr_002', 'usr_004', 'usr_007', 'usr_003'] },
        { emoji: '🔥', count: 3, users: ['usr_002', 'usr_005'] }
      ]
    },
    {
      id: 'msg_r01_03',
      conversationId: 'room_001',
      senderId: 'usr_007',
      senderName: 'Kaito Tanaka',
      senderAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
      text: 'Agreed! Especially when state mutations affect external APIs. A speculative dry-run step prevents non-idempotent side effects.',
      timestamp: '2026-11-17T14:22:00Z',
      status: 'read'
    }
  ],

  // Room: distributed-systems
  room_002: [
    {
      id: 'msg_r02_01',
      conversationId: 'room_002',
      senderId: 'usr_curr_001',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      text: 'Consensus benchmark results are up. Raft heartbeat interval set to 150ms gave us sub-10ms failover times across 3 geographic zones.',
      timestamp: '2026-11-17T15:30:00Z',
      status: 'read',
      reactions: [
        { emoji: '👍', count: 4, users: ['usr_003', 'usr_005', 'usr_006'] }
      ]
    }
  ],

  // Room: general-lounge
  room_006: [
    {
      id: 'msg_r06_01',
      conversationId: 'room_006',
      senderId: 'usr_curr_001',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      text: 'Welcome to NEXORA! Feel free to explore our chatrooms or start a private encrypted conversation. Everything in this preview runs with our local reactive state machine.',
      timestamp: '2026-11-17T15:40:00Z',
      status: 'read',
      reactions: [
        { emoji: '👋', count: 12, users: ['usr_002', 'usr_003', 'usr_004', 'usr_005', 'usr_006', 'usr_007'] },
        { emoji: '✨', count: 8, users: ['usr_002', 'usr_004'] }
      ]
    }
  ]
};
