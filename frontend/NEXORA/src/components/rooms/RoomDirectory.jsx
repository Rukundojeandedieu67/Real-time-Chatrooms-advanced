import React from 'react';
import { SearchBar } from '../common/SearchBar';
import { RoomCard } from './RoomCard';
import { useRooms } from '../../context/RoomContext';
import { Compass, Filter, Sparkles } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { LoadingState } from '../common/LoadingState';

export const RoomDirectory = ({ onOpenCreateRoom }) => {
  const {
    rooms,
    categories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    isLoading
  } = useRooms();

  return (
    <div className="space-y-6">
      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              activeCategory === cat
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                : 'bg-[#121522] text-slate-400 hover:text-slate-200 border-[#24293d] hover:border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search rooms by name, keyword or topic..."
          />
        </div>

        {/* Filter Toggle Group */}
        <div className="flex items-center gap-1 p-1 bg-[#121522] border border-[#24293d] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'all'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Rooms
          </button>
          <button
            onClick={() => setFilterType('joined')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'joined'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Joined
          </button>
          <button
            onClick={() => setFilterType('public')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'public'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setFilterType('private')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'private'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Private
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <LoadingState message="Discovering active network rooms..." />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<Compass className="w-8 h-8 text-blue-400" />}
          title="No chatrooms found"
          description="Try selecting a different category or clearing search parameters."
          action={
            <button
              onClick={onOpenCreateRoom}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30"
            >
              Create New Room
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
};
