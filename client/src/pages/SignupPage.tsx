import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Mail, Lock, User, Phone, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();

  const from = (location.state as any)?.from?.pathname || (location.state as any)?.from || '/dashboard';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    state: '',
    district: '',
    preferredLanguage: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please provide your email address');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await signup(formData);
      navigate(from, { replace: true });
    } catch (err: any) {
      // Catch and log API error responses to console for easier debugging
      console.error('[AgriCare Signup Error]:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        url: err.config?.url,
        method: err.config?.method,
        rawError: err,
      });

      const serverMessage = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        (typeof err.response?.data === 'string' ? err.response?.data : null);

      setError(serverMessage || err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-agri-100 text-agri-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Sprout className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Register Farmer Account</h1>
          <p className="text-xs text-slate-500">Join AgriCare to monitor your crops and receive scientific advisories</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-agri-600 focus:ring-1 focus:ring-agri-600 outline-none text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="farmer@agricare.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-agri-600 focus:ring-1 focus:ring-agri-600 outline-none text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">State</label>
              <input
                type="text"
                placeholder="West Bengal"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-agri-600 outline-none text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">District</label>
              <input
                type="text"
                placeholder="Hooghly"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-agri-600 outline-none text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                placeholder="+91-9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-agri-600 outline-none text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Preferred Language</label>
            <select
              value={formData.preferredLanguage}
              onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value as any })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-agri-600 outline-none text-slate-900"
            >
              <option value="">Select Language</option>
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-agri-600 outline-none text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-agri-700 hover:bg-agri-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Complete Registration</span>}
          </button>
        </form>

        <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-200">
          Already have an account?{' '}
          <Link to="/login" className="text-agri-700 hover:text-agri-800 font-bold">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};
