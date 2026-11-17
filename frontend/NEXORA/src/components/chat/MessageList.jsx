import React, { useRef, useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ArrowDown, MessageSquare } from 'lucide-react';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';

export const MessageList = ({
  messages = [],
  isLoading = false,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction
}) => {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll on initial load or new messages
  useEffect(() => {
    if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingState message="Decrypting message history..." />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<MessageSquare className="w-6 h-6 text-blue-400" />}
          title="No messages yet"
          description="Send a message below to start this real-time encrypted conversation."
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-4 space-y-2 relative"
    >
      {/* Date divider pill */}
      <div className="flex items-center justify-center my-4">
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
          Today
        </span>
      </div>

      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleReaction={onToggleReaction}
        />
      ))}

      <div ref={bottomRef} className="h-2" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xl shadow-blue-600/30 transition-all z-20"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>New messages below</span>
        </button>
      )}
    </div>
  );
};
