import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { MapPin, Calendar, CreditCard, ShieldCheck, Phone, Mail, Instagram, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import GenuineIndiaMap from '../components/GenuineIndiaMap';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleRouteClick = (destination: string) => {
    const routes: Record<string, any> = {
      'Chhindwara': {
        from: { name: 'Seoni', city: 'Seoni', state: 'Madhya Pradesh', country: 'India', lat: 22.0869, lng: 79.5435, displayName: 'Seoni, Madhya Pradesh, India' },
        to: { name: 'Chhindwara', city: 'Chhindwara', state: 'Madhya Pradesh', country: 'India', lat: 22.0574, lng: 78.9382, displayName: 'Chhindwara, Madhya Pradesh, India' }
      },
      'Nagpur': {
        from: { name: 'Seoni', city: 'Seoni', state: 'Madhya Pradesh', country: 'India', lat: 22.0869, lng: 79.5435, displayName: 'Seoni, Madhya Pradesh, India' },
        to: { name: 'Nagpur', city: 'Nagpur', state: 'Maharashtra', country: 'India', lat: 21.1458, lng: 79.0882, displayName: 'Nagpur, Maharashtra, India' }
      },
      'Jabalpur': {
        from: { name: 'Seoni', city: 'Seoni', state: 'Madhya Pradesh', country: 'India', lat: 22.0869, lng: 79.5435, displayName: 'Seoni, Madhya Pradesh, India' },
        to: { name: 'Jabalpur', city: 'Jabalpur', state: 'Madhya Pradesh', country: 'India', lat: 23.1815, lng: 79.9864, displayName: 'Jabalpur, Madhya Pradesh, India' }
      }
    };

    localStorage.setItem('pendingRoute', JSON.stringify(routes[destination]));
    
    if (user) {
      if (user.role === 'customer') {
        localStorage.setItem('customerActiveTab', 'dashboard');
      }
      navigate(`/dashboard/${user.role}`);
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col transition-colors duration-300">
      <Navbar />
      
      {/* Main Content Wrapper to push footer to bottom if content is short */}
      <div className="flex-grow">
        {/* Hero Section */}
        <div className="relative w-full min-h-[calc(100dvh-64px)] flex items-center justify-center lg:justify-start overflow-hidden bg-gray-900">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <GenuineIndiaMap />
          </div>

          {/* Text Content */}
          <div className="relative z-20 w-full px-4 sm:px-6 lg:px-24 xl:px-32 flex justify-center lg:justify-start pt-8 lg:pt-0">
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full max-w-2xl rounded-3xl p-8 sm:p-12 text-center lg:text-left shadow-2xl relative overflow-hidden bg-white/30 backdrop-blur-xl border border-white/50"
            >
              {/* Subtle noise overlay for premium glass feel */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
              
              <h1 className="relative z-10 text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl drop-shadow-sm leading-tight">
                <span className="block mb-2">Your Journey,</span>
                <span className="block text-indigo-600">Our Priority</span>
              </h1>
              <p className="relative z-10 mt-6 text-base text-gray-700 sm:text-lg md:text-xl drop-shadow-sm leading-relaxed font-light">
                Experience the best touring and traveling services with Vishal Tour & Travelers. We offer comfortable, safe, and reliable rides for all your needs.
              </p>
              <div className="relative z-10 mt-10 sm:flex sm:justify-center lg:justify-start gap-4">
                <Link
                  to={user ? `/dashboard/${user.role}` : "/register"}
                  className="group w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] transform hover:-translate-y-1 transition-all duration-300"
                >
                  {user ? "Book a Ride" : "Book a Ride"}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-xl text-gray-900 bg-white/50 transition-all duration-300 hover:bg-white/80 hover:shadow-lg transform hover:-translate-y-1 border border-gray-200"
                  >
                    Login
                  </Link>
                )}
              </div>
            </motion.div>
          </div>

          {/* Smooth Blend/Blur into next section */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-48 z-20 pointer-events-none bg-gradient-to-t from-gray-50 to-transparent"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 100%)',
              maskImage: 'linear-gradient(to top, black 10%, transparent 100%)'
            }}
          ></div>
        </div>

        {/* Features Section - Bento Grid */}
        <div className="py-24 bg-gray-50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-sm text-indigo-600 font-bold tracking-widest uppercase mb-3">Why Choose Us</h2>
              <p className="text-4xl leading-tight font-extrabold text-gray-900 sm:text-5xl">
                A better way to travel
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Bento Box */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300"
              >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors duration-500"></div>
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 border border-indigo-100">
                    <MapPin className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Anywhere, Anytime</h3>
                  <p className="text-gray-600 text-lg leading-relaxed max-w-md">
                    We cover a wide range of locations. Just tell us where you want to go, and we'll get you there safely and comfortably.
                  </p>
                </div>
              </motion.div>

              {/* Small Bento Box 1 */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300"
              >
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-green-50 rounded-full blur-2xl group-hover:bg-green-100 transition-colors duration-500"></div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-6 border border-green-200">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Easy Booking</h3>
                  <p className="text-gray-600">
                    Our simple booking process ensures you can reserve your ride in just a few clicks.
                  </p>
                </div>
              </motion.div>

              {/* Small Bento Box 2 */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors duration-500"></div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-6 border border-red-200">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Safe & Secure</h3>
                  <p className="text-gray-600">
                    Your safety is our top priority. All our drivers are verified and vehicles are regularly inspected.
                  </p>
                </div>
              </motion.div>

              {/* Medium Bento Box */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden group flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-md transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                  <CreditCard className="h-8 w-8" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Transparent Pricing</h3>
                  <p className="text-gray-600 text-lg">
                    No hidden fees. You know exactly what you'll pay before you book your ride. We believe in fair and honest pricing for all our customers.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Popular Intercity Routes Section */}
        <div className="py-16 sm:py-24 bg-white transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div className="max-w-2xl">
                <h2 className="text-sm text-indigo-600 font-bold tracking-widest uppercase mb-3">Top Destinations</h2>
                <p className="text-3xl leading-tight font-extrabold text-gray-900 sm:text-4xl">
                  Popular Intercity Routes
                </p>
              </div>
              <Link to="/routes" className="mt-4 md:mt-0 inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-500 transition-colors group">
                View all routes
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Seoni to Chhindwara */}
              <motion.div
                onClick={() => handleRouteClick('Chhindwara')}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative h-72 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-shadow"
              >
                <img 
                  src="/images/chhindwara.png" 
                  alt="Chhindwara" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    // Fallback to Unsplash if the local image isn't uploaded yet
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1626684496076-07e23c6361ff?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="flex justify-between items-end gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#ffffff] flex items-center gap-2 mb-2">
                        Seoni <ArrowRight className="h-5 w-5 text-indigo-400 flex-shrink-0" /> <span className="truncate">Chhindwara</span>
                      </h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#ffffff]/20 backdrop-blur-md text-[#ffffff] text-sm font-medium border border-[#ffffff]/10 whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        50 Mins
                      </div>
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-600 text-[#ffffff] text-sm font-bold shadow-lg whitespace-nowrap flex-shrink-0">
                      From ₹2200
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Seoni to Nagpur */}
              <motion.div
                onClick={() => handleRouteClick('Nagpur')}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative h-72 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-shadow"
              >
                <img 
                  src="/images/nagpur.png" 
                  alt="Nagpur" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    // Fallback to Unsplash if the local image isn't uploaded yet
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555505019-8c3f1c4aba5f?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="flex justify-between items-end gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#ffffff] flex items-center gap-2 mb-2">
                        Seoni <ArrowRight className="h-5 w-5 text-indigo-400 flex-shrink-0" /> <span className="truncate">Nagpur</span>
                      </h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#ffffff]/20 backdrop-blur-md text-[#ffffff] text-sm font-medium border border-[#ffffff]/10 whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        2.0 Hours
                      </div>
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-600 text-[#ffffff] text-sm font-bold shadow-lg whitespace-nowrap flex-shrink-0">
                      From ₹4000
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: Seoni to Jabalpur */}
              <motion.div
                onClick={() => handleRouteClick('Jabalpur')}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="relative h-72 rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-shadow"
              >
                <img 
                  src="/images/jabalpur.png" 
                  alt="Jabalpur" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    // Fallback to Unsplash if the local image isn't uploaded yet
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1586899028174-e7098604235b?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="flex justify-between items-end gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#ffffff] flex items-center gap-2 mb-2">
                        Seoni <ArrowRight className="h-5 w-5 text-indigo-400 flex-shrink-0" /> <span className="truncate">Jabalpur</span>
                      </h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#ffffff]/20 backdrop-blur-md text-[#ffffff] text-sm font-medium border border-[#ffffff]/10 whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        2.6 Hours
                      </div>
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-600 text-[#ffffff] text-sm font-bold shadow-lg whitespace-nowrap flex-shrink-0">
                      From ₹4300
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="bg-white text-gray-900 py-16 border-t border-gray-200 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* About */}
            <div>
              <h3 className="text-2xl font-bold mb-6 font-heading">Vishal Tour & Travelers</h3>
              <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
                Providing reliable, comfortable, and safe travel experiences. Your journey is our priority. Book with us today for a seamless ride.
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-gray-800">Contact Us</h3>
              <ul className="space-y-4">
                <li className="flex items-start group">
                  <div className="p-2 bg-gray-50 rounded-lg mr-4 group-hover:bg-indigo-50 transition-colors border border-transparent">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="text-gray-600 text-sm mt-1">123 Main Street, City Center<br />State, Country 12345</span>
                </li>
                <li className="flex items-start group">
                  <div className="p-2 bg-gray-50 rounded-lg mr-4 group-hover:bg-indigo-50 transition-colors border border-transparent">
                    <Phone className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="text-gray-600 text-sm mt-1">
                    +91 6266440222<br />
                    +91 9589681877
                  </span>
                </li>
                <li className="flex items-center group">
                  <div className="p-2 bg-gray-50 rounded-lg mr-4 group-hover:bg-indigo-50 transition-colors border border-transparent">
                    <Mail className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="text-gray-600 text-sm">info@vishaltravels.com</span>
                </li>
              </ul>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-gray-800">Follow Us</h3>
              <p className="text-gray-600 text-sm mb-6">
                Stay updated with our latest offers and travel stories.
              </p>
              <a 
                href="https://www.instagram.com/ertiga__love__8952_seoni?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-700 hover:text-pink-600 transition-all duration-300 border border-gray-200 hover:border-pink-500/30"
              >
                <Instagram className="h-5 w-5 mr-3" />
                <span className="text-sm font-medium">@ertiga__love__8952_seoni</span>
              </a>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Vishal Tour & Travelers. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link to="/privacy" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
