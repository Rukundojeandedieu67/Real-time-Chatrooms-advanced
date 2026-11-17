import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Info } from 'lucide-react';
import { FormField } from '../../components/common/FormField';
import { PasswordInput } from '../../components/common/PasswordInput';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage = () => {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: true
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.acceptTerms) {
      setError('You must accept the terms of service.');
      return;
    }

    try {
      await register({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      navigate('/verify-email');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-[0_0_30px_rgba(59,130,246,0.5)] mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Create NEXORA Account</h2>
        <p className="mt-1 text-xs text-slate-400">Join the real-time communications network</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-dropdown py-8 px-6 sm:px-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-300/90 leading-relaxed">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-200">Frontend Simulation Mode</span>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                No real credentials are sent over the wire. Local mock authentication only.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Full Name" required>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Elena Rostova"
                  required
                  className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 py-2 px-3 text-sm"
                />
              </FormField>

              <FormField label="Username" required>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="elena_r"
                  required
                  className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 py-2 px-3 text-sm"
                />
              </FormField>
            </div>

            <FormField label="Work or Personal Email" required>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="elena@nexora.io"
                required
                className="w-full bg-[#121522] border border-[#24293d] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 py-2.5 px-3 text-sm"
              />
            </FormField>

            <FormField label="Password" required>
              <PasswordInput
                name="password"
                value={formData.password}
                onChange={handleChange}
                showStrengthMeter
                required
              />
            </FormField>

            <FormField label="Confirm Password" required>
              <PasswordInput
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </FormField>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="rounded bg-[#121522] border-[#24293d] text-blue-600 focus:ring-0"
              />
              <span>I agree to the Community Code & Terms of Service</span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{isLoading ? 'Creating Account...' : 'Join NEXORA'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-white/5">
            <p className="text-xs text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold ml-1">
                Sign in to your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
