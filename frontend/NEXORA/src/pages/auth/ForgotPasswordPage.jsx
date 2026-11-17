import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Send, CheckCircle2, Info } from 'lucide-react';
import { FormField } from '../../components/common/FormField';
import { useAuth } from '../../context/AuthContext';

export const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit reset request.');
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
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Recover Password</h2>
        <p className="mt-1 text-xs text-slate-400">Receive a recovery link to restore account access</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-dropdown py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-300/90 leading-relaxed">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-200">Simulation Notice</span>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                No real emails will be dispatched. You can proceed directly to the reset password page.
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Simulation Link Prepared</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/reset-password"
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all"
                >
                  Proceed to Reset Password Page
                </Link>
                <Link
                  to="/login"
                  className="py-2 px-4 rounded-xl text-slate-400 hover:text-white text-xs transition-all"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <FormField label="Registered Email Address" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 py-2.5 px-3.5 text-sm"
                />
              </FormField>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isLoading ? 'Processing...' : 'Send Recovery Simulation'}</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
