import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Reply } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { AttachmentPreview } from './AttachmentPreview';

export const MessageComposer = ({
  onSend,
  replyingTo,
  onCancelReply,
  isTyping,
  partnerName = 'Elena',
  onTyping
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingRef = useRef(false);

  // Auto focus input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() && attachments.length === 0) return;

    onSend({
      text: text.trim(),
      attachments,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text
          }
        : null
    });

    setText('');
    setAttachments([]);
    if (typingRef.current && onTyping) {
      typingRef.current = false;
      onTyping(false);
    }
    if (onCancelReply) onCancelReply();
  };

  // Mock file attachment selector
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments = files.map((file) => ({
      id: `att_${Date.now()}_${file.name}`,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type,
      url: URL.createObjectURL(file),
      file
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="relative border-t border-[#1e2335] bg-[#0d0f17]">
      {/* Typing Indicator row */}
      {isTyping && (
        <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-slate-400 bg-blue-950/20 border-b border-blue-500/10">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>{partnerName} is typing...</span>
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-950/30 border-b border-blue-500/20 text-xs">
          <div className="flex items-center gap-2 text-blue-300 min-w-0">
            <Reply className="w-3.5 h-3.5 rotate-180 shrink-0" />
            <span className="font-semibold shrink-0">Replying to {replyingTo.senderName}:</span>
            <span className="text-slate-300 truncate">{replyingTo.text}</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 ml-2 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      <AttachmentPreview
        attachments={attachments}
        onRemove={handleRemoveAttachment}
      />

      {/* Input composer area */}
      <div className="p-3 sm:p-4 flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1 text-slate-400 pb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors"
            title="Attach File or Image"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute left-0 bottom-12 z-40">
                <EmojiPicker
                  onSelect={(emoji) => {
                    setText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);
              const typing = Boolean(next.trim());
              if (onTyping && typing !== typingRef.current) {
                typingRef.current = typing;
                onTyping(typing);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="w-full max-h-32 bg-[#141724] border border-[#24293d] rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() && attachments.length === 0}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
