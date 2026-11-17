import React, { useState } from 'react';
import {
  MoreVertical,
  Reply,
  Smile,
  Pencil,
  Trash2,
  Copy,
  Check,
  FileText,
  Download
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { ReactionBar } from './ReactionBar';
import { EmojiPicker } from './EmojiPicker';
import { useAuth } from '../../context/AuthContext';

export const MessageBubble = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction
}) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [copied, setCopied] = useState(false);

  const isCurrentUser = user && message.senderId === user.id;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`group relative flex gap-3 px-4 py-2 hover:bg-white/[0.02] transition-colors rounded-xl ${
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Sender Avatar */}
      <UserAvatar
        src={message.senderAvatar}
        name={message.senderName}
        size="sm"
        className="mt-0.5 shrink-0"
      />

      {/* Message Content Area */}
      <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {/* Sender Info & Timestamp */}
        <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs font-semibold text-slate-200">{message.senderName}</span>
          <span className="text-[10px] text-slate-400">{formatTime(message.timestamp)}</span>
          {message.edited && (
            <span className="text-[10px] text-slate-400 italic">(edited)</span>
          )}
        </div>

        {/* Reply Quote Banner */}
        {message.replyTo && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 mb-1.5 rounded-lg border text-xs ${
              isCurrentUser
                ? 'bg-blue-950/30 border-blue-500/30 text-blue-300'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <Reply className="w-3 h-3 text-slate-400 rotate-180 shrink-0" />
            <span className="font-semibold">{message.replyTo.senderName}:</span>
            <span className="truncate max-w-[200px]">{message.replyTo.text}</span>
          </div>
        )}

        {/* Message Bubble Body */}
        {isEditing ? (
          <div className="w-full min-w-[260px] space-y-2 mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="w-full bg-[#121522] border border-blue-500/50 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words ${
              isCurrentUser
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none'
                : 'bg-[#151825] text-slate-200 border border-[#23293e] rounded-tl-none'
            }`}
          >
            {message.text}

            {/* Attachments inside bubble */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((att, idx) => {
                  const isImage = att.type === 'image' || att.url?.match(/\.(jpeg|jpg|gif|png)$/i);
                  return isImage ? (
                    <div key={idx} className="rounded-xl overflow-hidden border border-white/10 max-w-sm">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-auto max-h-64 object-cover hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                        onClick={() => window.open(att.url, '_blank')}
                      />
                    </div>
                  ) : (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 border border-white/10 text-xs text-slate-200"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400">{att.size}</p>
                      </div>
                      <a
                        href={att.url}
                        download={att.name}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reactions Row */}
        <ReactionBar
          reactions={message.reactions}
          onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
        />
      </div>

      {/* Floating Action Menu on Hover */}
      <div
        className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 p-1 glass-dropdown rounded-xl border border-white/10 shadow-lg z-20 ${
          isCurrentUser ? 'left-6' : 'right-6'
        }`}
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="React"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onReply(message)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Copy Text"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {isCurrentUser && (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Emoji picker dropdown */}
        {showEmojiPicker && (
          <div className="absolute right-0 top-8 z-30">
            <EmojiPicker
              onSelect={(emoji) => {
                onToggleReaction(message.id, emoji);
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
