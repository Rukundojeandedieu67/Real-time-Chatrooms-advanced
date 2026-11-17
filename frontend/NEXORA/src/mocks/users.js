export const MOCK_CURRENT_USER = {
  id: 'usr_curr_001',
  name: 'Alex Rivera',
  username: 'alex_rivera',
  email: 'alex.rivera@nexora.io',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  title: 'Lead Systems Architect',
  bio: 'Building resilient decentralized communication protocols. Constantly exploring distributed consensus and high-throughput real-time architectures.',
  status: 'online', // 'online' | 'away' | 'busy' | 'offline'
  statusMessage: 'Refactoring WebSocket heartbeat ⚡',
  joinedDate: 'January 2024',
  location: 'Zurich / Remote',
  role: 'admin',
  stats: {
    roomsJoined: 8,
    messagesSent: 1420,
    reactionsGiven: 390
  },
  preferences: {
    theme: 'dark',
    accentColor: 'blue',
    fontSize: 'medium',
    soundEnabled: true,
    desktopNotifications: true,
    emailDigest: 'weekly',
    showOnlineStatus: true,
    readReceipts: true,
    twoFactorEnabled: true
  }
};

export const MOCK_USERS = [
  MOCK_CURRENT_USER,
  {
    id: 'usr_002',
    name: 'Dr. Elena Rostova',
    username: 'elena_rostova',
    email: 'elena.rostova@nexora.io',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    title: 'Principal AI Researcher',
    bio: 'Specializing in neural attention mechanisms, agentic synthesis, and low-latency transformer inference.',
    status: 'online',
    statusMessage: 'Analyzing transformer KV cache 🧠',
    joinedDate: 'March 2024',
    location: 'Berlin, Germany',
    role: 'member',
    stats: { roomsJoined: 12, messagesSent: 2840, reactionsGiven: 820 }
  },
  {
    id: 'usr_003',
    name: 'Marcus Vance',
    username: 'marcus_vance',
    email: 'marcus.vance@nexora.io',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    title: 'Quantum Software Engineer',
    bio: 'Post-quantum cryptography enthusiast. Qiskit & lattice-based key exchange protocols.',
    status: 'away',
    statusMessage: 'In lab simulation 🔬',
    joinedDate: 'February 2024',
    location: 'Cambridge, MA',
    role: 'moderator',
    stats: { roomsJoined: 6, messagesSent: 940, reactionsGiven: 310 }
  },
  {
    id: 'usr_004',
    name: 'Sarah Chen',
    username: 'sarah_chen',
    email: 'sarah.chen@nexora.io',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    title: 'Design Systems Lead',
    bio: 'Crafting pixel-perfect dark UI themes, micro-interactions, and accessible typography.',
    status: 'online',
    statusMessage: 'Polishing NEXORA token system 🎨',
    joinedDate: 'April 2024',
    location: 'San Francisco, CA',
    role: 'member',
    stats: { roomsJoined: 15, messagesSent: 3410, reactionsGiven: 1250 }
  },
  {
    id: 'usr_005',
    name: 'Devon Miles',
    username: 'devon_miles',
    email: 'devon.miles@nexora.io',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    title: 'Principal Security Architect',
    bio: 'Zero-trust infrastructure, identity token rotation, and threat modeling.',
    status: 'busy',
    statusMessage: 'Do Not Disturb — Threat audit in progress 🛡️',
    joinedDate: 'December 2023',
    location: 'London, UK',
    role: 'admin',
    stats: { roomsJoined: 10, messagesSent: 1890, reactionsGiven: 430 }
  },
  {
    id: 'usr_006',
    name: 'Maya Lin',
    username: 'maya_lin',
    email: 'maya.lin@nexora.io',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
    title: 'SRE & Cloud Infrastructure',
    bio: 'Kubernetes multi-region clusters, eBPF telemetry, and zero-downtime rollouts.',
    status: 'offline',
    statusMessage: 'Offline until tomorrow morning',
    joinedDate: 'May 2024',
    location: 'Toronto, Canada',
    role: 'member',
    stats: { roomsJoined: 5, messagesSent: 670, reactionsGiven: 180 }
  },
  {
    id: 'usr_007',
    name: 'Kaito Tanaka',
    username: 'kaito_tanaka',
    email: 'kaito.tanaka@nexora.io',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    title: 'Realtime Protocol Engineer',
    bio: 'WebTransport, WebRTC data channels, and binary stream serialization.',
    status: 'online',
    statusMessage: 'Testing packet framing 🛰️',
    joinedDate: 'January 2024',
    location: 'Tokyo, Japan',
    role: 'member',
    stats: { roomsJoined: 11, messagesSent: 2150, reactionsGiven: 590 }
  }
];
