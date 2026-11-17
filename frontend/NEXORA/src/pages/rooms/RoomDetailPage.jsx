import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Lock,
  Globe,
  Settings,
  Info,
  Check,
  Shield,
  MessageSquare
} from 'lucide-react';
import { useRooms } from '../../context/RoomContext';
import { useAuth } from '../../context/AuthContext';
import { roomService } from '../../services/room.service';
import { chatService } from '../../services/chat.service';
import { MessageList } from '../../components/chat/MessageList';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { MemberList } from '../../components/rooms/MemberList';
import { RoomSettingsModal } from '../../components/rooms/RoomSettingsModal';
import { LoadingState } from '../../components/common/LoadingState';

export const RoomDetailPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { rooms, joinRoom, leaveRoom } = useRooms();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);

  // Load room details, members, and messages
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const foundRoom = await roomService.getRoom(roomId);
        if (isMounted && foundRoom) {
          setRoom(foundRoom);
          const roomMembers = await roomService.getRoomMembers(foundRoom.id);
          setMembers(roomMembers);
          const roomMsgs = await chatService.getMessages(foundRoom.id);
          setMessages(roomMsgs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [roomId, rooms]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingState message="Connecting to room node..." />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400 text-sm">Room not found.</p>
        <button
          onClick={() => navigate('/rooms')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const handleSendRoomMessage = async ({ text, attachments, replyTo }) => {
    const newMsg = await chatService.sendMessage({
      conversationId: room.id,
      text,
      attachments,
      replyTo,
      sender: user
    });
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleToggleJoin = async () => {
    if (room.isJoined) {
      await leaveRoom(room.id);
    } else {
      await joinRoom(room.id);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0b10]">
      {/* Main Channel Message Feed */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#0e1017]/40 relative">
        {/* Room Header */}
        <div className="h-16 px-4 sm:px-6 bg-[#0e1017]/90 backdrop-blur-md border-b border-[#1e2335] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/rooms')}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Back to directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600/30 to-violet-600/30 border border-white/10 flex items-center justify-center text-lg shrink-0">
              {room.avatar || '💬'}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">#</span>
                <h2 className="text-sm font-bold text-white truncate">{room.name}</h2>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase border ${
                    room.isPrivate
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {room.isPrivate ? 'Private' : 'Public'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{room.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleJoin}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                room.isJoined
                  ? 'bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 border border-white/10'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              }`}
            >
              {room.isJoined ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Joined
                </span>
              ) : (
                'Join Room'
              )}
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Room Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowMemberList(!showMemberList)}
              className={`p-2 rounded-xl transition-colors ${
                showMemberList ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Toggle Members"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Room Topic Announcement Banner */}
        {room.topic && (
          <div className="px-6 py-2 bg-gradient-to-r from-blue-950/30 via-indigo-950/20 to-transparent border-b border-blue-500/15 flex items-center justify-between text-xs text-blue-300">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-white shrink-0">Topic:</span>
              <span className="truncate">{room.topic}</span>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 ml-2 hidden sm:inline">
              Category: {room.category}
            </span>
          </div>
        )}

        {/* Messages Stream */}
        <MessageList
          messages={messages}
          isLoading={false}
          onReply={(msg) => setReplyingTo(msg)}
          onEdit={(id, text) => {
            chatService.editMessage({ conversationId: room.id, messageId: id, newText: text });
            setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, edited: true } : m)));
          }}
          onDelete={(id) => {
            chatService.deleteMessage({ conversationId: room.id, messageId: id });
            setMessages((prev) => prev.filter((m) => m.id !== id));
          }}
          onToggleReaction={(id, emoji) => {
            chatService.toggleReaction({ conversationId: room.id, messageId: id, emoji, userId: user?.id });
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== id) return m;
                const reactions = [...(m.reactions || [])];
                const existing = reactions.find((r) => r.emoji === emoji);
                if (existing) {
                  existing.count += 1;
                } else {
                  reactions.push({ emoji, count: 1, users: [user?.id] });
                }
                return { ...m, reactions };
              })
            );
          }}
        />

        {/* Composer (disabled if not joined) */}
        {room.isJoined ? (
          <MessageComposer
            onSend={handleSendRoomMessage}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            isTyping={false}
            partnerName={`#${room.name}`}
          />
        ) : (
          <div className="p-4 bg-[#0d0f17] border-t border-[#1e2335] text-center">
            <p className="text-xs text-slate-400 mb-2">
              You must join #{room.name} to participate and send messages.
            </p>
            <button
              onClick={handleToggleJoin}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30"
            >
              Join Room Now
            </button>
          </div>
        )}
      </div>

      {/* Right: Members Sidebar */}
      {showMemberList && (
        <MemberList members={members} ownerId={room.ownerId} title={`#${room.name} Members`} />
      )}

      {/* Settings Modal */}
      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        room={room}
      />
    </div>
  );
};
