import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { validateEmail, validatePassword } from '../lib/validation';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // For admin, we might not want to restrict domains, so pass false
    const emailError = validateEmail(email, false);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const user = await api.login({ email, password });
      
      if (user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }
      
      login(user);
      navigate(`/dashboard/admin`);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[100dvh] relative flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 overflow-y-auto"
    >
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1920&q=80"
          alt="Cinematic mountain highway sunset"
          referrerPolicy="no-referrer"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-indigo-900/20 mix-blend-multiply z-10"></div>
      </div>

      <div className="relative z-20 w-full max-w-md mx-auto">
        <div 
          className="rounded-[24px] p-6 sm:p-12 shadow-2xl w-full"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}
        >
          <div className="flex justify-center mb-6">
            <Link to="/" className="hover:opacity-80 transition-opacity bg-white/10 p-3 rounded-full border border-white/20">
              <ShieldCheck className="h-10 w-10 text-white" />
            </Link>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-white drop-shadow-md">
            Admin Portal
          </h2>

          <form className="mt-6 sm:mt-8 space-y-3 sm:space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded-xl relative backdrop-blur-sm" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 ml-1">
                Admin Email
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 ml-1">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transform hover:scale-[1.02] transition-all duration-200"
              >
                {loading ? 'Signing in...' : 'Sign in as Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
