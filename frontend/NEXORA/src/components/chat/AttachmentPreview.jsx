import React from 'react';
import { X, FileText, Image as ImageIcon, FileCode } from 'lucide-react';

export const AttachmentPreview = ({ attachments = [], onRemove }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-[#1e2335] bg-[#0c0e15]">
      {attachments.map((att, idx) => {
        const isImage = att.type?.startsWith('image') || att.type === 'image';
        return (
          <div
            key={idx}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200"
          >
            {isImage ? (
              <img
                src={att.url}
                alt={att.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            )}
            <div className="max-w-[120px] truncate">
              <p className="truncate font-medium">{att.name}</p>
              <p className="text-[10px] text-slate-400">{att.size}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
