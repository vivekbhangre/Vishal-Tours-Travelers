import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProfileSection from '../components/ProfileSection';
import { api, socket } from '../lib/api';
import { parseRideDate, safeFormatDate } from '../lib/validation';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, List, User, Car } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const mainTabParam = searchParams.get('tab') as 'Bookings' | 'Profile' | null;
  const mainTab = mainTabParam || 'Bookings';

  const setMainTab = (tab: 'Bookings' | 'Profile') => {
    setSearchParams({ tab });
    localStorage.setItem('staffMainTab', tab);
  };
  
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('staffActiveTab') || 'All';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const tab = localStorage.getItem('staffMainTab') as 'Bookings' | 'Profile';
      if (tab && !mainTabParam) setMainTab(tab);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [mainTabParam, setSearchParams]);

  useEffect(() => {
    localStorage.setItem('staffActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchBookings();

    socket.on('booking:updated', (updatedBooking) => {
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b));
    });

    socket.on('booking:created', (newBooking) => {
      setBookings(prev => [...prev, newBooking]);
    });

    return () => {
      socket.off('booking:updated');
      socket.off('booking:created');
    };
  }, []);

  const fetchBookings = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const data = await api.getBookings(undefined, false, forceRefresh);
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, field: 'rideStatus' | 'paymentStatus', value: string) => {
    try {
      await api.updateBooking(id, { [field]: value });
    } catch (error) {
      console.error('Failed to update booking:', error);
      toast.error('Failed to update booking status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-indigo-100 text-indigo-800';
      case 'Assigned': return 'bg-purple-100 text-purple-800';
      case 'Ongoing': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status: string) => {
    return status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const visibleBookings = bookings.filter(b => b.rideStatus !== 'Pending');

  const filteredBookings = activeTab === 'All' 
    ? visibleBookings 
    : visibleBookings.filter(b => b.rideStatus === activeTab);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gray-50 transition-colors duration-300"
    >
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome, {user?.name || 'Staff'}</h1>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
                <button
                  onClick={() => fetchBookings(true)}
                  className="w-full md:w-auto inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors whitespace-nowrap"
                >
                  <RefreshCw className={`-ml-1 mr-2 h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : 'text-gray-400'}`} aria-hidden="true" />
                  Refresh Data
                </button>
              </div>
            </div>

            <div className="flex overflow-x-auto sm:flex-nowrap bg-white rounded-xl shadow-sm border border-gray-100 w-full md:w-fit p-1 gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {[
                { id: 'Bookings', label: 'Bookings' },
                { id: 'Profile', label: 'Profile' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id as any)}
                  className={`relative flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap z-10 ${
                    mainTab === tab.id
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {mainTab === tab.id && (
                    <motion.div
                      layoutId="staffMainTab"
                      className="absolute inset-0 bg-indigo-500 rounded-lg z-[-1] shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {mainTab === 'Bookings' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Manage Bookings</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Update ride and payment statuses.</p>
              </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex px-4 space-x-8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" aria-label="Tabs">
                {['All', 'Assigned', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab 
                        ? 'border-indigo-500 text-indigo-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {tab} Rides
                    <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium ${
                      activeTab === tab ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-900'
                    }`}>
                      {tab === 'All' ? visibleBookings.length : visibleBookings.filter(b => b.rideStatus === tab).length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="border-t border-gray-200">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="space-y-3 w-1/3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              ) : filteredBookings.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="p-12 text-center"
                >
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Car className="w-10 h-10 text-indigo-400" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
                  <p className="text-gray-500 text-sm">There are currently no {activeTab !== 'All' ? activeTab.toLowerCase() : ''} bookings to show.</p>
                </motion.div>
              ) : (
                <>
                  {/* Mobile View (Cards) */}
                  <div className="block lg:hidden divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <div key={booking.id} className="bg-white p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {booking.tripType === 'Car Renting'
                                ? `Car Rental: ${booking.numberOfDays} days, ${booking.numberOfCars} cars`
                                : booking.tripType === 'Tour' 
                                ? `${booking.fromLocation} \u2192 ${Array.isArray(booking.destinations) ? booking.destinations.join(', ') : booking.destinations}`
                                : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                            </div>
                            <div className="text-xs text-indigo-600 mt-1 font-medium">
                              {booking.suggestedVehicle || 'Sedan'} {booking.isAC === 'Yes' ? '(AC)' : '(Non-AC)'}
                            </div>
                            {booking.tripType === 'Tour' && <div className="text-xs text-indigo-600 mt-1">{booking.numberOfCars} Vehicle(s)</div>}
                            {booking.tripType === 'Wedding' && booking.weddingDetails && (
                              <div className="text-xs text-pink-600 mt-1">
                                💍 {booking.weddingDetails.vehiclesRequired} Vehicle(s)
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            {safeFormatDate(booking.rideDate, 'MMM d, yyyy')}
                            <br />
                            {safeFormatDate(booking.rideDate, 'h:mm a')}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-gray-500">
                            {booking.userPhone ? (
                              <a href={`tel:${booking.userPhone}`} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1">
                                📞 {booking.userPhone}
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </div>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(booking.paymentStatus)}`}>
                            {booking.paymentStatus}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ride Status</label>
                          <select
                            value={booking.rideStatus}
                            onChange={(e) => handleUpdateStatus(booking.id, 'rideStatus', e.target.value)}
                            className={`block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md ${getStatusColor(booking.rideStatus)}`}
                            disabled={!['Assigned', 'Confirmed', 'Ongoing', 'Completed'].includes(booking.rideStatus) || (booking.rideStatus === 'Completed' && booking.paymentStatus === 'Paid')}
                          >
                            {!['Ongoing', 'Completed'].includes(booking.rideStatus) && (
                              <option className="bg-white text-gray-900" value={booking.rideStatus}>{booking.rideStatus}</option>
                            )}
                            <option className="bg-white text-gray-900" value="Ongoing">Ongoing</option>
                            <option className="bg-white text-gray-900" value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View (Table) */}
                  <div className="hidden lg:block overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Route & Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ride Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {booking.userName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.userPhone ? (
                                <a href={`tel:${booking.userPhone}`} className="text-indigo-600 hover:text-indigo-900">
                                  {booking.userPhone}
                                </a>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {booking.tripType === 'Car Renting'
                                  ? `Car Rental: ${booking.numberOfDays} days, ${booking.numberOfCars} cars`
                                  : booking.tripType === 'Tour' 
                                  ? `${booking.fromLocation} \u2192 ${Array.isArray(booking.destinations) ? booking.destinations.join(', ') : booking.destinations}`
                                  : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                              </div>
                              <div className="text-sm text-gray-500">{safeFormatDate(booking.rideDate, 'PPp')}</div>
                              <div className="text-xs text-indigo-600 mt-1 font-medium">
                                {booking.suggestedVehicle || 'Sedan'} {booking.isAC === 'Yes' ? '(AC)' : '(Non-AC)'}
                              </div>
                              {booking.tripType === 'Tour' && <div className="text-xs text-indigo-600 mt-1">{booking.numberOfCars} Vehicle(s)</div>}
                              {booking.tripType === 'Wedding' && booking.weddingDetails && (
                                <div className="text-xs text-pink-600 mt-1">
                                  💍 {booking.weddingDetails.vehiclesRequired} Vehicle(s)
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={booking.rideStatus}
                                onChange={(e) => handleUpdateStatus(booking.id, 'rideStatus', e.target.value)}
                                className={`mt-1 block w-full min-w-[130px] pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${getStatusColor(booking.rideStatus)}`}
                                disabled={!['Assigned', 'Confirmed', 'Ongoing', 'Completed'].includes(booking.rideStatus) || (booking.rideStatus === 'Completed' && booking.paymentStatus === 'Paid')}
                              >
                                {!['Ongoing', 'Completed'].includes(booking.rideStatus) && (
                                  <option className="bg-white text-gray-900" value={booking.rideStatus}>{booking.rideStatus}</option>
                                )}
                                <option className="bg-white text-gray-900" value="Ongoing">Ongoing</option>
                                <option className="bg-white text-gray-900" value="Completed">Completed</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(booking.paymentStatus)}`}>
                                {booking.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            </div>
          )}

          {mainTab === 'Profile' && (
            <ProfileSection />
          )}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#060608]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 flex justify-around items-center p-3 z-50 overflow-hidden pb-safe">
        <button
          onClick={() => setMainTab('Bookings')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
            mainTab === 'Bookings' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <List className={`w-5 h-5 mb-1 ${mainTab === 'Bookings' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
          <span className="text-[10px] tracking-wide">Bookings</span>
        </button>

        <button
          onClick={() => setMainTab('Profile')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
            mainTab === 'Profile' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <User className={`w-5 h-5 mb-1 ${mainTab === 'Profile' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
          <span className="text-[10px] tracking-wide">Profile</span>
        </button>
      </div>
    </motion.div>
  );
}
