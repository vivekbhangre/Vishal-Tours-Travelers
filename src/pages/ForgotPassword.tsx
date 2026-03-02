import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Map } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.verifyReset({ name, email, phone });
      if (res.success) {
        setUserId(res.userId);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify details. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword({ userId, newPassword });
      navigate('/login', { state: { message: 'Password reset successfully. Please login with your new password.' } });
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1920&q=80"
          alt="Cinematic mountain highway sunset"
          referrerPolicy="no-referrer"
        />
        {/* Dark purple gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/60 to-black/80 z-10"></div>
      </div>

      <div className="relative z-20 sm:mx-auto sm:w-full sm:max-w-md">
        <div 
          className="rounded-[24px] p-8 sm:p-12 shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}
        >
          <div className="flex justify-center mb-6">
            <Link to="/" className="hover:opacity-80 transition-opacity bg-white/10 p-3 rounded-full border border-white/20">
              <Map className="h-10 w-10 text-white" />
            </Link>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-white drop-shadow-md">
            {step === 1 ? 'Reset Password' : 'Create New Password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-200">
            {step === 1 ? 'Enter your details to verify your account.' : 'Please enter your new password below.'}
          </p>

          <form className="mt-8 space-y-6" onSubmit={step === 1 ? handleVerify : handleReset}>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded-xl relative backdrop-blur-sm" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            {step === 1 ? (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-200 ml-1">
                    Full Name
                  </label>
                  <div className="mt-2">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-200 ml-1">
                    Email address
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-200 ml-1">
                    Phone Number
                  </label>
                  <div className="mt-2">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-200 ml-1">
                    New Password
                  </label>
                  <div className="mt-2">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 ml-1">
                    Confirm Password
                  </label>
                  <div className="mt-2">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent sm:text-sm transition-all backdrop-blur-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transform hover:scale-[1.02] transition-all duration-200"
              >
                {loading ? 'Processing...' : step === 1 ? 'Verify Details' : 'Reset Password'}
              </button>
            </div>
            
            {step === 1 && (
              <div className="text-center mt-4">
                <Link to="/login" className="text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors">
                  Back to login
                </Link>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
