import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { useRooms } from '../../context/RoomContext';
import { Settings, Save, Shield } from 'lucide-react';

export const RoomSettingsModal = ({ isOpen, onClose, room }) => {
  const { updateRoom } = useRooms();

  const [formData, setFormData] = useState({
    title: room?.title || '',
    topic: room?.topic || '',
    description: room?.description || '',
    rules: room?.rules?.join('\n') || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!room) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateRoom(room.id, {
        title: formData.title,
        topic: formData.topic,
        description: formData.description,
        rules: formData.rules.split('\n').filter((r) => r.trim().length > 0)
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Room Settings — #${room.name}`}
      subtitle="Configure channel metadata, topic banners, and participation rules"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Display Title" required>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
            required
          />
        </FormField>

        <FormField label="Current Topic / Pinned Announcement">
          <input
            type="text"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </FormField>

        <FormField label="Channel Description">
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
        </FormField>

        <FormField label="Channel Rules (One per line)">
          <textarea
            name="rules"
            rows={3}
            value={formData.rules}
            onChange={handleChange}
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
          />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
