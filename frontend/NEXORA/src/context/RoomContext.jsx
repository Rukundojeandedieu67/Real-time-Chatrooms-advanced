import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { roomService } from '../services/room.service';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [rooms, setRooms] = useState([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const requestKey = `${isAuthenticated}:${filterType}:${searchQuery}`;

  const fetchRooms = useCallback(async () => {
    if (!isAuthenticated) return [];
    const data = await roomService.getRooms({ search: searchQuery, filter: filterType });
    setRooms(data);
    setLoadedKey(`${isAuthenticated}:${filterType}:${searchQuery}`);
    return data;
  }, [isAuthenticated, searchQuery, filterType]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    const key = `${isAuthenticated}:${filterType}:${searchQuery}`;
    roomService
      .getRooms({ search: searchQuery, filter: filterType })
      .then((data) => {
        if (!active) return;
        setRooms(data);
        setLoadedKey(key);
      })
      .catch((err) => {
        if (!active) return;
        setLoadedKey(key);
        addToast({
          type: 'error',
          title: 'Rooms unavailable',
          message: err.message || 'Could not load rooms.',
        });
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, searchQuery, filterType, addToast]);

  const joinRoom = async (roomId) => {
    try {
      const updated = await roomService.joinRoom(roomId);
      setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, ...updated } : room)));
      addToast({
        type: 'success',
        title: 'Joined room',
        message: `You are now a member of #${updated.name}.`,
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Join failed',
        message: err.message || 'Could not join room.',
      });
      throw err;
    }
  };

  const leaveRoom = async (roomId) => {
    try {
      const updated = await roomService.leaveRoom(roomId);
      setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, ...updated, isJoined: false } : room)));
      addToast({
        type: 'info',
        title: 'Left room',
        message: 'You have left the room.',
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Leave failed',
        message: err.message || 'Could not leave room.',
      });
      throw err;
    }
  };

  const createRoom = async (payload) => {
    try {
      const newRoom = await roomService.createRoom(payload);
      setRooms((prev) => [newRoom, ...prev.filter((room) => room.id !== newRoom.id)]);
      addToast({
        type: 'success',
        title: 'Room created',
        message: `#${newRoom.name} is ready.`,
      });
      return newRoom;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could not create room',
        message: err.message || 'Failed to create the room.',
      });
      throw err;
    }
  };

  const acceptInvite = async (code) => {
    try {
      await roomService.acceptInvite(code);
      const data = await fetchRooms();
      addToast({
        type: 'success',
        title: 'Invite accepted',
        message: 'You joined the room.',
      });
      return data;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Invite failed',
        message: err.message || 'That invite code could not be used.',
      });
      throw err;
    }
  };

  const updateRoom = async (roomId, updates) => {
    try {
      const updated = await roomService.updateRoom(roomId, updates);
      setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, ...updated } : room)));
      addToast({
        type: 'success',
        title: 'Room updated',
        message: 'Room settings were saved.',
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update failed',
        message: err.message || 'Failed to update room settings.',
      });
      throw err;
    }
  };

  return (
    <RoomContext.Provider
      value={{
        rooms: isAuthenticated ? rooms : [],
        categories: [],
        activeCategory: 'All',
        setActiveCategory: () => {},
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        isLoading: isAuthenticated && loadedKey !== requestKey,
        joinRoom,
        leaveRoom,
        createRoom,
        acceptInvite,
        updateRoom,
        refreshRooms: fetchRooms,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRooms must be used within a RoomProvider');
  return context;
};
