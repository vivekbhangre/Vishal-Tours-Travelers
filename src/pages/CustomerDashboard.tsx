import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api, socket } from '../lib/api';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Calendar, Clock, Car, Users, MapPin, Grid, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AVAILABLE_VEHICLES = [
  { name: 'Swift Dzire', capacity: 4, quantity: 1 },
  { name: 'Ertiga', capacity: 7, quantity: 2 },
  { name: 'Force Traveller (18 Seater)', capacity: 18, quantity: 1 },
  { name: 'Force Traveller (22 Seater)', capacity: 22, quantity: 1 },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTimeHour, setRideTimeHour] = useState('12');
  const [rideTimeMinute, setRideTimeMinute] = useState('00');
  const [rideTimeAmPm, setRideTimeAmPm] = useState('AM');
  const [rideType, setRideType] = useState('Intercity');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  // Vehicle Selection State
  const [selectedVehicle, setSelectedVehicle] = useState<string>('Swift Dzire');
  const [confirmCapacity, setConfirmCapacity] = useState(false);

  // New Booking Fields
  const [tripType, setTripType] = useState('One-way');
  const [returnDate, setReturnDate] = useState('');
  const [returnTimeHour, setReturnTimeHour] = useState('12');
  const [returnTimeMinute, setReturnTimeMinute] = useState('00');
  const [returnTimeAmPm, setReturnTimeAmPm] = useState('AM');

  // Tour Fields
  const [destinations, setDestinations] = useState<string[]>(['']);
  
  // Car Renting Fields
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [numberOfCars, setNumberOfCars] = useState(1);
  
  // Shared
  const [estimatedKM, setEstimatedKM] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // Wedding Fields
  const [weddingDate, setWeddingDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [vehiclesRequired, setVehiclesRequired] = useState('1');
  const [decorationRequired, setDecorationRequired] = useState('No');

  // Airport Transfer Fields
  const [pickupType, setPickupType] = useState('Arrival');

  // Other Fields
  const [customRequirements, setCustomRequirements] = useState('');

  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Autocomplete State
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  useEffect(() => {
    fetchBookings();
    if (user) {
      fetchProfile();
    }

    socket.on('booking:updated', (updatedBooking) => {
      if (updatedBooking.userId === user?.id) {
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      }
    });

    socket.on('booking:created', (newBooking) => {
      if (newBooking.userId === user?.id) {
        setBookings(prev => [...prev, newBooking]);
      }
    });

    return () => {
      socket.off('booking:updated');
      socket.off('booking:created');
    };
  }, [user]);

  useEffect(() => {
    const fetchSuggestions = async (input: string, setter: (s: string[]) => void) => {
      if (!input || input.length < 2) {
        setter([]);
        return;
      }
      try {
        const res = await fetch(`/api/city-suggestions?q=${encodeURIComponent(input)}`);
        if (res.ok) {
          const data = await res.json();
          setter(data.suggestions);
        }
      } catch (e) {
        console.error('Failed to fetch city suggestions', e);
      }
    };

    const timer = setTimeout(() => {
      if (showFromSuggestions) fetchSuggestions(fromLocation, setFromSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [fromLocation, showFromSuggestions]);

  useEffect(() => {
    const fetchSuggestions = async (input: string, setter: (s: string[]) => void) => {
      if (!input || input.length < 2) {
        setter([]);
        return;
      }
      try {
        const res = await fetch(`/api/city-suggestions?q=${encodeURIComponent(input)}`);
        if (res.ok) {
          const data = await res.json();
          setter(data.suggestions);
        }
      } catch (e) {
        console.error('Failed to fetch city suggestions', e);
      }
    };

    const timer = setTimeout(() => {
      if (showToSuggestions) fetchSuggestions(toLocation, setToSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [toLocation, showToSuggestions]);

  useEffect(() => {
    if (tripType === 'Car Renting') {
      setEstimatedPrice(numberOfDays * 2000 * numberOfCars);
      return;
    }

    if (!fromLocation || !toLocation || tripType === 'Tour') {
      setEstimatedPrice(estimatedKM * 13);
      return;
    }

    const calculateDistance = async () => {
      setIsCalculatingDistance(true);
      try {
        const response = await fetch(`/calculate-distance?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}`);
        if (response.ok) {
          const data = await response.json();
          setEstimatedKM(parseFloat(data.distance));
          setEstimatedPrice(parseFloat(data.price));
        } else {
          setEstimatedPrice(estimatedKM * 13);
        }
      } catch (error) {
        console.error('Failed to calculate distance:', error);
        setEstimatedPrice(estimatedKM * 13);
      } finally {
        setIsCalculatingDistance(false);
      }
    };

    const timeoutId = setTimeout(calculateDistance, 1000);
    return () => clearTimeout(timeoutId);
  }, [fromLocation, toLocation, tripType, numberOfDays, numberOfCars, estimatedKM]);

  useEffect(() => {
    let recommended = '';
    if (numberOfPeople >= 1 && numberOfPeople <= 4) recommended = 'Swift Dzire';
    else if (numberOfPeople >= 5 && numberOfPeople <= 7) recommended = 'Ertiga';
    else if (numberOfPeople >= 8 && numberOfPeople <= 18) recommended = 'Force Traveller (18 Seater)';
    else if (numberOfPeople >= 19 && numberOfPeople <= 22) recommended = 'Force Traveller (22 Seater)';
    
    if (recommended) {
      setSelectedVehicle(recommended);
    }
    setConfirmCapacity(false);
  }, [numberOfPeople]);

  const fetchBookings = async () => {
    try {
      if (user) {
        const data = await api.getBookings(user.id);
        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      if (user) {
        const data = await api.getUser(user.id);
        setProfileName(data.name);
        setProfileEmail(data.email);
        setProfilePhone(data.phone || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      if (!user) return;
      await api.updateUser(user.id, {
        name: profileName,
        email: profileEmail,
        phone: profilePhone
      });
      setProfileSuccess('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingLoading(true);

    try {
      if (!user) return;
      
      if (numberOfPeople > 22) {
        setBookingError('Please contact admin for custom arrangement.');
        setBookingLoading(false);
        return;
      }

      const vehicleObj = AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle);
      if (vehicleObj && vehicleObj.capacity < numberOfPeople && !confirmCapacity) {
        setBookingError('Please confirm that you want to proceed with a vehicle that may not accommodate all passengers.');
        setBookingLoading(false);
        return;
      }
      
      let finalEstimatedPrice = 0;
      if (tripType === 'Car Renting') {
        finalEstimatedPrice = (numberOfDays * 2000 * numberOfCars);
      } else {
        finalEstimatedPrice = estimatedPrice || (estimatedKM * 13);
      }

      const formattedRideDate = `${rideDate} ${rideTimeHour}:${rideTimeMinute} ${rideTimeAmPm}`;
      let formattedReturnDate = '';

      if (tripType === 'Round-trip') {
        if (!returnDate) {
          setBookingError('Return date is required for round-trip');
          setBookingLoading(false);
          return;
        }
        const depDate = new Date(`${rideDate} ${rideTimeHour}:${rideTimeMinute} ${rideTimeAmPm}`);
        const retDate = new Date(`${returnDate} ${returnTimeHour}:${returnTimeMinute} ${returnTimeAmPm}`);
        if (retDate <= depDate) {
          setBookingError('Return date must be later than departure date');
          setBookingLoading(false);
          return;
        }
        formattedReturnDate = `${returnDate} ${returnTimeHour}:${returnTimeMinute} ${returnTimeAmPm}`;
      }

      const newBooking = await api.createBooking({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        fromLocation,
        toLocation: tripType === 'Tour' ? 'N/A' : toLocation,
        destinations: tripType === 'Tour' ? destinations.join(', ') : 'N/A',
        rideDate: formattedRideDate,
        tripType,
        returnDate: formattedReturnDate,
        rideType,
        numberOfPeople,
        fareAmount: finalEstimatedPrice,
        numberOfDays: tripType === 'Car Renting' ? numberOfDays : 'N/A',
        numberOfCars: tripType === 'Car Renting' ? numberOfCars : 'N/A',
        estimatedKM: tripType !== 'Car Renting' ? estimatedKM : 'N/A',
        suggestedVehicle: selectedVehicle,
        weddingDetails: tripType === 'Wedding' ? { weddingDate, eventLocation, vehiclesRequired, decorationRequired } : undefined,
        airportDetails: rideType === 'Airport Transfer' ? { pickupType } : undefined,
        customRequirements: rideType === 'Other' ? customRequirements : undefined
      });

      setFromLocation('');
      setToLocation('');
      setRideDate('');
      setRideTimeHour('12');
      setRideTimeMinute('00');
      setRideTimeAmPm('AM');
      setRideType('Intercity');
      setNumberOfPeople(1);
      
      // Reset new fields
      setTripType('One-way');
      setReturnDate('');
      setReturnTimeHour('12');
      setReturnTimeMinute('00');
      setReturnTimeAmPm('AM');
      setDestinations(['']);
      setNumberOfDays(1);
      setNumberOfCars(1);
      setEstimatedKM(0);
      setWeddingDate('');
      setEventLocation('');
      setVehiclesRequired('1');
      setDecorationRequired('No');
      setPickupType('Arrival');
      setCustomRequirements('');
      
      setBookingSuccessData(newBooking);
      
      // Refresh bookings
      fetchBookings();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book ride');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelRide = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    try {
      await api.updateBooking(bookingId, { rideStatus: 'Cancelled' });
      fetchBookings();
    } catch (error: any) {
      console.error('Failed to cancel ride:', error);
      alert(error.message || 'Failed to cancel ride. Please try again.');
    }
  };

  const canCancelRide = (rideDateStr: string, status: string) => {
    if (status === 'Cancelled' || status === 'Completed' || status === 'Ongoing') return false;
    
    let rideDate = new Date(rideDateStr);
    
    if (isNaN(rideDate.getTime())) {
      try {
        let match = rideDateStr.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
        if (match) {
          const [_, datePart, hourStr, minStr, ampm] = match;
          let hour = parseInt(hourStr, 10);
          if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
          if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
          rideDate = new Date(`${datePart}T${hour.toString().padStart(2, '0')}:${minStr}:00`);
        } else {
          match = rideDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
          if (match) {
            const [_, month, day, year, hourStr, minStr, ampm] = match;
            let hour = parseInt(hourStr, 10);
            if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
            rideDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minStr}:00`);
          }
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }

    if (isNaN(rideDate.getTime())) return false;
    
    const now = new Date();
    const diffInMs = rideDate.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours > 2;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-50 text-yellow-600 border border-yellow-100';
      case 'Ongoing': return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Completed': return 'bg-green-50 text-green-600 border border-green-100';
      case 'Cancelled': return 'bg-red-50 text-red-600 border border-red-100';
      default: return 'bg-gray-50 text-gray-600 border border-gray-100';
    }
  };

  const getPaymentColor = (status: string) => {
    return status === 'Paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Customer Dashboard</h1>
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-8 lg:col-span-1">
              {/* Profile Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className={`flex justify-between items-start ${isEditingProfile ? 'mb-6' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-indigo-200">
                      {profileName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{profileName}</h3>
                      <p className="text-sm text-gray-500">Customer</p>
                    </div>
                  </div>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="text-xs font-medium text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
                
                {profileError && (
                  <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl text-sm">
                    {profileSuccess}
                  </div>
                )}
                
                {isEditingProfile && (
                  <form onSubmit={handleUpdateProfile} className="space-y-4 border-t border-gray-100 pt-4">
                    <div>
                      <label htmlFor="profileName" className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        id="profileName"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="profileEmail" className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        id="profileEmail"
                        required
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="profilePhone" className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        id="profilePhone"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {profileLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Book a Ride Form */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Book a Ride</h3>
                <AnimatePresence mode="wait">
                  {bookingSuccessData ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center text-center space-y-6 py-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      >
                        <CheckCircle className="w-16 h-16 text-green-500" />
                      </motion.div>
                      
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">🎉 Thank You for Booking!</h2>
                        <p className="text-gray-500 mt-2">Your ride has been successfully scheduled.</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-6 w-full text-left space-y-3 border border-gray-100">
                        <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Booking Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 block">Booking ID</span>
                            <span className="font-medium text-gray-900">#{bookingSuccessData.id.slice(-6)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Trip Type</span>
                            <span className="font-medium text-gray-900">{bookingSuccessData.tripType}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Ride Type</span>
                            <span className="font-medium text-gray-900">{bookingSuccessData.rideType}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Number of People</span>
                            <span className="font-medium text-gray-900">{bookingSuccessData.numberOfPeople}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-500 block">Route</span>
                            <span className="font-medium text-gray-900">
                              {bookingSuccessData.tripType === 'Tour' 
                                ? `${bookingSuccessData.fromLocation} \u2192 ${bookingSuccessData.destinations}`
                                : `${bookingSuccessData.fromLocation} \u2192 ${bookingSuccessData.toLocation}`}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-500 block">Departure</span>
                            <span className="font-medium text-gray-900">{bookingSuccessData.rideDate}</span>
                          </div>
                          {bookingSuccessData.returnDate && (
                            <div className="sm:col-span-2">
                              <span className="text-gray-500 block">Return</span>
                              <span className="font-medium text-gray-900">{bookingSuccessData.returnDate}</span>
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <span className="text-gray-500 block">Recommended Vehicle</span>
                            <span className="font-medium text-gray-900">
                              {bookingSuccessData.suggestedVehicle}
                            </span>
                          </div>
                          {(bookingSuccessData.tripType === 'Car Renting' || bookingSuccessData.tripType === 'Tour') && (
                            <div className="sm:col-span-2">
                              <span className="text-gray-500 block">Estimated Cost</span>
                              <span className="font-medium text-indigo-600 font-bold">₹{bookingSuccessData.fareAmount}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                        <button
                          onClick={() => setBookingSuccessData(null)}
                          className="flex-1 justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          Book Another Ride
                        </button>
                        <button
                          onClick={() => navigate('/')}
                          className="flex-1 justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          Go to Home
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form 
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleBookRide} 
                      className="space-y-4"
                    >
                      {bookingError && (
                        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm">
                          {bookingError}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {['One-way', 'Round-trip', 'Tour', 'Car Renting', 'Wedding'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setTripType(type)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              tripType === type 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                  {tripType !== 'Car Renting' && (
                    <div className="relative">
                      <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700">From</label>
                      <input
                        type="text"
                        id="fromLocation"
                        required={tripType !== 'Car Renting'}
                        value={fromLocation}
                        onChange={(e) => {
                          setFromLocation(e.target.value);
                          setShowFromSuggestions(true);
                        }}
                        onFocus={() => setShowFromSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Pickup location"
                        autoComplete="off"
                      />
                      {showFromSuggestions && fromSuggestions.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {fromSuggestions.map((city, idx) => (
                            <li
                              key={idx}
                              className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white"
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input from losing focus immediately
                                setFromLocation(city);
                                setShowFromSuggestions(false);
                              }}
                            >
                              {city}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  
                  {tripType !== 'Tour' && tripType !== 'Car Renting' && (
                    <div className="relative">
                      <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700">To</label>
                      <input
                        type="text"
                        id="toLocation"
                        required={tripType !== 'Tour' && tripType !== 'Car Renting'}
                        value={toLocation}
                        onChange={(e) => {
                          setToLocation(e.target.value);
                          setShowToSuggestions(true);
                        }}
                        onFocus={() => setShowToSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Drop-off location"
                        autoComplete="off"
                      />
                      {showToSuggestions && toSuggestions.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {toSuggestions.map((city, idx) => (
                            <li
                              key={idx}
                              className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white"
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input from losing focus immediately
                                setToLocation(city);
                                setShowToSuggestions(false);
                              }}
                            >
                              {city}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {tripType === 'Tour' && (
                      <motion.div
                        key="tour-destinations"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 overflow-hidden"
                      >
                        {destinations.map((dest, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-grow">
                              <label className="block text-sm font-medium text-gray-700">Destination {index + 1}</label>
                              <input
                                type="text"
                                required
                                value={dest}
                                onChange={(e) => {
                                  const newDests = [...destinations];
                                  newDests[index] = e.target.value;
                                  setDestinations(newDests);
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={`Destination ${index + 1}`}
                              />
                            </div>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => setDestinations(destinations.filter((_, i) => i !== index))}
                                className="mb-1 px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDestinations([...destinations, ''])}
                          className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
                        >
                          + Add another destination
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div>
                    <label htmlFor="rideDate" className="block text-sm font-medium text-gray-700">
                      {tripType === 'Car Renting' ? 'When do you want the vehicle? (Date & Time)' : tripType === 'Round-trip' ? 'Departure Date & Time' : 'Date & Time'}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-3">
                      <input
                        type="date"
                        id="rideDate"
                        required
                        value={rideDate}
                        onChange={(e) => setRideDate(e.target.value)}
                        className="block w-full sm:flex-1 min-w-[150px] border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <div className="flex gap-2 items-center flex-1 min-w-[240px]">
                        <select
                          value={rideTimeHour}
                          onChange={(e) => setRideTimeHour(e.target.value)}
                          className="block w-full flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                        <span className="flex items-center text-gray-500 font-bold">:</span>
                        <select
                          value={rideTimeMinute}
                          onChange={(e) => setRideTimeMinute(e.target.value)}
                          className="block w-full flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                        >
                          {['00', '15', '30', '45'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={rideTimeAmPm}
                          onChange={(e) => setRideTimeAmPm(e.target.value)}
                          className="block w-full flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {tripType === 'Round-trip' && (
                      <motion.div
                        key="round-trip-return"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <label htmlFor="returnDate" className="block text-sm font-medium text-gray-700 mt-4">Return Date & Time</label>
                        <div className="mt-1 flex flex-wrap gap-3">
                          <input
                            type="date"
                            id="returnDate"
                            required={tripType === 'Round-trip'}
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="block w-full sm:flex-1 min-w-[150px] border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                          <div className="flex gap-2 items-center flex-1 min-w-[240px]">
                            <select
                              value={returnTimeHour}
                              onChange={(e) => setReturnTimeHour(e.target.value)}
                              className="block w-full flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                              ))}
                            </select>
                            <span className="flex items-center text-gray-500 font-bold">:</span>
                            <select
                              value={returnTimeMinute}
                              onChange={(e) => setReturnTimeMinute(e.target.value)}
                              className="block w-full flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                            >
                              {['00', '15', '30', '45'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select
                              value={returnTimeAmPm}
                              onChange={(e) => setReturnTimeAmPm(e.target.value)}
                              className="block w-full flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {tripType === 'Car Renting' && (
                      <motion.div
                        key="car-renting-fields"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 overflow-hidden mt-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="numberOfDays" className="block text-sm font-medium text-gray-700">Number of Days</label>
                            <input
                              type="number"
                              id="numberOfDays"
                              required={tripType === 'Car Renting'}
                              min="1"
                              value={numberOfDays}
                              onChange={(e) => setNumberOfDays(parseInt(e.target.value) || 1)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="numberOfCars" className="block text-sm font-medium text-gray-700">Number of Cars Required</label>
                            <input
                              type="number"
                              id="numberOfCars"
                              required={tripType === 'Car Renting'}
                              min="1"
                              value={numberOfCars}
                              onChange={(e) => setNumberOfCars(parseInt(e.target.value) || 1)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}


                  </AnimatePresence>
                  
                  {tripType !== 'Car Renting' && tripType !== 'Wedding' && (
                    <div>
                      <label htmlFor="rideType" className="block text-sm font-medium text-gray-700">Ride Type</label>
                      <select
                        id="rideType"
                        required
                        value={rideType}
                        onChange={(e) => setRideType(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        <option value="Intercity">Intercity</option>
                        <option value="Airport Transfer">Airport Transfer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  {tripType !== 'Car Renting' && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700">Number of People</label>
                        <input
                          type="number"
                          id="numberOfPeople"
                          required
                          min="1"
                          max="50"
                          value={numberOfPeople}
                          onChange={(e) => setNumberOfPeople(parseInt(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>

                      {numberOfPeople <= 22 && (
                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">⭐</span>
                            <h4 className="text-sm font-bold text-indigo-900">Recommended for You</h4>
                          </div>
                          
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Or Choose Your Preferred Vehicle</label>
                            <select
                              value={selectedVehicle}
                              onChange={(e) => {
                                setSelectedVehicle(e.target.value);
                                setConfirmCapacity(false);
                              }}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                            >
                              {AVAILABLE_VEHICLES.map(v => (
                                <option key={v.name} value={v.name}>
                                  {v.name} (Up to {v.capacity} passengers)
                                </option>
                              ))}
                            </select>
                            
                            {AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle)?.capacity! < numberOfPeople && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
                                <p className="text-sm text-yellow-800 mb-2">
                                  ⚠️ Selected vehicle may not accommodate all passengers.
                                </p>
                                <label className="flex items-center gap-2 text-sm text-yellow-900">
                                  <input
                                    type="checkbox"
                                    checked={confirmCapacity}
                                    onChange={(e) => setConfirmCapacity(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  I confirm I want to proceed with this vehicle
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {tripType === 'Wedding' && (
                      <motion.div
                        key="wedding"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <label htmlFor="weddingDate" className="block text-sm font-medium text-gray-700">Wedding Date</label>
                          <input
                            type="date"
                            id="weddingDate"
                            value={weddingDate}
                            onChange={(e) => setWeddingDate(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="eventLocation" className="block text-sm font-medium text-gray-700">Event Location</label>
                          <input
                            type="text"
                            id="eventLocation"
                            value={eventLocation}
                            onChange={(e) => setEventLocation(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div className="flex gap-6">
                          <div className="flex-1">
                            <label htmlFor="vehiclesRequired" className="block text-sm font-medium text-gray-700">Number of Vehicles</label>
                            <input
                              type="number"
                              id="vehiclesRequired"
                              min="1"
                              value={vehiclesRequired}
                              onChange={(e) => setVehiclesRequired(e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Decoration Required?</label>
                            <select
                              value={decorationRequired}
                              onChange={(e) => setDecorationRequired(e.target.value)}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {tripType !== 'Car Renting' && tripType !== 'Wedding' && rideType === 'Airport Transfer' && (
                      <motion.div
                        key="airport"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Type</label>
                          <select
                            value={pickupType}
                            onChange={(e) => setPickupType(e.target.value)}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                          >
                            <option value="Arrival">Arrival</option>
                            <option value="Departure">Departure</option>
                          </select>
                        </div>
                      </motion.div>
                    )}

                    {tripType !== 'Car Renting' && tripType !== 'Wedding' && rideType === 'Other' && (
                      <motion.div
                        key="other"
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <label htmlFor="customRequirements" className="block text-sm font-medium text-gray-700">Please describe your requirements</label>
                        <textarea
                          id="customRequirements"
                          rows={4}
                          value={customRequirements}
                          onChange={(e) => setCustomRequirements(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Tell us what you need..."
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm"
                  >
                    <h4 className="text-sm font-medium text-indigo-800 mb-2">Estimated Cost Summary</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-indigo-600">Total Estimated Price</span>
                      <span className="text-2xl font-bold text-indigo-900">
                        {isCalculatingDistance ? (
                          <span className="text-sm font-normal text-indigo-500 animate-pulse">Calculating...</span>
                        ) : (
                          `₹${estimatedPrice.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  </motion.div>
                  
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {bookingLoading ? 'Booking...' : 'Book Ride'}
                  </button>
                </motion.form>
                )}
                </AnimatePresence>
              </div>
            </div>

            {/* My Bookings List */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">My Bookings</h3>
                  <button 
                    onClick={() => {
                      setLoading(true);
                      fetchBookings();
                    }}
                    disabled={loading}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                    title="Refresh bookings"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800">View all</button>
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">No bookings found. Book a ride to get started!</div>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-bold text-gray-900">
                          {booking.tripType === 'Tour' 
                            ? `${booking.fromLocation} \u2192 ${booking.destinations}`
                            : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                        </h4>
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.rideStatus)}`}>
                            {booking.rideStatus}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentColor(booking.paymentStatus)}`}>
                            {booking.paymentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          {format(new Date(booking.rideDate), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-red-400" />
                          {format(new Date(booking.rideDate), 'h:mm a')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-blue-400" />
                          {booking.suggestedVehicle || 'Sedan'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-400" />
                          {booking.numberOfPeople} Passenger{booking.numberOfPeople > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                          <p className="text-2xl font-bold text-gray-900">₹{parseFloat(booking.fareAmount).toFixed(2)}</p>
                        </div>
                        {booking.rideStatus === 'Pending' && (
                          <button
                            onClick={() => {
                              if (canCancelRide(booking.rideDate, booking.rideStatus)) {
                                handleCancelRide(booking.id);
                              } else {
                                alert('Rides can only be cancelled up to 2 hours before the departure time.');
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              canCancelRide(booking.rideDate, booking.rideStatus)
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            title={!canCancelRide(booking.rideDate, booking.rideStatus) ? 'Rides can only be cancelled 2 hours before departure' : ''}
                          >
                            Cancel Ride
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
