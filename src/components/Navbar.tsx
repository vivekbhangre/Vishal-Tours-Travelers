import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { LogOut, User as UserIcon, Map, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200 sticky top-0 z-50 transition-colors duration-300">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-24">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <Map className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900 truncate">Vishal Tour & Travelers</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden sm:flex sm:items-center space-x-4">
            
            {user ? (
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <button 
                  onClick={() => {
                    if (user.role === 'customer') {
                      localStorage.setItem('customerActiveTab', 'profile');
                      navigate(`/dashboard/${user.role}`);
                      window.dispatchEvent(new Event('storage'));
                    }
                  }}
                  className="flex items-center text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md transition-colors cursor-pointer"
                >
                  <UserIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">{user.name}</span>
                </button>
                <button
                  onClick={() => {
                    if (user.role === 'customer') {
                      localStorage.setItem('customerActiveTab', 'dashboard');
                    } else if (user.role === 'admin') {
                      localStorage.setItem('adminMainTab', 'Bookings');
                    }
                    navigate(`/dashboard/${user.role}`);
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-1" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden space-x-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (user.role === 'customer') {
                      localStorage.setItem('customerActiveTab', 'profile');
                      navigate(`/dashboard/${user.role}`);
                      window.dispatchEvent(new Event('storage'));
                    }
                  }}
                  className="w-full text-left px-4 py-2 flex items-center text-gray-700 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <UserIcon className="h-5 w-5 mr-2" />
                  <span className="text-base font-medium">{user.name}</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (user.role === 'customer') {
                      localStorage.setItem('customerActiveTab', 'dashboard');
                    } else if (user.role === 'admin') {
                      localStorage.setItem('adminMainTab', 'Bookings');
                    }
                    navigate(`/dashboard/${user.role}`);
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-base font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
