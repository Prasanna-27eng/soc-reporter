import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../App';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const params = new URLSearchParams();
        params.append('username', form.username);
        params.append('password', form.password);
        const res = await api.post('/api/auth/login', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        login(res.data.access_token, res.data.username);
        toast.success('Welcome back, ' + res.data.username);
        navigate('/dashboard');
      } else {
        const res = await api.post('/api/auth/register', form);
        login(res.data.access_token, res.data.username);
        toast.success('Account created. Welcome!');
        navigate('/dashboard');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(', '));
      } else {
        setError(detail || err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-soc-bg flex items-center justify-center p-4">
      {/* Background grid effect */}
      <div className="fixed inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#00C8E8 1px, transparent 1px), linear-gradient(90deg, #00C8E8 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-soc-cyan/10 border border-soc-cyan/30 mb-4 glow">
            <Shield className="text-soc-cyan" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">SOC Reporter</h1>
          <p className="text-soc-muted text-sm mt-1">AI-Powered Incident Response Platform</p>
        </div>

        {/* Card */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex rounded-lg bg-soc-surface p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm rounded-md font-medium transition-all capitalize ${
                  mode === m ? 'bg-soc-cyan text-soc-bg' : 'text-soc-muted hover:text-soc-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-soc-muted mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-soc-surface border border-soc-border rounded-lg px-4 py-2.5 text-sm text-soc-text placeholder-soc-muted focus:outline-none focus:border-soc-cyan transition-colors"
                placeholder="analyst"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-soc-muted mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-soc-surface border border-soc-border rounded-lg px-4 py-2.5 pr-10 text-sm text-soc-text placeholder-soc-muted focus:outline-none focus:border-soc-cyan transition-colors"
                  placeholder="min 8 characters"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soc-muted hover:text-soc-text">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-soc-cyan text-soc-bg font-semibold py-2.5 rounded-lg text-sm hover:bg-soc-cyan-dim transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-soc-muted mt-4">
          SOC Report Automator — Built for security analysts
        </p>
      </div>
    </div>
  );
}
