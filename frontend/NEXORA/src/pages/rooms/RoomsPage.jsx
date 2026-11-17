import React, { useState } from 'react';
import { RoomDirectory } from '../../components/rooms/RoomDirectory';
import { CreateRoomModal } from '../../components/rooms/CreateRoomModal';
import { Plus, Compass, Shield, Users, Radio } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';

export const RoomsPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { rooms } = useRooms();

  const publicCount = rooms.filter((r) => !r.isPrivate).length;
  const privateCount = rooms.filter((r) => r.isPrivate).length;

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
