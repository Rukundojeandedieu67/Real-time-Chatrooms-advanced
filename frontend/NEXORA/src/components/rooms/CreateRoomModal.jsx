import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { useRooms } from '../../context/RoomContext';
import { Hash, Lock, Globe, Sparkles } from 'lucide-react';

export const CreateRoomModal = ({ isOpen, onClose }) => {
  const { categories, createRoom } = useRooms();

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    category: categories[1] || 'AI & Robotics',
    description: '',
    topic: '',
    isPrivate: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide a room channel name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRoom(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        title: '',
        category: categories[1] || 'AI & Robotics',
        description: '',
        topic: '',
        isPrivate: false
      });
    } catch (err) {
      setError(err.message || 'Failed to create room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Chatroom"
      subtitle="Establish a new public topic or private encrypted channel"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Room Name */}
        <FormField label="Room Handle / Slug" required helperText="Lowercase, alphanumeric with hyphens (e.g. quantum-algorithms)">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">#</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="distributed-consensus"
              className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 py-2.5 pl-8 pr-3.5 text-sm"
              required
            />
          </div>
        </FormField>

        {/* Room Title */}
        <FormField label="Display Title" required>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Distributed Consensus & Raft Protocols"
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 py-2.5 px-3.5 text-sm"
            required
          />
        </FormField>

        {/* Category */}
        <FormField label="Category" required>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 focus:outline-none focus:border-blue-500/80 py-2.5 px-3.5 text-sm"
          >
            {categories.filter(c => c !== 'All').map((cat) => (
              <option key={cat} value={cat} className="bg-[#121522] text-white">
                {cat}
              </option>
            ))}
          </select>
        </FormField>

        {/* Description */}
        <FormField label="Description">
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            placeholder="Briefly state what this room is about..."
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 py-2.5 px-3.5 text-sm resize-none"
          />
        </FormField>

        {/* Topic Header */}
        <FormField label="Initial Topic / Header Notice">
          <input
            type="text"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            placeholder="e.g. Discussing state machine replication latency"
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 py-2.5 px-3.5 text-sm"
          />
        </FormField>

        {/* Privacy Selector */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${formData.isPrivate ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {formData.isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {formData.isPrivate ? 'Private Room (Invite Only)' : 'Public Room'}
              </p>
              <p className="text-[11px] text-slate-400">
                {formData.isPrivate ? 'Only invited members can view and join.' : 'Any member in the NEXORA network can discover and join.'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Creating Room...' : 'Create Chatroom'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
