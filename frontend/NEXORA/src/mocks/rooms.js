export const MOCK_ROOM_CATEGORIES = [
  'All',
  'AI & Robotics',
  'Distributed Systems',
  'Cryptography & Security',
  'Frontend & Design',
  'Quantum Computing',
  'General Lounge'
];

export const MOCK_ROOMS = [
  {
    id: 'room_001',
    name: 'ai-autonomous-agents',
    title: 'AI & Autonomous Agents',
    category: 'AI & Robotics',
    description: 'Deep dive into multi-agent workflows, tool use, LLM alignment, and autonomous decision trees.',
    isPrivate: false,
    memberCount: 524,
    members: ['usr_curr_001', 'usr_002', 'usr_004', 'usr_007'],
    ownerId: 'usr_002',
    avatar: '🤖',
    bannerGradient: 'from-blue-600/30 to-violet-600/30',
    createdAt: '2024-01-15T10:00:00Z',
    isJoined: true,
    topic: 'Exploring self-correcting planning loops and speculative tool execution.',
    rules: [
      'Maintain constructive technical discourse.',
      'Cite benchmarks when proposing architecture changes.',
      'No unsolicited promotion.'
    ],
    lastActivity: '10 minutes ago'
  },
  {
    id: 'room_002',
    name: 'distributed-systems',
    title: 'Distributed Systems Core',
    category: 'Distributed Systems',
    description: 'Consensus protocols, Raft, Paxos, event sourcing, CRDTs, and geo-replicated state machines.',
    isPrivate: false,
    memberCount: 388,
    members: ['usr_curr_001', 'usr_003', 'usr_005', 'usr_006'],
    ownerId: 'usr_curr_001',
    avatar: '🌐',
    bannerGradient: 'from-cyan-600/30 to-blue-600/30',
    createdAt: '2024-02-01T12:00:00Z',
    isJoined: true,
    topic: 'Optimizing consensus rounds across WAN links with eBPF acceleration.',
    rules: [
      'Focus on provable consistency models.',
      'Respect peer review feedback on RFCs.'
    ],
    lastActivity: '3 minutes ago'
  },
  {
    id: 'room_003',
    name: 'frontend-architects',
    title: 'Frontend Architecture & Design Systems',
    category: 'Frontend & Design',
    description: 'Modern component architectures, CSS-in-JS vs Tailwind, micro-frontends, and web performance.',
    isPrivate: false,
    memberCount: 295,
    members: ['usr_curr_001', 'usr_004', 'usr_007'],
    ownerId: 'usr_004',
    avatar: '✨',
    bannerGradient: 'from-violet-600/30 to-fuchsia-600/30',
    createdAt: '2024-02-14T09:30:00Z',
    isJoined: true,
    topic: 'Building the NEXORA high-density dark UI system with zero layout shifts.',
    rules: [
      'Provide visual demos or code snippets with submissions.',
      'Accessibility is a priority, not an afterthought.'
    ],
    lastActivity: '25 minutes ago'
  },
  {
    id: 'room_004',
    name: 'security-intelligence',
    title: 'Zero-Trust & Threat Modeling',
    category: 'Cryptography & Security',
    description: 'Confidential channel for defensive security, zero-knowledge proofs, vulnerability disclosures, and key rotations.',
    isPrivate: true,
    memberCount: 42,
    members: ['usr_curr_001', 'usr_005'],
    ownerId: 'usr_005',
    avatar: '🛡️',
    bannerGradient: 'from-amber-600/30 to-rose-600/30',
    createdAt: '2024-01-20T16:00:00Z',
    isJoined: true,
    topic: 'Reviewing HMAC signing algorithms and session replay protections.',
    rules: [
      'Encrypted transit mandatory.',
      'Responsible disclosure protocol applies.'
    ],
    lastActivity: '1 hour ago'
  },
  {
    id: 'room_005',
    name: 'quantum-computing',
    title: 'Quantum Computing & Algorithms',
    category: 'Quantum Computing',
    description: 'Lattice cryptography, qubit coherence simulations, Shor algorithm analysis, and QASM developments.',
    isPrivate: false,
    memberCount: 168,
    members: ['usr_003', 'usr_002'],
    ownerId: 'usr_003',
    avatar: '⚛️',
    bannerGradient: 'from-purple-600/30 to-indigo-600/30',
    createdAt: '2024-03-02T11:15:00Z',
    isJoined: false,
    topic: 'Simulating NISQ algorithms on distributed GPU clusters.',
    rules: [
      'Clear math notation preferred.',
      'Include simulator version.'
    ],
    lastActivity: '2 hours ago'
  },
  {
    id: 'room_006',
    name: 'general-lounge',
    title: 'Global NEXORA Lounge',
    category: 'General Lounge',
    description: 'Casual conversations, tech setup showcases, coffee discussions, and community welcomes.',
    isPrivate: false,
    memberCount: 1040,
    members: ['usr_curr_001', 'usr_002', 'usr_003', 'usr_004', 'usr_005', 'usr_006', 'usr_007'],
    ownerId: 'usr_curr_001',
    avatar: '☕',
    bannerGradient: 'from-emerald-600/30 to-teal-600/30',
    createdAt: '2024-01-01T00:00:00Z',
    isJoined: true,
    topic: 'Welcome to NEXORA! Feel free to introduce your research or current projects.',
    rules: [
      'Be respectful and collaborative.',
      'No spamming or aggressive conduct.'
    ],
    lastActivity: 'Just now'
  }
];
