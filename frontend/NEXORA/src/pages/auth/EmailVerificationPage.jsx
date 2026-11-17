import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MailCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmailVerificationPage = () => {
  const { resendVerification } = useAuth();
  const [message, setMessage] = useState('If this account needs confirmation, a message is on its way.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await resendVerification();
      setMessage(result.message || 'Verification email sent.');
    } catch (err) {
      setError(err.message || 'Could not resend the email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Confirm your email</h2>
        <p className="mt-2 text-sm text-slate-400">
          Open the link from Supabase, then come back and sign in.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-dropdown py-8 px-6 rounded-3xl border border-white/10 space-y-4 text-center">
          <MailCheck className="w-8 h-8 text-blue-400 mx-auto" />
          <p className="text-sm text-slate-300">{message}</p>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Resend verification email'}
          </button>
          <Link to="/login" className="block text-xs text-blue-400 hover:text-blue-300">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
