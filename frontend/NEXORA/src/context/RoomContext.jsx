import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { roomService } from '../services/room.service';
import { MOCK_ROOM_CATEGORIES } from '../mocks/rooms';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [rooms, setRooms] = useState([]);
  const [categories] = useState(MOCK_ROOM_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await roomService.getRooms({
        category: activeCategory,
        search: searchQuery,
        filter: filterType
      });
      setRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery, filterType]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const joinRoom = async (roomId) => {
    try {
      const updated = await roomService.joinRoom(roomId, user?.id);
      setRooms(prev => prev.map(r => r.id === roomId ? updated : r));
      addToast({
        type: 'success',
        title: 'Joined Room',
        message: `You are now a member of #${updated.name}.`
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Join Error',
        message: 'Could not join room.'
      });
    }
  };

  const leaveRoom = async (roomId) => {
    try {
      const updated = await roomService.leaveRoom(roomId, user?.id);
      setRooms(prev => prev.map(r => r.id === roomId ? updated : r));
      addToast({
        type: 'info',
        title: 'Left Room',
        message: `You have left #${updated.name}.`
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not leave room.'
      });
    }
  };

  const createRoom = async (payload) => {
    try {
      const newRoom = await roomService.createRoom(payload);
      setRooms(prev => [newRoom, ...prev]);
      addToast({
        type: 'success',
        title: 'Room Created',
        message: `#${newRoom.name} was successfully created.`
      });
      return newRoom;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: 'Failed to create new room.'
      });
      throw err;
    }
  };

  const updateRoom = async (roomId, updates) => {
    try {
      const updated = await roomService.updateRoom(roomId, updates);
      setRooms(prev => prev.map(r => r.id === roomId ? updated : r));
      addToast({
        type: 'success',
        title: 'Room Settings Saved',
        message: 'Room configurations updated successfully.'
      });
      return updated;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update room settings.'
      });
      throw err;
    }
  };

  return (
    <RoomContext.Provider
      value={{
        rooms,
        categories,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        isLoading,
        joinRoom,
        leaveRoom,
        createRoom,
        updateRoom,
        refreshRooms: fetchRooms
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRooms must be used within a RoomProvider');
  }
  return context;
};
