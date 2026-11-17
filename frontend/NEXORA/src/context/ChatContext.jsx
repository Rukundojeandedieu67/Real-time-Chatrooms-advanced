import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chat.service';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('conv_dm_001');
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) return;

    let isMounted = true;
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const msgs = await chatService.getMessages(activeConversationId);
        if (isMounted) {
          setMessages(msgs);
          await chatService.markAsRead(activeConversationId);
          // Update conversation unread indicator locally
          setConversations(prev =>
            prev.map(c => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c)
          );
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [activeConversationId]);

  // Get currently active conversation object
  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Send message
  const sendMessage = async ({ text, attachments = [], replyTo = null }) => {
    if (!activeConversationId) return null;
    if (!text?.trim() && attachments.length === 0) return null;

    try {
      const newMsg = await chatService.sendMessage({
        conversationId: activeConversationId,
        text: text?.trim(),
        attachments,
        replyTo,
        sender: user
      });

      setMessages(prev => [...prev, newMsg]);

      // Refresh conversation list preview
      loadConversations();

      // Trigger realistic mock reply simulation if it's a DM with Elena or Sarah
      if (activeConversationId === 'conv_dm_001') {
        simulateReply('usr_002', 'Dr. Elena Rostova', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80', [
          'Understood. I will run the convergence tests on the cluster and post the results shortly!',
          'Agreed. Let us also verify the memory consumption under concurrent stream ingestion.',
          'Great suggestion. I just committed the test suite update.'
        ]);
      }

      return newMsg;
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Message Not Sent',
        message: 'Could not send message. Please try again.'
      });
      throw err;
    }
  };

  // Simulated auto-reply helper for interactive demo feel
  const simulateReply = (senderId, senderName, senderAvatar, replies) => {
    setTimeout(() => {
      setIsTyping(true);
    }, 1200);

    setTimeout(async () => {
      setIsTyping(false);
      const randomText = replies[Math.floor(Math.random() * replies.length)];
      const botMsg = await chatService.sendMessage({
        conversationId: activeConversationId,
        text: randomText,
        sender: { id: senderId, name: senderName, avatar: senderAvatar }
      });
      setMessages(prev => [...prev, botMsg]);
      loadConversations();
    }, 3800);
  };

  // Edit message
  const editMessage = async (messageId, newText) => {
    try {
      const updated = await chatService.editMessage({
        conversationId: activeConversationId,
        messageId,
        newText
      });
      if (updated) {
        setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
        addToast({
          type: 'success',
          title: 'Message Edited',
          message: 'Your update has been saved.'
        });
      }
      return updated;
    } catch (err) {
      addToast({ type: 'error', title: 'Edit Failed', message: 'Could not update message.' });
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      await chatService.deleteMessage({
        conversationId: activeConversationId,
        messageId
      });
      setMessages(prev => prev.filter(m => m.id !== messageId));
      addToast({
        type: 'info',
        title: 'Message Removed',
        message: 'The message was deleted from the conversation.'
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Delete Failed', message: 'Could not delete message.' });
    }
  };

  // Toggle reaction
  const toggleReaction = async (messageId, emoji) => {
    try {
      const updated = await chatService.toggleReaction({
        conversationId: activeConversationId,
        messageId,
        emoji,
        userId: user?.id
      });
      if (updated) {
        setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
      }
      return updated;
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        setActiveConversationId,
        activeConversation,
        messages,
        isLoadingMessages,
        isTyping,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        refreshConversations: loadConversations
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
