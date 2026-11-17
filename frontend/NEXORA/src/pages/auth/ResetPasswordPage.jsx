import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, KeyRound, CheckCircle2 } from 'lucide-react';
import { FormField } from '../../components/common/FormField';
import { PasswordInput } from '../../components/common/PasswordInput';
import { useAuth } from '../../context/AuthContext';

export const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();

  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-[0_0_30px_rgba(59,130,246,0.5)] mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h2>
        <p className="mt-1 text-xs text-slate-400">Establish strong cryptographic credentials</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-dropdown py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Password Updated</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your password has been updated. Sign in with the new one.
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all"
              >
                Sign In with New Password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <FormField label="Security Reset Token" helperText="Pre-filled for simulation demonstration">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-400 font-mono text-xs py-2 px-3 focus:outline-none"
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

              <FormField label="Confirm New Password" required>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </FormField>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Updating...' : 'Save New Password'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
