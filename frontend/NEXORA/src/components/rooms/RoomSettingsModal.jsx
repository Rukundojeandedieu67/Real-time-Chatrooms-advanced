import { useState } from 'react';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { useRooms } from '../../context/RoomContext';
import { roomService } from '../../services/room.service';
import { Save } from 'lucide-react';

export const RoomSettingsModal = ({ isOpen, onClose, room }) => {
  const { updateRoom, refreshRooms } = useRooms();

  const [formData, setFormData] = useState({
    title: room?.name || '',
    description: room?.description || '',
    isPrivate: Boolean(room?.isPrivate),
  });
  const [inviteCode, setInviteCode] = useState('');
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
        name: formData.title,
        description: formData.description,
        isPrivate: formData.isPrivate,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvite = async () => {
    const invite = await roomService.createInvite(room.id);
    setInviteCode(invite.code);
  };

  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await roomService.uploadAvatar(room.id, file);
    await refreshRooms();
  };

  const canManage = room.myRole === 'owner' || room.myRole === 'admin';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Room Settings — #${room.name}`}
      subtitle="Configure channel metadata, topic banners, and participation rules"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Room name" required>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
            required
          />
        </FormField>

        <FormField label="Description">
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
        </FormField>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            name="isPrivate"
            checked={formData.isPrivate}
            onChange={(event) => setFormData((prev) => ({ ...prev, isPrivate: event.target.checked }))}
          />
          Private room
        </label>

        {canManage && (
          <div className="space-y-2 rounded-xl border border-[#24293d] p-3">
            <label className="text-xs text-slate-300">
              Room image
              <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" onChange={handleAvatar} />
            </label>
            <button type="button" onClick={handleInvite} className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white">
              Create invite code
            </button>
            {inviteCode && (
              <p className="text-xs text-emerald-300 break-all">Invite code: {inviteCode}</p>
            )}
          </div>
        )}

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
