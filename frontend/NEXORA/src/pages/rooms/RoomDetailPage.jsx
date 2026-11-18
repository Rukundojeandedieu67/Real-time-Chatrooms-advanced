import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Settings,
  Check
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

function applyPresence(members, presence) {
  const byUser = new Map((presence || []).map((item) => [item.user_id, item.status]));
  return members.map((member) =>
    byUser.has(member.id) ? { ...member, status: byUser.get(member.id) } : member
  );
}

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
  const [stats, setStats] = useState(null);

  // Load room details, members, and messages
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const foundRoom = await roomService.getRoom(roomId);
        if (!isMounted || !foundRoom) return;
        setRoom(foundRoom);
        if (!foundRoom.isJoined) {
          setMembers([]);
          setMessages([]);
          return;
        }
        const [roomMembers, roomMsgs, presence] = await Promise.all([
          roomService.getRoomMembers(foundRoom.id),
          chatService.getMessages(foundRoom.id, user?.id),
          roomService.getPresence(foundRoom.id),
        ]);
        if (!isMounted) return;
        setMembers(applyPresence(roomMembers, presence));
        setMessages(roomMsgs);
        roomService.getStats(foundRoom.id).then((data) => {
          if (isMounted) setStats(data);
        }).catch(() => {});
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    const timer = setInterval(async () => {
      try {
        const latest = await roomService.getRoom(roomId);
        if (!isMounted || !latest?.isJoined) return;
        const [roomMsgs, presence] = await Promise.all([
          chatService.getMessages(roomId, user?.id),
          roomService.getPresence(roomId),
        ]);
        if (!isMounted) return;
        setMessages(roomMsgs);
        setMembers((current) => applyPresence(current, presence));
      } catch {
        /* keep the last good history */
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [roomId, rooms, user?.id]);

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
    setMessages((prev) => (prev.some((item) => item.id === newMsg.id) ? prev : [...prev, newMsg]));
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

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600/30 to-violet-600/30 border border-white/10 flex items-center justify-center text-lg shrink-0 overflow-hidden">
              {room.avatarUrl ? (
                <img src={room.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                room.avatar || '💬'
              )}
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
              <p className="text-[11px] text-slate-400 truncate">
                {room.title}
                {stats ? ` · ${stats.message_count} messages` : ''}
              </p>
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
          <div className="px-6 py-2 bg-gradient-to-r from-blue-950/30 via-indigo-950/20 to-transparent border-b border-blue-500/15 flex items-center gap-2 text-xs text-blue-300">
            <span className="font-bold text-white shrink-0">Topic:</span>
            <span className="truncate">{room.topic}</span>
          </div>
        )}

        {/* Messages Stream */}
        <MessageList
          messages={messages}
          isLoading={false}
          onReply={(msg) => setReplyingTo(msg)}
          onEdit={async (id, text) => {
            const updated = await chatService.editMessage({ messageId: id, newText: text, senderId: user?.id });
            setMessages((prev) => prev.map((item) => (item.id === id ? updated : item)));
          }}
          onDelete={async (id) => {
            const updated = await chatService.deleteMessage({ messageId: id, senderId: user?.id });
            setMessages((prev) => prev.map((item) => (item.id === id ? updated : item)));
          }}
          onToggleReaction={async (id, emoji) => {
            const updated = await chatService.toggleReaction({ messageId: id, emoji, userId: user?.id });
            setMessages((prev) => prev.map((item) => (item.id === id ? updated : item)));
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
        <MemberList
          members={members}
          ownerId={room.ownerId}
          title={`#${room.name} Members`}
          myRole={room.myRole}
          currentUserId={user?.id}
          onChangeRole={async (userId, role) => {
            const updated = await roomService.updateMemberRole(room.id, userId, role);
            setMembers((current) => current.map((member) => (member.id === userId ? updated : member)));
          }}
          onRemove={async (userId) => {
            await roomService.removeMember(room.id, userId);
            setMembers((current) => current.filter((member) => member.id !== userId));
          }}
        />
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
