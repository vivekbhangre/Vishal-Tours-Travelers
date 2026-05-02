import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProfileSection from '../components/ProfileSection';
import { api, socket } from '../lib/api';
import { validateEmail, validateName, validatePhone, validateVehicleNumber, parseRideDate, safeFormatDate } from '../lib/validation';
import { format } from 'date-fns';
import { Download, TrendingUp, RefreshCw, ChevronDown, Car, List, DollarSign, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const mainTabParam = searchParams.get('tab') as 'Bookings' | 'Fleet' | 'Revenue' | 'Profile' | null;
  const mainTab = mainTabParam || 'Bookings';

  const setMainTab = (tab: 'Bookings' | 'Fleet' | 'Revenue' | 'Profile') => {
    setSearchParams({ tab });
    localStorage.setItem('adminMainTab', tab);
  };
  
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'All';
  });
  
  const [selectedRevenueYear, setSelectedRevenueYear] = useState<number>(() => {
    const saved = localStorage.getItem('adminRevenueYear');
    return saved ? parseInt(saved) : new Date().getFullYear();
  });
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState<number | 'All'>(() => {
    const saved = localStorage.getItem('adminRevenueMonth');
    return saved === 'All' ? 'All' : (saved ? parseInt(saved) : 'All');
  });

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<{driverId: string, vehicleId: string}[]>([{driverId: '', vehicleId: ''}]);
  const [assigning, setAssigning] = useState(false);
  const setAssignError = (msg: string) => { if (msg) toast.error(msg); };
  const [addingDriver, setAddingDriver] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [confirmDeleteDriverId, setConfirmDeleteDriverId] = useState<string | null>(null);
  const [confirmDeleteVehicleId, setConfirmDeleteVehicleId] = useState<string | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const tab = localStorage.getItem('adminMainTab') as 'Bookings' | 'Fleet' | 'Revenue' | 'Profile';
      if (tab && !mainTabParam) setMainTab(tab);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [mainTabParam, setSearchParams]);

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('adminRevenueYear', selectedRevenueYear.toString());
  }, [selectedRevenueYear]);

  useEffect(() => {
    localStorage.setItem('adminRevenueMonth', selectedRevenueMonth.toString());
  }, [selectedRevenueMonth]);

  useEffect(() => {
    fetchBookings();
    fetchRevenue();
    fetchFleetData();

    socket.on('booking:updated', (updatedBooking) => {
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? {...b, ...updatedBooking} : b));
      fetchFleetData(); // Refresh fleet data to update availability
    });

    socket.on('booking:created', (newBooking) => {
      setBookings(prev => [...prev, newBooking]);
    });

    socket.on('revenue:updated', () => {
      fetchRevenue(true);
    });

    return () => {
      socket.off('booking:updated');
      socket.off('booking:created');
      socket.off('revenue:updated');
    };
  }, []);

  const fetchFleetData = async (forceRefresh: boolean = false) => {
    try {
      const [vData, dData] = await Promise.all([
        api.getVehicles(forceRefresh),
        api.getDrivers(forceRefresh)
      ]);
      setVehicles(vData);
      setDrivers(dData);
    } catch (error) {
      console.error('Failed to fetch fleet data:', error);
    }
  };

  const fetchBookings = async (forceRefresh: boolean = false) => {
    try {
      const data = await api.getBookings(undefined, true, forceRefresh);
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async (forceRefresh: boolean = false) => {
    try {
      const data = await api.getRevenueLogs(forceRefresh);
      // Format data for chart
      const formattedData = data.map((item: any) => {
        const monthIndex = new Date(`${item.month} 1, 2000`).getMonth();
        return {
          name: `${item.month} ${item.year}`,
          amount: item.amount,
          year: parseInt(item.year) || new Date().getFullYear(),
          monthIndex: isNaN(monthIndex) ? -1 : monthIndex
        };
      });
      setRevenueData(formattedData);
    } catch (error) {
      console.error('Failed to fetch revenue:', error);
    }
  };

  const handleGlobalRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchBookings(true),
      fetchRevenue(true),
      fetchFleetData(true)
    ]);
    setLoading(false);
  };

  const handleDownloadReport = () => {
    api.downloadMonthlyReport();
  };

  const handleUpdateStatus = async (id: string, field: 'rideStatus' | 'paymentStatus' | 'refundStatus' | 'refundAmount', value: string) => {
    console.log(`handleUpdateStatus called with id: ${id}, field: ${field}, value: ${value}`);
    
    const booking = bookings.find(b => b.id === id);
    let payload: any = { [field]: value, isAdmin: true };

    if (field === 'rideStatus' && value === 'Cancelled' && booking) {
      const rideDate = parseRideDate(booking.rideDate);
      const now = new Date();
      const diffInHours = (rideDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const fareAmount = parseFloat(booking.fareAmount || '0');
      const days = typeof booking.numberOfDays === 'number' ? booking.numberOfDays : (parseInt(booking.numberOfDays as string) || 1);
      const isMultiDay = days > 1;

      let refundAmount = 0;
      if (diffInHours >= 24 && diffInHours <= 72) {
        const percent = isMultiDay ? 25 : 50;
        refundAmount = (fareAmount * percent) / 100;
      } else if (diffInHours > 72) {
        const percent = isMultiDay ? 50 : 85;
        refundAmount = (fareAmount * percent) / 100;
      }

      if (refundAmount > 0) {
        payload.refundStatus = 'No Refund';
        payload.refundAmount = refundAmount;
        
        // Automatically update to Pending after 10 seconds
        setTimeout(async () => {
          // Optimistic UI for the Pending update
          setBookings(prev => prev.map(b => b.id === id ? { ...b, refundStatus: 'Pending' } : b));
          try {
            await api.updateBooking(id, { refundStatus: 'Pending', isAdmin: true });
          } catch (err) {
            console.error("Failed to automatically update refund status to Pending:", err);
            // Revert optimistic update
            fetchBookings();
          }
        }, 10000);
      } else {
        payload.refundStatus = 'No Refund';
        payload.refundAmount = 0;
      }
    }

    // Optimistic update
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...payload } : b));
    
    try {
      await api.updateBooking(id, payload);
      console.log(`Successfully called api.updateBooking for ${field}`);
    } catch (error) {
      console.error('Failed to update booking:', error);
      toast.error('Failed to update booking status');
      // Revert optimistic update by fetching bookings again
      fetchBookings();
    }
  };

  const openAssignModal = (booking: any) => {
    setSelectedBookingId(booking.id);
    
    const requestedCars = booking.tripType === 'Wedding' && booking.weddingDetails 
      ? parseInt(booking.weddingDetails.vehiclesRequired) || 1 
      : (booking.tripType === 'Tour' || booking.tripType === 'Car Renting' ? Number(booking.numberOfCars) || 1 : 1);

    let initialAssignments = [];
    if (booking.assignments && booking.assignments.length > 0) {
      initialAssignments = booking.assignments.map((a: any) => ({
        driverId: drivers.find(d => d.email === a.driverEmail)?.id || '',
        vehicleId: a.vehicleId || ''
      }));
    } else if (booking.assignedDriverEmail || booking.assignedVehicleId) {
      initialAssignments = [{
        driverId: drivers.find(d => d.email === booking.assignedDriverEmail)?.id || '',
        vehicleId: booking.assignedVehicleId || ''
      }];
    }

    while (initialAssignments.length < requestedCars) {
      initialAssignments.push({ driverId: '', vehicleId: '' });
    }
    if (initialAssignments.length > requestedCars) {
      initialAssignments = initialAssignments.slice(0, requestedCars);
    }

    setAssignments(initialAssignments);
    setIsAssignModalOpen(true);
  };

  const handleAssignDriver = async () => {
    if (!selectedBookingId) return;
    
    const booking = bookings.find(b => b.id === selectedBookingId);
    const isCarRenting = booking?.tripType === 'Car Renting';
    
    // Validate that all assignments have at least a driver or a vehicle
    const isValid = assignments.every(a => a.driverId || a.vehicleId);
    if (!isValid) {
      setAssignError('Please select at least a driver or a vehicle for all required assignments.');
      return;
    }
    
    setAssigning(true);
    
    try {
      await api.assignDriver(selectedBookingId, assignments[0].driverId, assignments[0].vehicleId, assignments);
      setIsAssignModalOpen(false);
      // Data will be updated via socket
    } catch (error: any) {
      setAssignError(error.message || 'Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  // Calculate stats
  const totalRides = bookings.length;
  const completedRides = bookings.filter(b => b.rideStatus === 'Completed').length;
  const pendingRides = bookings.filter(b => b.rideStatus === 'Pending').length;
  const confirmedRides = bookings.filter(b => b.rideStatus === 'Confirmed').length;
  const ongoingRides = bookings.filter(b => b.rideStatus === 'Ongoing').length;
  const cancelledRides = bookings.filter(b => b.rideStatus === 'Cancelled').length;
  const totalRevenue = bookings.filter(b => b.paymentStatus === 'Paid').reduce((sum, b) => {
    const fare = parseFloat(b.fareAmount || '0');
    const refund = b.refundStatus === 'Processed' ? parseFloat(b.refundAmount?.toString() || '0') : 0;
    return sum + fare - refund;
  }, 0);

  const getStatusColor = (status: string, refundStatus?: string) => {
    if (status === 'Cancelled' && refundStatus === 'Processed') {
      return 'bg-purple-100 text-purple-800';
    }
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

  const filteredBookings = activeTab === 'All' 
    ? bookings 
    : bookings.filter(b => b.rideStatus === activeTab);

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
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome, {user?.name || 'Admin'}</h1>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
                <button
                  onClick={handleGlobalRefresh}
                  className="w-full md:w-auto inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors whitespace-nowrap"
                >
                  <RefreshCw className={`-ml-1 mr-2 h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : 'text-gray-400'}`} aria-hidden="true" />
                  Refresh Data
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="w-full md:w-auto inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors whitespace-nowrap"
                >
                  <Download className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                  Download Monthly Report
                </button>
              </div>
            </div>

            <div className="flex overflow-x-auto sm:flex-nowrap bg-white rounded-xl shadow-sm border border-gray-100 w-full md:w-fit p-1 gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {[
                { id: 'Bookings', label: 'Bookings' },
                { id: 'Fleet', label: 'Fleet Management' },
                { id: 'Revenue', label: 'Revenue' },
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
                      layoutId="adminMainTab"
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
            <>
              {/* Stats Layout */}
              <div className="flex overflow-x-auto pb-4 -mb-4 lg:grid lg:grid-cols-6 gap-4 sm:gap-5 mb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl min-w-[140px] flex-shrink-0 lg:flex-shrink">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                <dd className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{totalRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow-sm border border-emerald-100 rounded-xl min-w-[140px] flex-shrink-0 lg:flex-shrink">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                <dd className="mt-1 text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{completedRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow-sm border border-blue-100 rounded-xl min-w-[140px] flex-shrink-0 lg:flex-shrink">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Ongoing</dt>
                <dd className="mt-1 text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">{ongoingRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow-sm border border-red-100 rounded-xl min-w-[140px] flex-shrink-0 lg:flex-shrink">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                <dd className="mt-1 text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">{cancelledRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow-sm border border-amber-100 rounded-xl min-w-[140px] flex-shrink-0 lg:flex-shrink">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                <dd className="mt-1 text-2xl sm:text-3xl font-bold text-amber-500 tracking-tight">{pendingRides}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow-sm border border-indigo-100 rounded-xl min-w-[140px] flex-shrink-0 lg:flex-shrink">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Confirmed</dt>
                <dd className="mt-1 text-2xl sm:text-3xl font-bold text-indigo-600 tracking-tight">{confirmedRides}</dd>
              </div>
            </div>
          </div>

          {/* All Bookings List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">All Bookings</h3>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex px-4 space-x-8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" aria-label="Tabs">
                {['All', 'Pending', 'Confirmed', 'Assigned', 'Ongoing', 'Completed', 'Cancelled'].map((tab) => (
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
                      {tab === 'All' ? bookings.length : bookings.filter(b => b.rideStatus === tab).length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 md:bg-white">
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
                        <div 
                          className="flex justify-between items-start cursor-pointer" 
                          onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {booking.tripType === 'Car Renting'
                                ? `Car Rental: ${booking.numberOfDays} days, ${booking.numberOfCars} cars`
                                : booking.tripType === 'Tour' 
                                ? `${booking.fromLocation} \u2192 ${booking.destinations}`
                                : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-xs text-gray-500 text-right">
                              {safeFormatDate(booking.rideDate, 'MMM d, yyyy')}
                              <br />
                              {safeFormatDate(booking.rideDate, 'h:mm a')}
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-400 mt-2 transition-transform ${expandedBookingId === booking.id ? 'transform rotate-180' : ''}`} />
                          </div>
                        </div>
                        
                        {expandedBookingId === booking.id && (
                          <div className="pt-3 border-t border-gray-100 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
                                <select
                                  value={booking.rideStatus}
                                  onChange={(e) => handleUpdateStatus(booking.id, 'rideStatus', e.target.value)}
                                  className={`block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md ${getStatusColor(booking.rideStatus, booking.refundStatus)}`}
                                  disabled={!['Pending', 'Confirmed'].includes(booking.rideStatus)}
                                >
                                  <option className="bg-white text-gray-900" value="Pending">Pending</option>
                                  <option className="bg-white text-gray-900" value="Confirmed">Confirmed</option>
                                  {!['Pending', 'Confirmed'].includes(booking.rideStatus) && (
                                    <option className="bg-white text-gray-900" value={booking.rideStatus}>
                                      {booking.rideStatus === 'Cancelled' && booking.refundStatus === 'Processed' ? 'Refunded' : booking.rideStatus}
                                    </option>
                                  )}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Payment</label>
                                <select
                                  value={booking.paymentStatus}
                                  onChange={(e) => handleUpdateStatus(booking.id, 'paymentStatus', e.target.value)}
                                  className={`block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md ${getPaymentColor(booking.paymentStatus)}`}
                                  disabled={booking.rideStatus === 'Completed' && booking.paymentStatus === 'Paid'}
                                >
                                  <option className="bg-white text-gray-900" value="Not Paid">Not Paid</option>
                                  <option className="bg-white text-gray-900" value="Paid">Paid</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-xs text-gray-500 uppercase block">Trip Type</span>
                                <span className="font-medium text-gray-900">{booking.tripType}</span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 uppercase block">Vehicle</span>
                                <span className="font-medium text-gray-900 flex items-center gap-1.5">
                                  <Car className="w-4 h-4 text-gray-400" />
                                  {booking.suggestedVehicle} {booking.isAC === 'Yes' ? '(AC)' : ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 uppercase block">Distance</span>
                                <span className="font-medium text-gray-900">{booking.estimatedKM}</span>
                              </div>
                              {booking.tripType !== 'Car Renting' && (
                                <div>
                                  <span className="text-xs text-gray-500 uppercase block">Passengers</span>
                                  <span className="font-medium text-gray-900">{booking.numberOfPeople}</span>
                                </div>
                              )}
                              {booking.tripType === 'Tour' && (
                                <div>
                                  <span className="text-xs text-gray-500 uppercase block">Vehicles</span>
                                  <span className="font-medium text-gray-900">{booking.numberOfCars}</span>
                                </div>
                              )}
                              <div className="col-span-2">
                                <span className="text-xs text-gray-500 uppercase block">Contact</span>
                                <span className="font-medium text-gray-900">{booking.userPhone} | {booking.userEmail}</span>
                              </div>
                              {booking.tripType === 'Wedding' && booking.weddingDetails && (
                                <div className="col-span-2 bg-pink-50 p-3 rounded-md border border-pink-100 mt-2">
                                  <span className="text-xs text-pink-600 uppercase font-bold block mb-2">💍 Wedding Details</span>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-gray-500">Location:</span> <span className="font-medium">{booking.weddingDetails.eventLocation}</span></div>
                                    <div><span className="text-gray-500">Vehicles:</span> <span className="font-medium">{booking.weddingDetails.vehiclesRequired}</span></div>
                                    <div className="col-span-2"><span className="text-gray-500">Decoration:</span> <span className="font-medium">{booking.weddingDetails.decorationRequired}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                              <div>
                                <span className="text-xs text-gray-500 uppercase block">Fare</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">₹{parseFloat(booking.fareAmount).toFixed(2)}</span>
                                  {booking.isAC === 'Yes' && <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">AC</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase block mb-1">Driver</span>
                                {booking.assignments && booking.assignments.length > 0 ? (
                                  <div className="flex flex-col items-end space-y-2">
                                    {booking.assignments.map((assignment: any, idx: number) => (
                                      <div key={idx} className="flex flex-col items-end border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                        {booking.assignments.length > 1 && <span className="text-[10px] text-gray-400 font-medium">Vehicle {idx + 1}</span>}
                                        {assignment.driverDetails ? (
                                          <span className="text-xs font-medium text-gray-900">{assignment.driverDetails.name}</span>
                                        ) : assignment.driverEmail ? (
                                          <span className="text-xs font-medium text-gray-900">{assignment.driverEmail}</span>
                                        ) : null}
                                        {assignment.vehicleDetails ? (
                                          <span className="text-xs text-gray-500">{assignment.vehicleDetails.name} ({assignment.vehicleDetails.number})</span>
                                        ) : assignment.vehicleId ? (
                                          <span className="text-xs text-gray-500">{assignment.vehicleId}</span>
                                        ) : null}
                                      </div>
                                    ))}
                                    {!['Completed', 'Cancelled'].includes(booking.rideStatus) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openAssignModal(booking); }}
                                        className="mt-1 text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                                      >
                                        Change Assignment
                                      </button>
                                    )}
                                  </div>
                                ) : booking.assignedDriverEmail || booking.assignedVehicleId ? (
                                  <div className="flex flex-col items-end space-y-1">
                                    {booking.driverDetails ? (
                                      <span className="text-xs font-medium text-gray-900">{booking.driverDetails.name}</span>
                                    ) : booking.assignedDriverEmail ? (
                                      <span className="text-xs font-medium text-gray-900">{booking.assignedDriverEmail}</span>
                                    ) : null}
                                    {booking.vehicleDetails ? (
                                      <span className="text-xs text-gray-500">{booking.vehicleDetails.name} ({booking.vehicleDetails.number})</span>
                                    ) : booking.assignedVehicleId ? (
                                      <span className="text-xs text-gray-500">{booking.assignedVehicleId}</span>
                                    ) : null}
                                    {!['Completed', 'Cancelled'].includes(booking.rideStatus) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openAssignModal(booking); }}
                                        className="mt-1 text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                                      >
                                        Change Driver
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  !['Completed', 'Cancelled'].includes(booking.rideStatus) ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openAssignModal(booking); }}
                                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                      Assign Details
                                    </button>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-400">Unassigned</span>
                                  )
                                )}
                              </div>
                            </div>

                            {booking.rideStatus === 'Cancelled' && (
                              <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-100">
                                <h4 className="text-xs font-bold text-red-800 uppercase mb-2">Refund Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-red-600 block text-xs">Status</span>
                                    <select
                                      value={booking.refundStatus || 'No Refund'}
                                      onChange={(e) => handleUpdateStatus(booking.id, 'refundStatus', e.target.value)}
                                      className="mt-1 block w-full pl-3 pr-10 py-1 text-xs border-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md bg-white text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={booking.refundStatus === 'Processed'}
                                    >
                                      <option value="No Refund">No Refund</option>
                                      <option value="Pending">Pending</option>
                                      <option value="Processed">Processed</option>
                                    </select>
                                  </div>
                                  <div>
                                    <span className="text-red-600 block text-xs">Amount (₹)</span>
                                    <div className="mt-1 block w-full pl-3 pr-2 py-1 text-xs border border-red-200 rounded-md bg-red-50 text-red-900 font-bold">
                                      {booking.refundAmount !== undefined && booking.refundAmount !== null ? parseFloat(booking.refundAmount.toString()).toFixed(2) : '0.00'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        )}
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
                          Route
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fare
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Driver & Vehicle
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <React.Fragment key={booking.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.userName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.tripType === 'Car Renting'
                              ? `Car Rental: ${booking.numberOfDays} days, ${booking.numberOfCars} cars`
                              : booking.tripType === 'Tour' 
                              ? `${booking.fromLocation} \u2192 ${Array.isArray(booking.destinations) ? booking.destinations.join(', ') : booking.destinations}`
                              : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                            {booking.tripType === 'Tour' && <div className="text-xs text-indigo-600 mt-1">{booking.numberOfCars} Vehicle(s)</div>}
                            {booking.tripType === 'Wedding' && booking.weddingDetails && (
                              <div className="text-xs text-pink-600 mt-1">
                                💍 {booking.weddingDetails.vehiclesRequired} Vehicle(s)
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
                              <Car className="w-3.5 h-3.5 text-gray-400" />
                              {booking.suggestedVehicle || 'Sedan'} {booking.isAC === 'Yes' ? '(AC)' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {safeFormatDate(booking.rideDate, 'PPp')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={booking.rideStatus}
                              onChange={(e) => handleUpdateStatus(booking.id, 'rideStatus', e.target.value)}
                              className={`mt-1 block w-full min-w-[130px] pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${getStatusColor(booking.rideStatus, booking.refundStatus)}`}
                              disabled={!['Pending', 'Confirmed'].includes(booking.rideStatus)}
                            >
                              <option className="bg-white text-gray-900" value="Pending">Pending</option>
                              <option className="bg-white text-gray-900" value="Confirmed">Confirmed</option>
                              {!['Pending', 'Confirmed'].includes(booking.rideStatus) && (
                                <option className="bg-white text-gray-900" value={booking.rideStatus}>
                                  {booking.rideStatus === 'Cancelled' && booking.refundStatus === 'Processed' ? 'Refunded' : booking.rideStatus}
                                </option>
                              )}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={booking.paymentStatus}
                              onChange={(e) => handleUpdateStatus(booking.id, 'paymentStatus', e.target.value)}
                              className={`mt-1 block w-full min-w-[130px] pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${getPaymentColor(booking.paymentStatus)}`}
                              disabled={booking.rideStatus === 'Completed' && booking.paymentStatus === 'Paid'}
                            >
                              <option className="bg-white text-gray-900" value="Not Paid">Not Paid</option>
                              <option className="bg-white text-gray-900" value="Paid">Paid</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-col">
                              <span>₹{parseFloat(booking.fareAmount).toFixed(2)}</span>
                              {booking.isAC === 'Yes' && <span className="text-xs text-blue-600 font-medium">AC Vehicle</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.assignments && booking.assignments.length > 0 ? (
                              <div className="flex flex-col space-y-2">
                                {booking.assignments.map((assignment: any, idx: number) => (
                                  <div key={idx} className="flex flex-col border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                    {booking.assignments.length > 1 && <span className="text-[10px] text-gray-400 font-medium">Vehicle {idx + 1}</span>}
                                    {assignment.driverDetails ? (
                                      <span className="text-xs font-medium text-gray-900">{assignment.driverDetails.name}</span>
                                    ) : assignment.driverEmail ? (
                                      <span className="text-xs font-medium text-gray-900">{assignment.driverEmail}</span>
                                    ) : null}
                                    {assignment.vehicleDetails ? (
                                      <span className="text-xs text-gray-500">{assignment.vehicleDetails.name} ({assignment.vehicleDetails.number})</span>
                                    ) : assignment.vehicleId ? (
                                      <span className="text-xs text-gray-500">{assignment.vehicleId}</span>
                                    ) : null}
                                  </div>
                                ))}
                                {!['Completed', 'Cancelled'].includes(booking.rideStatus) && (
                                  <button
                                    onClick={() => openAssignModal(booking)}
                                    className="mt-1 text-xs text-indigo-600 hover:text-indigo-900 font-medium text-left"
                                  >
                                    Change Assignment
                                  </button>
                                )}
                              </div>
                            ) : booking.assignedDriverEmail || booking.assignedVehicleId ? (
                              <div className="flex flex-col space-y-1">
                                {booking.driverDetails ? (
                                  <span className="text-xs font-medium text-gray-900">{booking.driverDetails.name}</span>
                                ) : booking.assignedDriverEmail ? (
                                  <span className="text-xs font-medium text-gray-900">{booking.assignedDriverEmail}</span>
                                ) : null}
                                {booking.vehicleDetails ? (
                                  <span className="text-xs text-gray-500">{booking.vehicleDetails.name} ({booking.vehicleDetails.number})</span>
                                ) : booking.assignedVehicleId ? (
                                  <span className="text-xs text-gray-500">{booking.assignedVehicleId}</span>
                                ) : null}
                                {!['Completed', 'Cancelled'].includes(booking.rideStatus) && (
                                  <button
                                    onClick={() => openAssignModal(booking)}
                                    className="mt-1 text-xs text-indigo-600 hover:text-indigo-900 font-medium text-left"
                                  >
                                    Change Driver
                                  </button>
                                )}
                              </div>
                            ) : (
                              !['Completed', 'Cancelled'].includes(booking.rideStatus) ? (
                                <button
                                  onClick={() => openAssignModal(booking)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  Assign Details
                                </button>
                              ) : (
                                <span className="text-gray-400">Unassigned</span>
                              )
                            )}
                          </td>
                        </tr>
                        {booking.rideStatus === 'Cancelled' && (
                          <tr key={`${booking.id}-refund`} className="bg-red-50">
                            <td colSpan={7} className="px-6 py-3 border-t border-red-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <h4 className="text-xs font-bold text-red-800 uppercase">Refund Details</h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-600 text-xs font-medium">Status:</span>
                                    <select
                                      value={booking.refundStatus || 'No Refund'}
                                      onChange={(e) => handleUpdateStatus(booking.id, 'refundStatus', e.target.value)}
                                      className="block w-32 pl-2 pr-8 py-1 text-xs border-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md bg-white text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={booking.refundStatus === 'Processed'}
                                    >
                                      <option value="No Refund">No Refund</option>
                                      <option value="Pending">Pending</option>
                                      <option value="Processed">Processed</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600 text-xs font-medium">Amount (₹):</span>
                                  <div className="block w-24 pl-2 pr-2 py-1 text-xs border border-red-200 rounded-md bg-red-50 text-red-900 font-bold">
                                    {booking.refundAmount !== undefined && booking.refundAmount !== null ? parseFloat(booking.refundAmount.toString()).toFixed(2) : '0.00'}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </div>
          </div>
          </>
          )}
          
          {mainTab === 'Fleet' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Fleet Management</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Drivers Column */}
                <div className="space-y-8">
                  {/* Add Driver Form */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Add New Driver</h4>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (addingDriver) return;
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const name = formData.get('name') as string;
                      const phone = formData.get('phone') as string;
                      const email = formData.get('email') as string;

                      const nameError = validateName(name);
                      if (nameError) {
                        toast.error(nameError);
                        return;
                      }

                      const phoneError = validatePhone(phone);
                      if (phoneError) {
                        toast.error(phoneError);
                        return;
                      }

                      const emailError = validateEmail(email, false);
                      if (emailError) {
                        toast.error(emailError);
                        return;
                      }

                      setAddingDriver(true);
                      try {
                        await api.addDriver({ name, phone, email });
                        form.reset();
                        await fetchFleetData();
                        toast.success('Driver added successfully!');
                      } catch (err: any) {
                        toast.error(`Failed to add driver: ${err.message || 'Unknown error'}`);
                      } finally {
                        setAddingDriver(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" name="name" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                        <input type="email" name="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input 
                          type="tel" 
                          name="phone" 
                          required 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 10) {
                              e.target.value = val;
                            } else {
                              e.target.value = val.slice(0, 10);
                            }
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                        />
                      </div>
                      <button type="submit" disabled={addingDriver} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                        {addingDriver ? 'Adding...' : 'Add Driver'}
                      </button>
                    </form>
                  </div>

                  {/* Current Drivers List */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Current Drivers</h4>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                        {drivers.map((driver) => (
                          <li key={driver.id} className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-indigo-600 truncate">{driver.name}</p>
                              <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${driver.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {driver.status}
                                </p>
                                {confirmDeleteDriverId === driver.id ? (
                                  <div className="flex items-center space-x-2">
                                    <button
                                      disabled={deletingDriverId === driver.id}
                                      onClick={async () => {
                                        setDeletingDriverId(driver.id);
                                        try {
                                          await api.deleteDriver(driver.id);
                                          setConfirmDeleteDriverId(null);
                                          await fetchFleetData();
                                        } catch (err: any) {
                                          console.error(err);
                                        } finally {
                                          setDeletingDriverId(null);
                                        }
                                      }}
                                      className="text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                                    >
                                      {deletingDriverId === driver.id ? 'Deleting...' : 'Confirm'}
                                    </button>
                                    <button
                                      disabled={deletingDriverId === driver.id}
                                      onClick={() => setConfirmDeleteDriverId(null)}
                                      className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded border border-gray-300 text-xs font-medium disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteDriverId(driver.id)}
                                    className="text-red-600 hover:text-red-900 text-xs font-medium"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  {driver.phone}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                        {drivers.length === 0 && (
                          <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">No drivers found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Vehicles Column */}
                <div className="space-y-8">
                  {/* Add Vehicle Form */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Add New Vehicle</h4>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (addingVehicle) return;
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const name = formData.get('name') as string;
                      const number = formData.get('number') as string;

                      const nameError = validateName(name);
                      if (nameError) {
                        toast.error(nameError);
                        return;
                      }

                      const numberError = validateVehicleNumber(number);
                      if (numberError) {
                        toast.error(numberError);
                        return;
                      }

                      setAddingVehicle(true);
                      try {
                        await api.addVehicle({ name, number });
                        form.reset();
                        await fetchFleetData();
                        toast.success('Vehicle added successfully!');
                      } catch (err: any) {
                        toast.error(`Failed to add vehicle: ${err.message || 'Unknown error'}`);
                      } finally {
                        setAddingVehicle(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Name/Model</label>
                        <input type="text" name="name" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                        <input type="text" name="number" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                      </div>
                      <button type="submit" disabled={addingVehicle} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                        {addingVehicle ? 'Adding...' : 'Add Vehicle'}
                      </button>
                    </form>
                  </div>

                  {/* Current Vehicles List */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Current Vehicles</h4>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                        {vehicles.map((vehicle) => (
                          <li key={vehicle.vehicleId} className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-indigo-600 truncate">{vehicle.name}</p>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {vehicle.status}
                                </p>
                                {confirmDeleteVehicleId === vehicle.vehicleId ? (
                                  <div className="flex items-center space-x-2 ml-2">
                                    <button
                                      disabled={deletingVehicleId === vehicle.vehicleId}
                                      onClick={async () => {
                                        setDeletingVehicleId(vehicle.vehicleId);
                                        try {
                                          await api.deleteVehicle(vehicle.vehicleId);
                                          setConfirmDeleteVehicleId(null);
                                          await fetchFleetData();
                                        } catch (err: any) {
                                          console.error(err);
                                        } finally {
                                          setDeletingVehicleId(null);
                                        }
                                      }}
                                      className="text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                                    >
                                      {deletingVehicleId === vehicle.vehicleId ? 'Deleting...' : 'Confirm'}
                                    </button>
                                    <button
                                      disabled={deletingVehicleId === vehicle.vehicleId}
                                      onClick={() => setConfirmDeleteVehicleId(null)}
                                      className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded border border-gray-300 text-xs font-medium disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteVehicleId(vehicle.vehicleId)}
                                    className="ml-2 text-red-600 hover:text-red-900 text-xs font-medium"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  {vehicle.number}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                        {vehicles.length === 0 && (
                          <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">No vehicles found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'Revenue' && (
            <div className="space-y-6">
              {/* Year & Month Selector */}
              <div className="flex flex-col sm:flex-row justify-end mb-4 space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label htmlFor="revenue-month" className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[90px]">Select Month:</label>
                  <select
                    id="revenue-month"
                    value={selectedRevenueMonth}
                    onChange={(e) => setSelectedRevenueMonth(e.target.value === 'All' ? 'All' : parseInt(e.target.value))}
                    className="block w-full sm:w-36 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                  >
                    <option value="All">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label htmlFor="revenue-year" className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[90px]">Select Year:</label>
                  <select
                    id="revenue-year"
                    value={selectedRevenueYear}
                    onChange={(e) => setSelectedRevenueYear(parseInt(e.target.value))}
                    className="block w-full sm:w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                  >
                    {Array.from(
                      { length: Math.max(1, new Date().getFullYear() - 2026 + 1) },
                      (_, i) => 2026 + i
                    ).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const filteredRevenueData = revenueData.filter(item => {
                  if (item.year !== selectedRevenueYear) return false;
                  if (selectedRevenueMonth !== 'All' && item.monthIndex !== selectedRevenueMonth) return false;
                  return true;
                });
                
                const totalRevenue = filteredRevenueData.reduce((sum, item) => sum + item.amount, 0);
                const thisMonthRevenue = filteredRevenueData.length > 0 ? filteredRevenueData[filteredRevenueData.length - 1].amount : 0;
                const avgMonthlyRevenue = filteredRevenueData.length > 0 ? Math.round(totalRevenue / filteredRevenueData.length) : 0;
                
                const filteredBookings = bookings
                  .filter(b => {
                    if (b.paymentStatus !== 'Paid') return false;
                    const date = new Date(b.timestamp);
                    if (date.getFullYear() !== selectedRevenueYear) return false;
                    if (selectedRevenueMonth !== 'All' && date.getMonth() !== selectedRevenueMonth) return false;
                    return true;
                  })
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                const monthName = selectedRevenueMonth !== 'All' 
                  ? new Date(2000, selectedRevenueMonth as number).toLocaleString('default', { month: 'long' })
                  : '';
                const periodLabel = selectedRevenueMonth === 'All' ? `${selectedRevenueYear}` : `${monthName} ${selectedRevenueYear}`;

                return (
                  <>
                    {/* Revenue Stats */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue ({periodLabel})</dt>
                          <dd className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">
                            ₹{totalRevenue.toLocaleString()}
                          </dd>
                        </div>
                      </div>
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-sm font-medium text-gray-500 truncate">{selectedRevenueMonth === 'All' ? 'This Month' : 'Selected Month'}</dt>
                          <dd className="mt-1 text-2xl sm:text-3xl font-semibold text-green-600">
                            ₹{thisMonthRevenue.toLocaleString()}
                          </dd>
                        </div>
                      </div>
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-sm font-medium text-gray-500 truncate">Average Monthly ({selectedRevenueYear})</dt>
                          <dd className="mt-1 text-2xl sm:text-3xl font-semibold text-indigo-600">
                            ₹{avgMonthlyRevenue.toLocaleString()}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
                      <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Transactions ({periodLabel})</h3>
                      </div>
                      <div className="border-t border-gray-200">
                        <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto overflow-x-hidden">
                          {filteredBookings.slice(0, 10).map((booking) => (
                            <li key={booking.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col min-w-0 flex-1 mr-4">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {booking.userName}
                                  </p>
                                  <p className="text-xs text-indigo-600 truncate mt-0.5">
                                    Booking #{booking.id}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {format(new Date(booking.timestamp), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <p className="text-sm font-semibold text-gray-900">
                                    ₹{booking.refundStatus === 'Processed' && booking.refundAmount
                                      ? (parseFloat(booking.fareAmount || '0') - parseFloat(booking.refundAmount.toString())).toLocaleString()
                                      : booking.fareAmount ? booking.fareAmount.toLocaleString() : '0'}
                                  </p>
                                  {booking.refundStatus === 'Processed' && booking.refundAmount ? (
                                    <p className="text-xs text-purple-600 font-medium mt-1 bg-purple-100 px-2 py-0.5 rounded-full">
                                      Refunded (₹{parseFloat(booking.refundAmount.toString()).toLocaleString()})
                                    </p>
                                  ) : (
                                    <p className="text-xs text-green-600 font-medium mt-1 bg-green-100 px-2 py-0.5 rounded-full">
                                      Paid
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                          {filteredBookings.length === 0 && (
                            <li className="px-4 py-6 text-center text-gray-500 text-sm">
                              No transactions found for {periodLabel}
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {mainTab === 'Profile' && (
            <ProfileSection />
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-50 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsAssignModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Assign Driver & Vehicle
                    </h3>
                    <div className="mt-4 space-y-4">
                      
                      <div>
                        {assignments.map((assignment, index) => (
                          <div key={index} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Vehicle {index + 1}</h4>
                            <div className="space-y-4">
                              <div>
                                <label htmlFor={`driver-${index}`} className="block text-sm font-medium text-gray-700">Select Driver</label>
                                <select
                                  id={`driver-${index}`}
                                  value={assignment.driverId}
                                  onChange={(e) => {
                                    const newAssignments = [...assignments];
                                    newAssignments[index].driverId = e.target.value;
                                    setAssignments(newAssignments);
                                  }}
                                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                                >
                                  <option value="">-- Select a Driver --</option>
                                  {drivers.map(driver => {
                                    return (
                                      <option key={driver.id} value={driver.id} disabled={driver.status === 'Inactive'}>
                                        {driver.name} ({driver.status})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div>
                                <label htmlFor={`vehicle-${index}`} className="block text-sm font-medium text-gray-700">Select Vehicle</label>
                                <select
                                  id={`vehicle-${index}`}
                                  value={assignment.vehicleId}
                                  onChange={(e) => {
                                    const newAssignments = [...assignments];
                                    newAssignments[index].vehicleId = e.target.value;
                                    setAssignments(newAssignments);
                                  }}
                                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
                                >
                                  <option value="">-- Select a Vehicle --</option>
                                  {vehicles.map(vehicle => {
                                    return (
                                      <option key={vehicle.vehicleId} value={vehicle.vehicleId} disabled={vehicle.status === 'Maintenance'}>
                                        {vehicle.name} - {vehicle.number} ({vehicle.status})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={assigning || !assignments.every(a => a.driverId || a.vehicleId)}
                  onClick={handleAssignDriver}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          onClick={() => setMainTab('Fleet')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
            mainTab === 'Fleet' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Car className={`w-5 h-5 mb-1 ${mainTab === 'Fleet' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
          <span className="text-[10px] tracking-wide">Fleet</span>
        </button>

        <button
          onClick={() => setMainTab('Revenue')}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
            mainTab === 'Revenue' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className={`w-5 h-5 mb-1 ${mainTab === 'Revenue' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
          <span className="text-[10px] tracking-wide">Revenue</span>
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
