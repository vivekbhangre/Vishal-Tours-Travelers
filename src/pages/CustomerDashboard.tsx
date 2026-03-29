import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api, socket } from '../lib/api';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Calendar, Clock, Car, Users, MapPin, Grid, RefreshCw, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';

interface LocationData {
  name: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  displayName: string;
  primaryText?: string;
  secondaryText?: string;
}

const AVAILABLE_VEHICLES = [
  { name: 'Swift Dzire', capacity: 4, quantity: 1 },
  { name: 'Ertiga', capacity: 7, quantity: 2 },
  { name: 'Force Traveller (18 Seater)', capacity: 18, quantity: 1 },
  { name: 'Force Traveller (22 Seater)', capacity: 22, quantity: 1 },
];

const getInitialDateTime = () => {
  const now = new Date();
  now.setHours(now.getHours() + 1); // Default to 1 hour from now

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let hour = now.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  const hourStr = String(hour).padStart(2, '0');

  let minute = now.getMinutes();
  let minuteStr = '00';
  if (minute <= 15) minuteStr = '15';
  else if (minute <= 30) minuteStr = '30';
  else if (minute <= 45) minuteStr = '45';
  else {
    minuteStr = '00';
    now.setHours(now.getHours() + 1);
    let newHour = now.getHours();
    const newAmPm = newHour >= 12 ? 'PM' : 'AM';
    newHour = newHour % 12;
    newHour = newHour ? newHour : 12;
    return {
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      hour: String(newHour).padStart(2, '0'),
      minute: minuteStr,
      ampm: newAmPm
    };
  }

  return { date: dateStr, hour: hourStr, minute: minuteStr, ampm };
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings'>(() => {
    return (localStorage.getItem('customerActiveTab') as 'dashboard' | 'bookings') || 'dashboard';
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [rideDate, setRideDate] = useState<string>(() => getInitialDateTime().date);
  const [rideTimeHour, setRideTimeHour] = useState<string>(() => getInitialDateTime().hour);
  const [rideTimeMinute, setRideTimeMinute] = useState<string>(() => getInitialDateTime().minute);
  const [rideTimeAmPm, setRideTimeAmPm] = useState<string>(() => getInitialDateTime().ampm);
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
  const [returnDate, setReturnDate] = useState<string>(() => getInitialDateTime().date);
  const [returnTimeHour, setReturnTimeHour] = useState<string>(() => getInitialDateTime().hour);
  const [returnTimeMinute, setReturnTimeMinute] = useState<string>(() => getInitialDateTime().minute);
  const [returnTimeAmPm, setReturnTimeAmPm] = useState<string>(() => getInitialDateTime().ampm);

  // Tour Fields
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [activeDestinationIndex, setActiveDestinationIndex] = useState<number | null>(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<{ [key: number]: LocationData[] }>({});
  
  // Car Renting Fields
  const [numberOfDays, setNumberOfDays] = useState<number | ''>(1);
  const [numberOfCars, setNumberOfCars] = useState<number | ''>(1);
  
  // Shared
  const [estimatedKM, setEstimatedKM] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [isAC, setIsAC] = useState(false);

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
  const [cancelMessage, setCancelMessage] = useState<{id: string, text: string, type: 'success' | 'error'} | null>(null);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean, booking: any | null, refundInfo: any | null }>({ isOpen: false, booking: null, refundInfo: null });

  const calculateRefund = (rideDateStr: string, fareAmount: number, numberOfDays: number | string) => {
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

    if (isNaN(rideDate.getTime())) {
      return { refundPercent: 0, refundAmount: 0, message: "Could not determine ride date." };
    }
    
    const now = new Date();
    const diffInMs = rideDate.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    const days = typeof numberOfDays === 'number' ? numberOfDays : (parseInt(numberOfDays as string) || 1);
    const isMultiDay = days > 1;

    if (diffInHours < 24) {
      return { refundPercent: 0, refundAmount: 0, message: "No refund for cancellations within 24 hours of departure." };
    } else if (diffInHours >= 24 && diffInHours <= 72) {
      const percent = isMultiDay ? 25 : 50;
      return { refundPercent: percent, refundAmount: (fareAmount * percent) / 100, message: `${percent}% refund applied.` };
    } else {
      const percent = isMultiDay ? 50 : 85;
      return { refundPercent: percent, refundAmount: (fareAmount * percent) / 100, message: `${percent}% refund applied.` };
    }
  };
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [rebookModal, setRebookModal] = useState<{ isOpen: boolean, booking: any | null }>({ isOpen: false, booking: null });
  const [rebookDate, setRebookDate] = useState('');
  const [rebookTimeHour, setRebookTimeHour] = useState('12');
  const [rebookTimeMinute, setRebookTimeMinute] = useState('00');
  const [rebookTimeAmPm, setRebookTimeAmPm] = useState('AM');
  const [rebookLoading, setRebookLoading] = useState(false);
  const [rebookError, setRebookError] = useState('');

  // Autocomplete State
  const [fromLocationData, setFromLocationData] = useState<LocationData | null>(null);
  const [toLocationData, setToLocationData] = useState<LocationData | null>(null);
  const [destinationData, setDestinationData] = useState<(LocationData | null)[]>([null]);
  const [fromSuggestions, setFromSuggestions] = useState<LocationData[]>([]);
  const [toSuggestions, setToSuggestions] = useState<LocationData[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    localStorage.setItem('customerActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchBookings();
    if (user) {
      fetchProfile();
    }

    socket.on('booking:updated', (updatedBooking) => {
      if (updatedBooking.userId === user?.id) {
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b));
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

  const fetchLocationSuggestions = useMemo(
    () =>
      debounce(async (input: string, setter: (s: LocationData[]) => void, currentRideType: string) => {
        if (!input || input.length < 2) {
          setter([]);
          return;
        }
        try {
          const res = await fetch(`/api/location?q=${encodeURIComponent(input)}&rideType=${encodeURIComponent(currentRideType)}`);
          if (res.ok) {
            const data = await res.json();
            setter(data);
          }
        } catch (e) {
          console.error('Failed to fetch location suggestions', e);
        }
      }, 300),
    []
  );

  useEffect(() => {
    if (showFromSuggestions) fetchLocationSuggestions(fromLocation, setFromSuggestions, rideType);
  }, [fromLocation, showFromSuggestions, fetchLocationSuggestions, rideType]);

  useEffect(() => {
    if (showToSuggestions) fetchLocationSuggestions(toLocation, setToSuggestions, rideType);
  }, [toLocation, showToSuggestions, fetchLocationSuggestions, rideType]);

  useEffect(() => {
    if (activeDestinationIndex !== null) {
      fetchLocationSuggestions(destinations[activeDestinationIndex], (suggestions) => {
        setDestinationSuggestions(prev => ({ ...prev, [activeDestinationIndex]: suggestions }));
      }, rideType);
    }
  }, [destinations, activeDestinationIndex, fetchLocationSuggestions, rideType]);

  useEffect(() => {
    if (tripType === 'Car Renting') {
      const days = Number(numberOfDays) || 1;
      const cars = Number(numberOfCars) || 1;
      setEstimatedPrice(days * 2000 * cars);
      return;
    }

    if (!fromLocation || fromLocation.trim().length < 2) {
      setEstimatedKM(0);
      setEstimatedPrice(0);
      return;
    }

    if (tripType !== 'Tour' && (!toLocation || toLocation.trim().length < 2)) {
      setEstimatedKM(0);
      setEstimatedPrice(0);
      return;
    }

    const validDestinations = destinations.filter(d => d.trim().length >= 2);
    if (tripType === 'Tour' && validDestinations.length === 0) {
      setEstimatedKM(0);
      setEstimatedPrice(0);
      return;
    }

    const calculateDistance = () => {
      setIsCalculatingDistance(true);
      try {
        const calculateLegDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371; // Radius of the earth in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          const straightLineDistance = R * c;
          return straightLineDistance * 1.3; // Add 30% for road curves
        };

        const seoniCoords = { lat: 22.0869, lng: 79.5433 };
        let totalDistance = 0;
        
        if (!fromLocationData) {
          setEstimatedKM(0);
          setEstimatedPrice(0);
          setIsCalculatingDistance(false);
          return;
        }

        let currentCoords = fromLocationData;
        const fromCity = fromLocationData.city?.toLowerCase() || fromLocationData.name?.toLowerCase() || '';

        if (fromCity !== 'seoni') {
          totalDistance += calculateLegDistance(seoniCoords.lat, seoniCoords.lng, fromLocationData.lat, fromLocationData.lng);
        }

        let waypoints: LocationData[] = [];
        if (tripType === 'Tour') {
          waypoints = destinationData.filter((d): d is LocationData => d !== null);
          if (waypoints.length === 0) {
            setEstimatedKM(0);
            setEstimatedPrice(0);
            setIsCalculatingDistance(false);
            return;
          }
        } else {
          if (!toLocationData) {
            setEstimatedKM(0);
            setEstimatedPrice(0);
            setIsCalculatingDistance(false);
            return;
          }
          waypoints = [toLocationData];
        }

        for (const wp of waypoints) {
          totalDistance += calculateLegDistance(currentCoords.lat, currentCoords.lng, wp.lat, wp.lng);
          currentCoords = wp;
        }

        totalDistance += calculateLegDistance(currentCoords.lat, currentCoords.lng, seoniCoords.lat, seoniCoords.lng);

        const perKmRate = isAC ? 14 : 13;
        const basePrice = totalDistance * perKmRate;
        const finalPrice = Math.ceil(basePrice / 100) * 100;

        setEstimatedKM(parseFloat(totalDistance.toFixed(2)));
        setEstimatedPrice(finalPrice);
      } catch (error) {
        console.error('Failed to calculate distance:', error);
        setEstimatedKM(0);
        setEstimatedPrice(0);
      } finally {
        setIsCalculatingDistance(false);
      }
    };

    const timeoutId = setTimeout(calculateDistance, 500);
    return () => clearTimeout(timeoutId);
  }, [fromLocationData, toLocationData, destinationData, tripType, numberOfDays, numberOfCars, isAC]);

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

  const fetchBookings = async (forceRefresh: boolean = false) => {
    try {
      if (user) {
        const data = await api.getBookings(user.id, false, forceRefresh);
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

    if (profileName.trim().length < 2) {
      setProfileError('Name must be at least 2 characters long');
      setProfileLoading(false);
      return;
    }
    if (!/^\+?[\d\s-]{10,15}$/.test(profilePhone)) {
      setProfileError('Please enter a valid phone number (10-15 digits)');
      setProfileLoading(false);
      return;
    }

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

  const calculateHaltCharge = () => {
    if (tripType !== 'Round-trip' || !rideDate || !returnDate || !selectedVehicle) return 0;
    
    const start = new Date(rideDate);
    const end = new Date(returnDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    if (diffTime <= 0) return 0;
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let rate = 0;
    if (selectedVehicle === 'Swift Dzire') rate = 1000;
    else if (selectedVehicle === 'Ertiga') rate = 1500;
    else if (selectedVehicle.includes('Force Traveller') || selectedVehicle.includes('Force Van')) rate = 3000;
    
    return diffDays * rate;
  };

  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingLoading(true);

    if (tripType === 'Wedding') {
      if (!weddingDate || !eventLocation) {
        setBookingError('Please fill in all wedding details (date and location).');
        setBookingLoading(false);
        return;
      }
      const wDate = new Date(weddingDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (wDate < now) {
        setBookingError('Wedding date cannot be in the past.');
        setBookingLoading(false);
        return;
      }
      const vehicles = parseInt(vehiclesRequired);
      if (isNaN(vehicles) || vehicles < 1 || vehicles > 10) {
        setBookingError('Number of vehicles must be between 1 and 10.');
        setBookingLoading(false);
        return;
      }
    } else if (tripType === 'Car Renting') {
      if (!rideDate) {
        setBookingError('Please fill in the date.');
        setBookingLoading(false);
        return;
      }
    } else {
      if (!fromLocation || (!toLocation && tripType !== 'Tour') || !rideDate) {
        setBookingError('Please fill in pickup, dropoff, and date.');
        setBookingLoading(false);
        return;
      }
      if (!fromLocationData || (!toLocationData && tripType !== 'Tour')) {
        setBookingError('Please select locations from the dropdown suggestions to calculate the fare.');
        setBookingLoading(false);
        return;
      }
      if (tripType === 'Round-trip' && !returnDate) {
        setBookingError('Please select a return date for round trip.');
        setBookingLoading(false);
        return;
      }
      if (tripType === 'Tour' && destinations.some(d => !d)) {
        setBookingError('Please fill in all destination cities.');
        setBookingLoading(false);
        return;
      }
      if (tripType === 'Tour' && destinationData.some(d => !d)) {
        setBookingError('Please select all destinations from the dropdown suggestions.');
        setBookingLoading(false);
        return;
      }
    }

    if (tripType === 'Car Renting') {
      const days = Number(numberOfDays) || 1;
      const cars = Number(numberOfCars) || 1;
      if (days < 1 || days > 30) {
        setBookingError('Number of days must be between 1 and 30.');
        setBookingLoading(false);
        return;
      }
      if (cars < 1 || cars > 10) {
        setBookingError('Number of vehicles must be between 1 and 10.');
        setBookingLoading(false);
        return;
      }
    }

    if (numberOfPeople < 1) {
      setBookingError('Number of people must be at least 1.');
      setBookingLoading(false);
      return;
    }

    try {
      if (!user) return;
      
      if (numberOfPeople > 22) {
        setBookingError('Please contact admin for custom arrangement.');
        setBookingLoading(false);
        return;
      }

      const vehicleObj = AVAILABLE_VEHICLES.find(v => v.name === selectedVehicle);
      if (vehicleObj && vehicleObj.quantity <= 0) {
        setBookingError('The selected vehicle is currently unavailable.');
        setBookingLoading(false);
        return;
      }
      if (vehicleObj && vehicleObj.capacity < numberOfPeople && !confirmCapacity && tripType !== 'Car Renting') {
        setBookingError('Please confirm that you want to proceed with a vehicle that may not accommodate all passengers.');
        setBookingLoading(false);
        return;
      }
      
      let finalEstimatedPrice = 0;
      const days = Number(numberOfDays) || 1;
      const cars = Number(numberOfCars) || 1;
      
      if (tripType === 'Car Renting') {
        finalEstimatedPrice = (days * 2000 * cars);
      } else {
        finalEstimatedPrice = estimatedPrice || (estimatedKM * (isAC ? 14 : 13));
      }

      const formattedRideDate = `${rideDate} ${rideTimeHour}:${rideTimeMinute} ${rideTimeAmPm}`;
      
      if (rideDate) {
        const depDate = new Date(formattedRideDate);
        const now = new Date();
        if (depDate < now) {
          setBookingError('Departure date and time cannot be in the past.');
          setBookingLoading(false);
          return;
        }
      }

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
        
        // Add halt charge for round-trip
        const haltCharge = calculateHaltCharge();
        finalEstimatedPrice += haltCharge;
      }

      const validDestinations = destinations.filter(d => d.trim() !== '');
      
      const newBooking = await api.createBooking({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        fromLocation,
        toLocation: tripType === 'Tour' ? 'N/A' : toLocation,
        destinations: tripType === 'Tour' ? validDestinations.join(', ') : 'N/A',
        rideDate: formattedRideDate,
        tripType,
        returnDate: formattedReturnDate,
        rideType,
        numberOfPeople,
        fareAmount: finalEstimatedPrice,
        numberOfDays: tripType === 'Car Renting' ? days : 'N/A',
        numberOfCars: tripType === 'Car Renting' ? cars : 'N/A',
        estimatedKM: tripType !== 'Car Renting' ? estimatedKM : 'N/A',
        suggestedVehicle: selectedVehicle,
        isAC,
        weddingDetails: tripType === 'Wedding' ? { weddingDate, eventLocation, vehiclesRequired, decorationRequired } : undefined,
        airportDetails: rideType === 'Airport Transfer' ? { pickupType } : undefined,
        customRequirements: rideType === 'Other' ? customRequirements : undefined
      });

      setFromLocation('');
      setFromLocationData(null);
      setToLocation('');
      setToLocationData(null);
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
      setDestinationData([null]);
      setNumberOfDays(1);
      setNumberOfCars(1);
      setEstimatedKM(0);
      setWeddingDate('');
      setEventLocation('');
      setVehiclesRequired('1');
      setDecorationRequired('No');
      setPickupType('Arrival');
      setCustomRequirements('');
      setAcceptedTerms(false);
      
      setBookingSuccessData(newBooking);
      
      // Refresh bookings
      fetchBookings();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book ride');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRebookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rebookModal.booking || !rebookDate) return;

    setRebookLoading(true);
    setRebookError('');

    try {
      const b = rebookModal.booking;
      const rideDate = new Date(`${rebookDate} ${rebookTimeHour}:${rebookTimeMinute} ${rebookTimeAmPm}`);
      
      const now = new Date();
      if (rideDate < now) {
        setRebookError('New date and time cannot be in the past.');
        setRebookLoading(false);
        return;
      }

      const newBooking = {
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
        userPhone: user?.phone,
        tripType: b.tripType,
        fromLocation: b.fromLocation,
        toLocation: b.toLocation,
        destinations: b.destinations,
        rideDate: rideDate.toISOString(),
        numberOfPeople: b.numberOfPeople,
        suggestedVehicle: b.suggestedVehicle,
        isAC: b.isAC,
        distance: b.distance,
        fareAmount: b.fareAmount,
        rideStatus: 'Pending',
        paymentStatus: 'Pending',
      };

      const response = await api.createBooking(newBooking);
      setBookingSuccessData(response);
      setRebookModal({ isOpen: false, booking: null });
      setRebookDate('');
      setRebookTimeHour('12');
      setRebookTimeMinute('00');
      setRebookTimeAmPm('AM');
      setActiveTab('dashboard'); // Switch to dashboard to show success message
    } catch (error) {
      console.error('Failed to rebook:', error);
      setRebookError('Failed to rebook ride. Please try again.');
    } finally {
      setRebookLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancelMessage(null);
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rideStatus: "Cancelled" })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          setCancelMessage({ id, text: data.message || data.error || "Failed to cancel ride", type: 'error' });
          return;
        }
      } else {
        const text = await response.text();
        if (!response.ok) {
          console.error("Non-JSON error response:", text);
          setCancelMessage({ id, text: "Failed to cancel ride. Server returned an invalid response.", type: 'error' });
          return;
        }
      }

      setCancelMessage({ id, text: "Ride cancelled successfully", type: 'success' });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error cancelling ride:", error);
      setCancelMessage({ id, text: "An error occurred while cancelling the ride. Please try again.", type: 'error' });
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
      case 'Confirmed': return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case 'Assigned': return 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'Ongoing': return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Completed': return 'bg-green-50 text-green-600 border border-green-100';
      case 'Cancelled': return 'bg-red-50 text-red-600 border border-red-100';
      default: return 'bg-gray-50 text-gray-600 border border-gray-100';
    }
  };

  const getPaymentColor = (status: string) => {
    return status === 'Paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900 capitalize">
                {getGreeting()}, {user?.name || 'Customer'}
              </h1>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap bg-white rounded-lg shadow-sm border border-gray-100 p-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                My Bookings
              </button>
            </div>
          </div>
          
          {activeTab === 'dashboard' ? (
            <div className="max-w-3xl mx-auto flex flex-col gap-8">
              {/* Profile Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className={`flex justify-between items-start ${isEditingProfile ? 'mb-6' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md">
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
                          setFromLocationData(null);
                          setShowFromSuggestions(true);
                        }}
                        onFocus={() => setShowFromSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            if (!fromLocationData && fromSuggestions.length > 0 && fromLocation.length > 0) {
                              setFromLocation(fromSuggestions[0].displayName);
                              setFromLocationData(fromSuggestions[0]);
                            }
                            setShowFromSuggestions(false);
                          }, 200);
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Pickup location"
                        autoComplete="off"
                      />
                      {showFromSuggestions && fromSuggestions.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {fromSuggestions.map((loc, idx) => (
                            <li
                              key={idx}
                              className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 hover:text-indigo-900"
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input from losing focus immediately
                                setFromLocation(loc.displayName);
                                setFromLocationData(loc);
                                setShowFromSuggestions(false);
                              }}
                            >
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                <div className="flex flex-col">
                                  <span className="font-medium truncate">{loc.primaryText || loc.displayName}</span>
                                  {loc.secondaryText && (
                                    <span className="text-xs text-gray-500 truncate">{loc.secondaryText}</span>
                                  )}
                                </div>
                              </div>
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
                          setToLocationData(null);
                          setShowToSuggestions(true);
                        }}
                        onFocus={() => setShowToSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            if (!toLocationData && toSuggestions.length > 0 && toLocation.length > 0) {
                              setToLocation(toSuggestions[0].displayName);
                              setToLocationData(toSuggestions[0]);
                            }
                            setShowToSuggestions(false);
                          }, 200);
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Drop-off location"
                        autoComplete="off"
                      />
                      {showToSuggestions && toSuggestions.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {toSuggestions.map((loc, idx) => (
                            <li
                              key={idx}
                              className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 hover:text-indigo-900"
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input from losing focus immediately
                                setToLocation(loc.displayName);
                                setToLocationData(loc);
                                setShowToSuggestions(false);
                              }}
                            >
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                <div className="flex flex-col">
                                  <span className="font-medium truncate">{loc.primaryText || loc.displayName}</span>
                                  {loc.secondaryText && (
                                    <span className="text-xs text-gray-500 truncate">{loc.secondaryText}</span>
                                  )}
                                </div>
                              </div>
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
                        className="space-y-4"
                      >
                        {destinations.map((dest, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-grow relative">
                              <label className="block text-sm font-medium text-gray-700">Destination {index + 1}</label>
                              <input
                                type="text"
                                required
                                value={dest}
                                onChange={(e) => {
                                  const newDests = [...destinations];
                                  newDests[index] = e.target.value;
                                  setDestinations(newDests);
                                  
                                  const newData = [...destinationData];
                                  newData[index] = null;
                                  setDestinationData(newData);
                                  
                                  setActiveDestinationIndex(index);
                                }}
                                onFocus={() => setActiveDestinationIndex(index)}
                                onBlur={() => {
                                  setTimeout(() => {
                                    if (!destinationData[index] && destinationSuggestions[index] && destinationSuggestions[index].length > 0 && destinations[index].length > 0) {
                                      const newDestinations = [...destinations];
                                      newDestinations[index] = destinationSuggestions[index][0].displayName;
                                      setDestinations(newDestinations);
                                      
                                      const newData = [...destinationData];
                                      newData[index] = destinationSuggestions[index][0];
                                      setDestinationData(newData);
                                    }
                                    setActiveDestinationIndex(null);
                                  }, 200);
                                }}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={`Destination ${index + 1}`}
                                autoComplete="off"
                              />
                              {activeDestinationIndex === index && destinationSuggestions[index] && destinationSuggestions[index].length > 0 && (
                                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                  {destinationSuggestions[index].map((loc, idx) => (
                                    <li
                                      key={idx}
                                      className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 hover:text-indigo-900"
                                      onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent input from losing focus immediately
                                        const newDests = [...destinations];
                                        newDests[index] = loc.displayName;
                                        setDestinations(newDests);
                                        
                                        const newData = [...destinationData];
                                        newData[index] = loc;
                                        setDestinationData(newData);
                                        
                                        setActiveDestinationIndex(null);
                                      }}
                                    >
                                      <div className="flex items-center">
                                        <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                        <div className="flex flex-col">
                                          <span className="font-medium truncate">{loc.primaryText || loc.displayName}</span>
                                          {loc.secondaryText && (
                                            <span className="text-xs text-gray-500 truncate">{loc.secondaryText}</span>
                                          )}
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDestinations(destinations.filter((_, i) => i !== index));
                                  setDestinationData(destinationData.filter((_, i) => i !== index));
                                  const newSuggestions: { [key: number]: LocationData[] } = {};
                                  Object.keys(destinationSuggestions).forEach((key) => {
                                    const k = parseInt(key);
                                    if (k < index) {
                                      newSuggestions[k] = destinationSuggestions[k];
                                    } else if (k > index) {
                                      newSuggestions[k - 1] = destinationSuggestions[k];
                                    }
                                  });
                                  setDestinationSuggestions(newSuggestions);
                                }}
                                className="mb-1 px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDestinations([...destinations, '']);
                            setDestinationData([...destinationData, null]);
                          }}
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
                        min={new Date().toISOString().split('T')[0]}
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
                            min={rideDate || new Date().toISOString().split('T')[0]}
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
                              max="30"
                              value={numberOfDays}
                              onChange={(e) => setNumberOfDays(parseInt(e.target.value) || 1)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label htmlFor="numberOfCars" className="block text-sm font-medium text-gray-700">Number of Vehicles</label>
                            <input
                              type="number"
                              id="numberOfCars"
                              required={tripType === 'Car Renting'}
                              min="1"
                              max="10"
                              value={numberOfCars}
                              onChange={(e) => setNumberOfCars(parseInt(e.target.value) || 1)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Select Vehicle</label>
                          <select
                            value={selectedVehicle}
                            onChange={(e) => setSelectedVehicle(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                          >
                            {AVAILABLE_VEHICLES.map(v => (
                              <option key={v.name} value={v.name} disabled={v.quantity <= 0}>
                                {v.name} (Up to {v.capacity} passengers) - {v.quantity > 0 ? 'Available' : 'Currently Unavailable'}
                              </option>
                            ))}
                          </select>
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
                            <label className="block text-sm font-medium text-gray-700">Vehicle Selection</label>
                            <select
                              value={selectedVehicle}
                              onChange={(e) => {
                                setSelectedVehicle(e.target.value);
                                setConfirmCapacity(false);
                              }}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                            >
                              {AVAILABLE_VEHICLES.map(v => (
                                <option key={v.name} value={v.name} disabled={v.quantity <= 0}>
                                  {v.name} (Up to {v.capacity} passengers) - {v.quantity > 0 ? 'Available' : 'Currently Unavailable'}
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

                            {tripType !== 'Car Renting' && (
                              <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">AC Vehicle</h4>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={isAC}
                                    onChange={(e) => setIsAC(e.target.checked)}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
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
                            min={new Date().toISOString().split('T')[0]}
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
                            <label htmlFor="vehiclesRequired" className="block text-sm font-medium text-gray-700">Number of Vehicles (Max 10)</label>
                            <input
                              type="number"
                              id="vehiclesRequired"
                              min="1"
                              max="10"
                              value={vehiclesRequired}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                if (valStr === '') {
                                  setVehiclesRequired('');
                                  return;
                                }
                                const val = parseInt(valStr);
                                if (!isNaN(val)) {
                                  if (val > 10) setVehiclesRequired('10');
                                  else if (val < 1) setVehiclesRequired('1');
                                  else setVehiclesRequired(val.toString());
                                }
                              }}
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
                    <div 
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-indigo-800">Total Cost Summary</h4>
                        {tripType === 'Round-trip' && calculateHaltCharge() > 0 && !isCalculatingDistance && (
                          showCostBreakdown ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <span className="text-2xl font-bold text-indigo-900">
                        {isCalculatingDistance ? (
                          <span className="text-sm font-normal text-indigo-500 animate-pulse">Calculating...</span>
                        ) : (
                          `₹${(estimatedPrice + (tripType === 'Round-trip' ? calculateHaltCharge() : 0)).toFixed(2)}`
                        )}
                      </span>
                    </div>
                    
                    <AnimatePresence>
                      {showCostBreakdown && tripType === 'Round-trip' && calculateHaltCharge() > 0 && !isCalculatingDistance && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-3 border-t border-indigo-100">
                            <div className="flex justify-between items-center text-sm text-indigo-600">
                              <span>Base Fare</span>
                              <span>₹{estimatedPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-indigo-600">
                              <span>Halt Charge</span>
                              <span>₹{calculateHaltCharge().toFixed(2)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <div className="mt-6 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-indigo-600" />
                      Cancellation Policy & Terms
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 mb-4 text-xs text-gray-600">
                      <li><strong>Less than 24 hours</strong> before departure: No refund.</li>
                      <li><strong>24 to 72 hours</strong> before departure: 50% refund (25% for multi-day trips).</li>
                      <li><strong>More than 72 hours</strong> before departure: 85% refund (50% for multi-day trips).</li>
                    </ul>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        I have read and agree to the Cancellation Policy & Terms.
                      </span>
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={bookingLoading || !acceptedTerms}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
                  >
                    {bookingLoading ? (tripType === 'Car Renting' ? 'Renting...' : 'Booking...') : (tripType === 'Car Renting' ? 'Rent Vehicle' : 'Book Ride')}
                  </button>
                </motion.form>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">My Bookings</h3>
                  <button 
                    onClick={() => {
                      setLoading(true);
                      fetchBookings(true);
                    }}
                    disabled={loading}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                    title="Refresh bookings"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">No bookings found. Book a ride to get started!</div>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Always visible header */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-4">
                          <h4 className="text-lg font-bold text-gray-900 break-words w-full sm:w-auto">
                            {booking.tripType === 'Car Renting'
                              ? `Car Rental: ${booking.numberOfDays} days, ${booking.numberOfCars} cars`
                              : booking.tripType === 'Tour' 
                              ? `${booking.fromLocation} \u2192 ${booking.destinations}`
                              : `${booking.fromLocation} \u2192 ${booking.toLocation}`}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.rideStatus)}`}>
                              {booking.rideStatus}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentColor(booking.paymentStatus)}`}>
                              {booking.paymentStatus}
                            </span>
                            {expandedBookingId === booking.id ? (
                              <ChevronUp className="w-5 h-5 text-gray-400 ml-auto sm:ml-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400 ml-auto sm:ml-0" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            {format(new Date(booking.rideDate), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-red-400" />
                            {format(new Date(booking.rideDate), 'h:mm a')}
                          </div>
                          <div className="flex items-center gap-1.5 font-medium text-gray-900">
                            ₹{parseFloat(booking.fareAmount).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Body */}
                      <AnimatePresence>
                        {expandedBookingId === booking.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-gray-100 bg-gray-50"
                          >
                            <div className="p-6">
                              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                                <div className="flex items-center gap-1.5">
                                  <Car className="w-4 h-4 text-blue-400" />
                                  {booking.suggestedVehicle || 'Sedan'} {booking.isAC === 'Yes' ? '(AC)' : '(Non-AC)'}
                                </div>
                              {booking.tripType !== 'Car Renting' && (
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-purple-400" />
                                  {booking.numberOfPeople} Passenger{booking.numberOfPeople > 1 ? 's' : ''}
                                </div>
                              )}
                              </div>

                              {/* Driver Details Section */}
                              {booking.driverDetails ? (
                                <div className="mb-6 p-4 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                  <h5 className="text-sm font-semibold text-indigo-900 mb-2">Driver & Vehicle Details</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-indigo-700 uppercase tracking-wider">Driver Name</p>
                                      <p className="text-sm font-medium text-indigo-900">{booking.driverDetails.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-indigo-700 uppercase tracking-wider">Phone Number</p>
                                      <p className="text-sm font-medium text-indigo-900">{booking.driverDetails.phone}</p>
                                    </div>
                                    {booking.vehicleDetails && (
                                      <div className="sm:col-span-2">
                                        <p className="text-xs text-indigo-700 uppercase tracking-wider">Vehicle Assigned</p>
                                        <p className="text-sm font-medium text-indigo-900">{booking.vehicleDetails.name} ({booking.vehicleDetails.number})</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : booking.visibilityMessage ? (
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
                                  <p className="text-sm text-blue-700 flex items-center gap-2">
                                    <Info className="w-5 h-5 flex-shrink-0" />
                                    {booking.visibilityMessage}
                                  </p>
                                </div>
                              ) : null}

                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Booking ID</p>
                                  <p className="text-sm font-medium text-gray-900">#{booking.id}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <div className="flex gap-2">
                                    {booking.rideStatus === 'Completed' && (
                                      <button
                                        onClick={() => setRebookModal({ isOpen: true, booking })}
                                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                      >
                                        Rebook Ride
                                      </button>
                                    )}
                                    {(booking.rideStatus === 'Pending' || booking.rideStatus === 'Confirmed' || booking.rideStatus === 'Assigned') && (
                                      <button
                                        onClick={() => {
                                          const refundInfo = calculateRefund(booking.rideDate, booking.fareAmount, booking.numberOfDays);
                                          setCancelModal({ isOpen: true, booking, refundInfo });
                                        }}
                                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-100 text-red-600 hover:bg-red-200"
                                      >
                                        Cancel Ride
                                      </button>
                                    )}
                                  </div>
                                  {cancelMessage && cancelMessage.id === booking.id && (
                                    <p className={`text-xs max-w-[200px] text-right ${cancelMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                      {cancelMessage.text}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModal.isOpen && cancelModal.booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Cancel Ride</h3>
                  <button 
                    onClick={() => setCancelModal({ isOpen: false, booking: null, refundInfo: null })}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium text-gray-900">Route:</span> {cancelModal.booking.tripType === 'Car Renting' ? `Car Rental: ${cancelModal.booking.numberOfDays} days, ${cancelModal.booking.numberOfCars} cars` : cancelModal.booking.tripType === 'Tour' ? `${cancelModal.booking.fromLocation} \u2192 ${cancelModal.booking.destinations}` : `${cancelModal.booking.fromLocation} \u2192 ${cancelModal.booking.toLocation}`}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium text-gray-900">Departure:</span> {cancelModal.booking.rideDate}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Fare:</span> ₹{cancelModal.booking.fareAmount}
                  </p>
                </div>

                {cancelModal.refundInfo && (
                  <div className={`mb-6 p-4 rounded-xl border ${cancelModal.refundInfo.refundPercent > 0 ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                    <h4 className="font-semibold mb-1">Cancellation Policy</h4>
                    <p className="text-sm mb-2">{cancelModal.refundInfo.message}</p>
                    <div className="flex justify-between items-center font-bold">
                      <span>Estimated Refund:</span>
                      <span>₹{cancelModal.refundInfo.refundAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setCancelModal({ isOpen: false, booking: null, refundInfo: null })}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Keep Ride
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCancel(cancelModal.booking.id);
                      setCancelModal({ isOpen: false, booking: null, refundInfo: null });
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rebook Modal */}
      <AnimatePresence>
        {rebookModal.isOpen && rebookModal.booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Rebook Ride</h3>
                  <button 
                    onClick={() => setRebookModal({ isOpen: false, booking: null })}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium text-gray-900">Route:</span> {rebookModal.booking.tripType === 'Car Renting' ? `Car Rental: ${rebookModal.booking.numberOfDays} days, ${rebookModal.booking.numberOfCars} cars` : rebookModal.booking.tripType === 'Tour' ? `${rebookModal.booking.fromLocation} \u2192 ${rebookModal.booking.destinations}` : `${rebookModal.booking.fromLocation} \u2192 ${rebookModal.booking.toLocation}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Vehicle:</span> {rebookModal.booking.suggestedVehicle} {rebookModal.booking.isAC === 'Yes' ? '(AC)' : '(Non-AC)'}
                  </p>
                </div>

                <form onSubmit={handleRebookSubmit} className="space-y-4">
                  {rebookError && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                      {rebookError}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select New Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={rebookDate}
                      onChange={(e) => setRebookDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select New Time</label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={rebookTimeHour}
                        onChange={(e) => setRebookTimeHour(e.target.value)}
                        className="block w-full flex-1 border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                          <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                      <span className="flex items-center text-gray-500 font-bold">:</span>
                      <select
                        value={rebookTimeMinute}
                        onChange={(e) => setRebookTimeMinute(e.target.value)}
                        className="block w-full flex-1 border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        {['00', '15', '30', '45'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={rebookTimeAmPm}
                        onChange={(e) => setRebookTimeAmPm(e.target.value)}
                        className="block w-full flex-1 border border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRebookModal({ isOpen: false, booking: null })}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={rebookLoading || !rebookDate}
                      className="flex-1 px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                      {rebookLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        'Confirm Rebook'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Success Modal */}
      <AnimatePresence>
        {bookingSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                <p className="text-gray-500 mb-6">Your ride has been successfully scheduled.</p>

                <div className="bg-gray-50 rounded-xl p-4 text-left border border-gray-100 mb-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Route</span>
                      <span className="font-medium text-gray-900 text-right">
                        {bookingSuccessData.tripType === 'Car Renting'
                          ? `Car Rental: ${bookingSuccessData.numberOfDays} days, ${bookingSuccessData.numberOfCars} cars`
                          : bookingSuccessData.tripType === 'Tour' 
                          ? `${bookingSuccessData.fromLocation} \u2192 ${bookingSuccessData.destinations}`
                          : `${bookingSuccessData.fromLocation} \u2192 ${bookingSuccessData.toLocation}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Departure</span>
                      <span className="font-medium text-gray-900 text-right">
                        {format(new Date(bookingSuccessData.rideDate), 'dd/MM/yyyy hh:mm a')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg text-sm border border-indigo-100 flex items-start gap-2 text-left">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>We will contact you shortly.</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100 flex items-start gap-2 text-left">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>Driver information will be given to you before 1 hour of the departure time.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={() => {
                      setActiveTab('bookings');
                      setBookingSuccessData(null);
                    }}
                    className="flex-1 justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Go to My Bookings
                  </button>
                  <button
                    onClick={() => setBookingSuccessData(null)}
                    className="flex-1 justify-center py-2.5 px-4 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Book Another
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
