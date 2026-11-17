import React, { useState } from 'react';
import { ConversationList } from '../../components/chat/ConversationList';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { MessageList } from '../../components/chat/MessageList';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { ConversationSearchModal } from '../../components/chat/ConversationSearchModal';
import { useChat } from '../../context/ChatContext';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Users, Calendar, MapPin, Mail, Shield, X } from 'lucide-react';

export const ChatPage = () => {
  const {
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
    toggleReaction
  } = useChat();

  const [replyingTo, setReplyingTo] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0b10]">
      {/* Left: Conversation List */}
      <ConversationList
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setReplyingTo(null);
        }}
        onNewConversation={() => setActiveConversationId('conv_dm_002')}
      />

      {/* Center: Main Active Conversation Thread */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#0e1017]/50 relative">
        <ChatHeader
          conversation={activeConversation}
          onOpenSearch={() => setShowSearchModal(true)}
          onToggleInfo={() => setShowInfoPanel(!showInfoPanel)}
          showInfo={showInfoPanel}
        />

        <MessageList
          messages={messages}
          isLoading={isLoadingMessages}
          onReply={(msg) => setReplyingTo(msg)}
          onEdit={(id, text) => editMessage(id, text)}
          onDelete={(id) => deleteMessage(id)}
          onToggleReaction={(id, emoji) => toggleReaction(id, emoji)}
        />

        <MessageComposer
          onSend={sendMessage}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          isTyping={isTyping}
          partnerName={activeConversation?.participant?.name || 'Contact'}
        />
      </div>

      {/* Right: Participant / Channel Info Drawer */}
      {showInfoPanel && activeConversation && (
        <div className="w-72 h-full bg-[#0c0e15] border-l border-[#1e2335] p-5 flex flex-col space-y-6 shrink-0 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Details
            </h3>
            <button
              onClick={() => setShowInfoPanel(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeConversation.participant ? (
            <div className="space-y-4">
              <div className="text-center">
                <UserAvatar
                  src={activeConversation.participant.avatar}
                  name={activeConversation.participant.name}
                  status={activeConversation.participant.status}
                  size="xl"
                  showIndicator
                  className="mx-auto mb-3"
                />
                <h4 className="text-base font-bold text-white">{activeConversation.participant.name}</h4>
                <p className="text-xs text-blue-400">@{activeConversation.participant.username}</p>
                <p className="text-xs text-slate-300 mt-1">{activeConversation.participant.statusMessage}</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span>Encrypted Peer Protocol: AES-256-GCM</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" />
                  <span>Zurich / Berlin Node Relay</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-violet-600/20 text-violet-400 flex items-center justify-center text-2xl mx-auto mb-3">
                  {activeConversation.avatar || '⚡'}
                </div>
                <h4 className="text-base font-bold text-white">{activeConversation.title}</h4>
                <p className="text-xs text-slate-400">{activeConversation.memberCount || 5} Participants</p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
                Guild channel for consensus engine design and low-level protocol review.
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-Thread Search Modal */}
      <ConversationSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        messages={messages}
        conversationTitle={activeConversation?.title || 'Conversation'}
      />
    </div>
  );
};
