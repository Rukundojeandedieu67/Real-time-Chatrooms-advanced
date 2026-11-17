import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chat.service';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadedRoomId, setLoadedRoomId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState('');
  const [typingRoomId, setTypingRoomId] = useState(null);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      setActiveConversationId((current) => current || data[0]?.id || null);
    } catch (err) {
      console.error('Failed to load rooms', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    chatService
      .getConversations()
      .then((data) => {
        if (!active) return;
        setConversations(data);
        setActiveConversationId((current) => current || data[0]?.id || null);
      })
      .catch((err) => console.error('Failed to load rooms', err));
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!activeConversationId || !isAuthenticated) return undefined;

    let active = true;
    const roomId = activeConversationId;
    const fetchMessages = async (silent = false) => {
      try {
        const msgs = await chatService.getMessages(roomId, user?.id);
        if (!active) return;
        setMessages(msgs);
        setLoadedRoomId(roomId);
        const latest = msgs[msgs.length - 1];
        if (latest && !silent) {
          chatService.markAsRead(roomId, latest.id).catch(() => {});
          setConversations((prev) =>
            prev.map((item) => (item.id === roomId ? { ...item, unreadCount: 0 } : item))
          );
        }
        const typing = await chatService.getTyping(roomId);
        if (!active) return;
        const others = typing.filter((item) => item.user_id !== user?.id);
        setIsTyping(others.length > 0);
        setTypingName(others[0]?.display_name || '');
        setTypingRoomId(roomId);
      } catch (err) {
        if (!silent) console.error('Failed to load messages', err);
        if (active) setLoadedRoomId(roomId);
      }
    };

    fetchMessages();
    const timer = setInterval(() => fetchMessages(true), 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [activeConversationId, isAuthenticated, user?.id]);

  const activeConversation = (isAuthenticated ? conversations : []).find((item) => item.id === activeConversationId) || null;
  const visibleMessages = loadedRoomId === activeConversationId ? messages : [];
  const visibleTyping = typingRoomId === activeConversationId && isTyping;

  const sendMessage = async ({ text, attachments = [], replyTo = null }) => {
    if (!activeConversationId) return null;
    if (!text?.trim() && attachments.length === 0) return null;
    try {
      const newMsg = await chatService.sendMessage({
        conversationId: activeConversationId,
        text: text?.trim(),
        attachments,
        replyTo,
        sender: user,
      });
      setMessages((prev) => (prev.some((item) => item.id === newMsg.id) ? prev : [...prev, newMsg]));
      loadConversations();
      return newMsg;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Message not sent',
        message: err.message || 'Could not send message.',
      });
      throw err;
    }
  };

  const editMessage = async (messageId, newText) => {
    try {
      const updated = await chatService.editMessage({
        messageId,
        newText,
        senderId: user?.id,
      });
      setMessages((prev) => prev.map((item) => (item.id === messageId ? updated : item)));
      return updated;
    } catch (err) {
      addToast({ type: 'error', title: 'Edit failed', message: err.message || 'Could not update message.' });
      return null;
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const updated = await chatService.deleteMessage({ messageId, senderId: user?.id });
      setMessages((prev) => prev.map((item) => (item.id === messageId ? updated : item)));
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.message || 'Could not delete message.' });
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    try {
      const updated = await chatService.toggleReaction({
        messageId,
        emoji,
        userId: user?.id,
      });
      setMessages((prev) => prev.map((item) => (item.id === messageId ? updated : item)));
      return updated;
    } catch (err) {
      addToast({ type: 'error', title: 'Reaction failed', message: err.message || 'Could not update reaction.' });
      return null;
    }
  };

  const notifyTyping = (isTypingNow) => {
    if (!activeConversationId) return;
    chatService.setTyping(activeConversationId, isTypingNow).catch(() => {});
  };

  return (
    <ChatContext.Provider
      value={{
        conversations: isAuthenticated ? conversations : [],
        activeConversationId,
        setActiveConversationId,
        activeConversation,
        messages: visibleMessages,
        isLoadingMessages: Boolean(activeConversationId && isAuthenticated && loadedRoomId !== activeConversationId),
        isTyping: visibleTyping,
        typingName,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        notifyTyping,
        refreshConversations: loadConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
