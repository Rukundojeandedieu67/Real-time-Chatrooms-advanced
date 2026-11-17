import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Palette,
  Bell,
  KeyRound,
  Laptop,
  Smartphone,
  LogOut,
  Check,
  Volume2,
  Lock,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FormField } from '../../components/common/FormField';
import { PasswordInput } from '../../components/common/PasswordInput';
import { Modal } from '../../components/common/Modal';

export const SettingsPage = () => {
  const { user, updatePreferences, logout } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'account' | 'notifications' | 'security' | 'sessions'

  // Appearance state
  const [accent, setAccent] = useState('blue');
  const [fontSize, setFontSize] = useState('medium');
  const [soundEnabled, setSoundEnabled] = useState(user?.preferences?.soundEnabled ?? true);

  // Notification state
  const [desktopNotifs, setDesktopNotifs] = useState(user?.preferences?.desktopNotifications ?? true);
  const [emailDigest, setEmailDigest] = useState(user?.preferences?.emailDigest || 'weekly');

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Active sessions mock list
  const [sessions, setSessions] = useState([
    {
      id: 'sess_01',
      device: 'MacBook Pro 16" (M3 Max)',
      browser: 'Brave Browser 1.68',
      location: 'Zurich, Switzerland',
      ip: '194.230.14.88',
      isCurrent: true,
      lastActive: 'Active Now'
    },
    {
      id: 'sess_02',
      device: 'iPhone 15 Pro',
      browser: 'NEXORA Mobile Web',
      location: 'Zurich, Switzerland',
      ip: '194.230.14.90',
      isCurrent: false,
      lastActive: '2 hours ago'
    },
    {
      id: 'sess_03',
      device: 'Workstation Linux (Arch)',
      browser: 'Firefox 128',
      location: 'Frankfurt, Germany',
      ip: '85.214.132.11',
      isCurrent: false,
      lastActive: '3 days ago'
    }
  ]);

  const handleSaveAppearance = () => {
    updatePreferences({ accentColor: accent, fontSize, soundEnabled });
  };

  const handleSaveNotifications = () => {
    updatePreferences({ desktopNotifications: desktopNotifs, emailDigest });
  };

  const handleRevokeSession = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    addToast({
      type: 'info',
      title: 'Session Revoked',
      message: 'The selected device session token was invalidated.'
    });
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'New password must be at least 8 characters long.'
      });
      return;
    }
    setShowPasswordModal(false);
    setOldPassword('');
    setNewPassword('');
    addToast({
      type: 'success',
      title: 'Password Changed',
      message: 'Your cryptographic password has been updated (Simulated).'
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#1e2335]">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white tracking-tight">System Preferences</h1>
        </div>
        <p className="text-xs text-slate-400">
          Tailor NEXORA appearance, audio cues, security keys, and active session telemetry.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e2335] pb-3 overflow-x-auto">
        {[
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'account', label: 'Account & Credentials', icon: KeyRound },
          { id: 'notifications', label: 'Notifications & Audio', icon: Bell },
          { id: 'security', label: 'Privacy & Security', icon: Shield },
          { id: 'sessions', label: 'Active Sessions', icon: Laptop }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 shadow-sm'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Interface Color Accents
            </h3>
            <p className="text-xs text-slate-400">
              Select the primary neon aura that highlights active channels, badges, and focus rings.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'blue', label: 'Electric Blue', class: 'from-blue-600 to-indigo-600' },
                { id: 'violet', label: 'Ultraviolet', class: 'from-violet-600 to-fuchsia-600' },
                { id: 'cyan', label: 'Cyan Plasma', class: 'from-cyan-500 to-blue-500' },
                { id: 'emerald', label: 'Matrix Emerald', class: 'from-emerald-500 to-teal-500' }
              ].map((color) => (
                <button
                  key={color.id}
                  onClick={() => setAccent(color.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    accent === color.id
                      ? 'bg-white/10 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-full h-8 rounded-xl bg-gradient-to-r ${color.class} mb-2 shadow-sm`} />
                  <p className="text-xs font-bold text-white">{color.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Display Typography & Density
            </h3>

            <div className="flex items-center gap-3">
              {['compact', 'medium', 'comfortable'].map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                    fontSize === size
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {size} Density
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveAppearance}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all"
              >
                Apply Appearance Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Account Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Registered Email</label>
                <input
                  type="text"
                  disabled
                  value={user?.email || 'alex.rivera@nexora.io'}
                  className="w-full bg-[#161a29] border border-[#24293d] rounded-xl text-slate-300 py-2 px-3 text-xs opacity-75"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Username Handle</label>
                <input
                  type="text"
                  disabled
                  value={`@${user?.username || 'alex_rivera'}`}
                  className="w-full bg-[#161a29] border border-[#24293d] rounded-xl text-slate-300 py-2 px-3 text-xs opacity-75"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all"
              >
                Change Account Password
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Delivery Channels
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Browser Desktop Notifications</p>
                  <p className="text-[11px] text-slate-400">
                    Receive OS push toasts when direct messages or mentions occur.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={desktopNotifs}
                  onChange={() => setDesktopNotifs(!desktopNotifs)}
                  className="rounded bg-[#121522] border-[#24293d] text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Audio Chimes & Cues</p>
                  <p className="text-[11px] text-slate-400">
                    Play subtle haptic chimes on incoming packets and reactions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={() => setSoundEnabled(!soundEnabled)}
                  className="rounded bg-[#121522] border-[#24293d] text-blue-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveNotifications}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#121522]/80 border border-[#23293e] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Cryptography & 2FA
            </h3>
            <p className="text-xs text-slate-400">
              Hardware key authentication and time-based one-time password (TOTP) verification.
            </p>

            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Two-Factor Authentication Active</p>
                  <p className="text-[11px] text-emerald-300/80">Protected via Authenticator App</p>
                </div>
              </div>

              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Enabled
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Connected Nodes ({sessions.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-[#121522]/80 border border-[#23293e]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                    {sess.device.includes('iPhone') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{sess.device}</p>
                      {sess.isCurrent && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold border border-emerald-500/20">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {sess.browser} • {sess.location} ({sess.ip})
                    </p>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(sess.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-all"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Update Account Password"
        subtitle="Provide current password to verify identity"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <FormField label="Current Password" required>
            <PasswordInput
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </FormField>

          <FormField label="New Password" required>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              showStrengthMeter
              required
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
