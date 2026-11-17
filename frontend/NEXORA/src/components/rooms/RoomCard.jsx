import { useNavigate } from 'react-router-dom';
import { Users, Lock, Globe, ArrowRight, Check } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';

export const RoomCard = ({ room }) => {
  const navigate = useNavigate();
  const { joinRoom, leaveRoom } = useRooms();

  const handleToggleJoin = (e) => {
    e.stopPropagation();
    if (room.isJoined) {
      leaveRoom(room.id);
    } else {
      joinRoom(room.id);
    }
  };

  const handleOpenRoom = () => {
    navigate(`/rooms/${room.id}`);
  };

  return (
    <div
      onClick={handleOpenRoom}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#121522]/60 hover:bg-[#151929] border border-[#23293e] hover:border-blue-500/40 shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-violet-600/30 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
              {room.avatarUrl ? (
                <img src={room.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                room.avatar || '💬'
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-slate-400">#</span>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  {room.name}
                </h3>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate max-w-[180px]">
                {room.title}
              </p>
            </div>
          </div>

          {/* Privacy badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${
              room.isPrivate
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {room.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
            {room.isPrivate ? 'Private' : 'Public'}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
          {room.description}
        </p>
      </div>

      {/* Footer Stats & Actions */}
      <div className="pt-3 border-t border-[#1e2335] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-300">{room.memberCount}</span>
          <span className="text-[11px] text-slate-400">members</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
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
              'Join'
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenRoom}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Open Room"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
