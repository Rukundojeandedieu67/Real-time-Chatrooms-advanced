import { useState } from 'react';
import { Plus, Compass } from 'lucide-react';
import { RoomDirectory } from '../../components/rooms/RoomDirectory';
import { CreateRoomModal } from '../../components/rooms/CreateRoomModal';
import { useRooms } from '../../context/RoomContext';

export const RoomsPage = () => {
  const { acceptInvite } = useRooms();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Rooms Directory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2335]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Chatroom Directory</h1>
          </div>
          <p className="text-xs text-slate-400">
            Discover community channels across robotics, quantum algorithms, systems engineering, and design.
          </p>
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!inviteCode.trim()) return;
            await acceptInvite(inviteCode);
            setInviteCode('');
          }}
        >
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="Invite code"
            className="bg-[#121522] border border-[#24293d] rounded-xl text-xs text-slate-100 px-3 py-2 w-40"
          />
          <button type="submit" className="px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white">
            Join with invite
          </button>
        </form>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Room</span>
        </button>
      </div>

      {/* Directory Grid with Filters */}
      <RoomDirectory onOpenCreateRoom={() => setIsCreateModalOpen(true)} />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
