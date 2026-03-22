import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { MapPin, Calendar, CreditCard, ShieldCheck, Phone, Mail, Instagram } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

export default function Home() {
  const { user } = useAuth();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50 flex flex-col transition-colors duration-300"
    >
      <Navbar />
      
      {/* Main Content Wrapper to push footer to bottom if content is short */}
      <div className="flex-grow">
        {/* Hero Section */}
        <div className="relative w-full min-h-[calc(100vh-64px)] flex items-center justify-center lg:justify-start overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
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

          {/* Text Content */}
          <div className="relative z-20 w-full px-4 sm:px-6 lg:px-24 xl:px-32 flex justify-center lg:justify-start pt-8 lg:pt-0">
            <div 
              className="w-full max-w-2xl rounded-[24px] p-8 sm:p-12 text-center lg:text-left shadow-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl drop-shadow-lg leading-tight">
                <span className="block mb-2">Your Journey,</span>
                <span className="block text-indigo-300">Our Priority</span>
              </h1>
              <p className="mt-6 text-base text-gray-100 sm:text-lg md:text-xl drop-shadow leading-relaxed">
                Experience the best touring and traveling services with Vishal Tour & Travelers. We offer comfortable, safe, and reliable rides for all your needs.
              </p>
              <div className="mt-10 sm:flex sm:justify-center lg:justify-start gap-4">
                <Link
                  to={user ? `/dashboard/${user.role}` : "/register"}
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  {user ? "Book a Ride" : "Book a Ride"}
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-xl text-white transition-all duration-300 hover:bg-white/20 hover:shadow-lg transform hover:-translate-y-0.5"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 bg-white">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-24">
            <div className="lg:text-center">
              <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Why Choose Us</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                A better way to travel
              </p>
            </div>

            <div className="mt-10">
              <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      <MapPin className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Anywhere, Anytime</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    We cover a wide range of locations. Just tell us where you want to go, and we'll get you there.
                  </dd>
                </div>

                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      <Calendar className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Easy Booking</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Our simple booking process ensures you can reserve your ride in just a few clicks.
                  </dd>
                </div>

                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Safe & Secure</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Your safety is our top priority. All our drivers are verified and vehicles are regularly inspected.
                  </dd>
                </div>

                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      <CreditCard className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Transparent Pricing</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    No hidden fees. You know exactly what you'll pay before you book your ride.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <h3 className="text-xl font-bold mb-4">Vishal Tour & Travelers</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Providing reliable, comfortable, and safe travel experiences. Your journey is our priority. Book with us today for a seamless ride.
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <MapPin className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">123 Main Street, City Center<br />State, Country 12345</span>
                </li>
                <li className="flex items-start">
                  <Phone className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">
                    +91 6266440222<br />
                    +91 9589681877
                  </span>
                </li>
                <li className="flex items-center">
                  <Mail className="h-5 w-5 text-indigo-400 mr-3 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">info@vishaltravels.com</span>
                </li>
              </ul>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <p className="text-gray-400 text-sm mb-4">
                Stay updated with our latest offers and travel stories.
              </p>
              <a 
                href="https://www.instagram.com/ertiga__love__8952_seoni?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-300 hover:text-pink-500 transition-colors"
              >
                <Instagram className="h-6 w-6 mr-2" />
                <span className="text-sm font-medium">@ertiga__love__8952_seoni</span>
              </a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Vishal Tour & Travelers. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
