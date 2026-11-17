import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, MailCheck, ArrowRight, RotateCw, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const EmailVerificationPage = () => {
  const { verifyEmail } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [digits, setDigits] = useState(['5', '2', '8', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleAutofill = () => {
    setDigits(['7', '4', '1', '9', '2', '0']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyEmail(code);
      addToast({
        type: 'success',
        title: 'Account Verified',
        message: 'Your email has been confirmed. Welcome aboard!'
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    addToast({
      type: 'info',
      title: 'Code Resent (Simulation)',
      message: 'A new 6-digit simulation code has been generated.'
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-[0_0_30px_rgba(59,130,246,0.5)] mb-4">
          <MailCheck className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Verify Your Email</h2>
        <p className="mt-1 text-xs text-slate-400">Enter the 6-digit cryptographic verification code</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-dropdown py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-300/90 leading-relaxed">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-200">Email Flow Simulation</span>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                Simulating email token receipt. You can click Autofill or enter any 6 digits.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 6 Digit Inputs */}
            <div className="flex justify-between gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 bg-[#121522] border border-[#24293d] rounded-xl text-center text-xl font-mono font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleAutofill}
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Autofill Valid Code
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Resend Code</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying...' : 'Complete Verification'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-white/5">
            <Link to="/dashboard" className="text-xs text-slate-400 hover:text-white transition-colors">
              Skip for now and enter dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
