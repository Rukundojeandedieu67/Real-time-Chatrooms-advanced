import { useState } from 'react';
import {
  MapPin,
  Calendar,
  Mail,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Modal } from '../../components/common/Modal';
import { FormField } from '../../components/common/FormField';

export const ProfilePage = () => {
  const { user, updateProfile, updatePresence, updatePreferences } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editData, setEditData] = useState({
    name: user?.name || '',
    title: user?.title || '',
    bio: user?.bio || '',
    location: user?.location || '',
    statusMessage: user?.statusMessage || ''
  });

  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: user?.preferences?.showOnlineStatus ?? true,
    readReceipts: user?.preferences?.readReceipts ?? true,
    allowDirectMessages: true
  });

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateProfile(editData);
    setIsEditModalOpen(false);
  };

  const handleTogglePrivacy = (key) => {
    const updated = { ...privacySettings, [key]: !privacySettings[key] };
    setPrivacySettings(updated);
    updatePreferences(updated);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Profile Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-violet-900/40 border border-[#23293e] shadow-2xl">
        <div className="h-36 sm:h-44 w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />

        <div className="p-6 sm:p-8 relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            <div className="relative">
              <UserAvatar
                src={user?.avatar}
                name={user?.name}
                status={user?.status}
                size="xl"
                showIndicator
                className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-[#0a0b10] shadow-2xl"
              />
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {user?.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  {user?.role || 'Member'}
                </span>
              </div>
              <p className="text-xs text-blue-400 font-medium">@{user?.username}</p>
              <p className="text-xs text-slate-300 mt-1">{user?.title}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditData({
                name: user?.name || '',
                title: user?.title || '',
                bio: user?.bio || '',
                location: user?.location || '',
                statusMessage: user?.statusMessage || ''
              });
              setIsEditModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all self-center sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Bio, Stats, Privacy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details & Presence */}
        <div className="space-y-6">
          {/* Presence Selector Card */}
          <div className="p-5 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Presence
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {['online', 'away', 'offline'].map((status) => (
                <button
                  key={status}
                  onClick={() => updatePresence(status)}
                  className={`p-2.5 rounded-xl border text-xs font-medium capitalize flex items-center gap-2 transition-all ${
                    user?.status === status
                      ? 'bg-blue-600/15 border-blue-500/40 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === 'online'
                        ? 'bg-emerald-500'
                        : status === 'away'
                        ? 'bg-amber-500'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span>{status}</span>
                </button>
              ))}
            </div>

            {user?.statusMessage && (
              <p className="text-xs text-slate-400 italic pt-1">
                "{user.statusMessage}"
              </p>
            )}
          </div>

          {/* Info Card */}
          <div className="p-5 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Identity Metadata
            </h3>
            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{user?.location || 'Remote Node'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Member since {user?.joinedDate || '2024'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right Column: Biography & Privacy Controls */}
        <div className="md:col-span-2 space-y-6">
          {/* Biography Card */}
          <div className="p-6 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Technical Biography
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {user?.bio || 'Building resilient decentralized communication protocols.'}
            </p>
          </div>

          {/* Activity Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#121522]/60 border border-[#23293e] text-center">
              <p className="text-xl font-extrabold text-blue-400">{user?.stats?.roomsJoined ?? '—'}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Rooms Joined</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#121522]/60 border border-[#23293e] text-center">
              <p className="text-xl font-extrabold text-violet-400">{user?.stats?.messagesSent ?? '—'}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Messages Sent</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#121522]/60 border border-[#23293e] text-center">
              <p className="text-xl font-extrabold text-emerald-400">{user?.stats?.reactionsGiven ?? '—'}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Reactions Given</span>
            </div>
          </div>

          {/* Privacy & Profile Controls */}
          <div className="p-6 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Profile Privacy & Telemetry
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Broadcast Online Presence</p>
                  <p className="text-[11px] text-slate-400">
                    Allow connected members to view when your node is active.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.showOnlineStatus}
                  onChange={() => handleTogglePrivacy('showOnlineStatus')}
                  className="rounded bg-[#121522] border-[#24293d] text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Message Read Receipts</p>
                  <p className="text-[11px] text-slate-400">
                    Notify sender when their encrypted message has been opened.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.readReceipts}
                  onChange={() => handleTogglePrivacy('readReceipts')}
                  className="rounded bg-[#121522] border-[#24293d] text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Accept Direct Messages from Anyone</p>
                  <p className="text-[11px] text-slate-400">
                    Allow new channel peers to initiate direct conversations.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowDirectMessages}
                  onChange={() => handleTogglePrivacy('allowDirectMessages')}
                  className="rounded bg-[#121522] border-[#24293d] text-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Identity"
        subtitle="Update your visible name, title, and technical biography"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <FormField label="Display Name" required>
            <input
              type="text"
              name="name"
              value={editData.name}
              onChange={handleEditChange}
              className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </FormField>

          <FormField label="Job Title / Role">
            <input
              type="text"
              name="title"
              value={editData.title}
              onChange={handleEditChange}
              className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </FormField>

          <FormField label="Status Custom Message">
            <input
              type="text"
              name="statusMessage"
              value={editData.statusMessage}
              onChange={handleEditChange}
              className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </FormField>

          <FormField label="Location">
            <input
              type="text"
              name="location"
              value={editData.location}
              onChange={handleEditChange}
              className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </FormField>

          <FormField label="Biography">
            <textarea
              name="bio"
              rows={3}
              value={editData.bio}
              onChange={handleEditChange}
              className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 py-2 px-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
            >
              Save Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
