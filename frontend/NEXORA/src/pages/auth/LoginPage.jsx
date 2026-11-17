import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { FormField } from '../../components/common/FormField';
import { PasswordInput } from '../../components/common/PasswordInput';
import { useAuth } from '../../context/AuthContext';

export const LoginPage = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: 'alex.rivera@nexora.io',
    password: 'password123',
    rememberMe: true
  });
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

    try {
      await login({
        email: formData.email,
        password: formData.password
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleUseDemo = () => {
    setFormData({
      email: 'alex.rivera@nexora.io',
      password: 'password123',
      rememberMe: true
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Background ambient glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-[0_0_30px_rgba(59,130,246,0.5)] mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign in to NEXORA</h2>
        <p className="mt-1 text-xs text-slate-400">Connect beyond boundaries • Next-gen platform</p>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-dropdown py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Simulated Mode Banner */}
          <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-300/90 leading-relaxed">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-200">Frontend Simulation Mode</span>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                Authentication runs locally via mock services. Ready for later Django REST integration.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address" required>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
                className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/80 py-2.5 px-3.5 text-sm"
              />
            </FormField>

            <FormField label="Password" required>
              <PasswordInput
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="rounded bg-[#121522] border-[#24293d] text-blue-600 focus:ring-0"
                />
                <span>Remember session</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials shortcut */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleUseDemo}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all text-center flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Autofill Demo Credentials (Alex Rivera)</span>
            </button>
          </div>

          <div className="text-center pt-2 border-t border-white/5">
            <p className="text-xs text-slate-400">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold ml-1">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
