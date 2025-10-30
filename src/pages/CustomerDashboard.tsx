import { useState, useEffect, useCallback } from 'react';
// import { Vehicle, Booking, Profile } from '@/lib/supabase'; // Remove supabase import
import { useAuth } from '@/contexts/MongoAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Truck, MapPin, Navigation, Package, IndianRupee, Key, CheckCircle, Route, Star, Edit, RefreshCcw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MapView from '@/components/MapView';
import RouteMap from '@/components/RouteMap';
import StarRating from '@/components/StarRating';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

// Type definitions
interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface Vehicle {
  _id: string;
  name: string;
  type: string;
  capacity?: string;
  driverId?: string;
  is_active?: boolean;
}

interface Booking {
  _id?: string;
  id?: string;
  customerId: string;
  customerName?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleName?: string;
  status: string;
  pickupLocation?: Location;
  destinationLocation?: Location;
  distance?: number;
  price?: number;
  pickupOTP?: string;
  createdAt?: string;
  created_at?: string;
}

interface Profile {
  _id: string;
  name: string;
  email: string;
  role: string;
}

  const [vehicles, setVehicles] = useState<(Vehicle & { driver?: Profile })[]>([]);
  // MERN active vehicles from backend
  const [activeVehicles, setActiveVehicles] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const [requestedVehicleIds, setRequestedVehicleIds] = useState<Record<string, boolean>>({});
  
  // Feedback state
  const [bookingFeedbacks, setBookingFeedbacks] = useState<Record<string, any>>({});
  const [feedbackRating, setFeedbackRating] = useState<Record<string, number>>({});
  const [feedbackComment, setFeedbackComment] = useState<Record<string, string>>({});
  const [editingFeedback, setEditingFeedback] = useState<Record<string, boolean>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<Record<string, boolean>>({});

  // Booking form state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dropLocation, setDropLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'drop' | null>(null);
  
  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<any>(null);
  const [dialogPickupAddress, setDialogPickupAddress] = useState('');
  const [dialogDropAddress, setDialogDropAddress] = useState('');
  const [dialogPickupLocation, setDialogPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dialogDropLocation, setDialogDropLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dialogSelectingLocation, setDialogSelectingLocation] = useState<'pickup' | 'drop' | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<any[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropSuggestions, setShowDropSuggestions] = useState(false);
  
  // Real-time tracking state
  const [driverLocations, setDriverLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [bookingOTPs, setBookingOTPs] = useState<Record<string, string>>({});
  const [resendingOtp, setResendingOtp] = useState<Record<string, boolean>>({});

  // Initialize requested vehicle IDs from bookings data
  useEffect(() => {
    if (bookings.length >= 0) { // Run this effect whenever bookings changes
      const requestedIds: Record<string, boolean> = {};
      bookings.forEach((booking: any) => {
        if (booking.status === 'Requested' && booking.vehicleId) {
          requestedIds[booking.vehicleId] = true;
        }
      });
      setRequestedVehicleIds(requestedIds);
    }
  }, [bookings]);

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          toast({
            title: 'Location detected',
            description: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: 'Location access denied',
            description: 'Using default location. Please enable location access.',
            variant: 'destructive',
          });
          // Default to a central location if geolocation fails
          setUserLocation({ lat: 28.6139, lng: 77.2090 }); // Delhi, India
        }
      );
    } else {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      setUserLocation({ lat: 28.6139, lng: 77.2090 });
    }
  };

  // Search for address suggestions using Nominatim API
  const searchAddress = async (query: string, type: 'pickup' | 'drop') => {
    if (query.length < 3) {
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropSuggestions([]);
        setShowDropSuggestions(false);
      }
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      
      if (type === 'pickup') {
        setPickupSuggestions(data);
        setShowPickupSuggestions(true);
      } else {
        setDropSuggestions(data);
        setShowDropSuggestions(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: any, type: 'pickup' | 'drop') => {
    const location = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    };
    
    if (type === 'pickup') {
      setDialogPickupAddress(suggestion.display_name);
      setDialogPickupLocation(location);
      setShowPickupSuggestions(false);
      setPickupSuggestions([]);
    } else {
      setDialogDropAddress(suggestion.display_name);
      setDialogDropLocation(location);
      setShowDropSuggestions(false);
      setDropSuggestions([]);
    }
    
    toast({
      title: `${type === 'pickup' ? 'Pickup' : 'Drop'} location set`,
      description: suggestion.display_name,
    });
  };

  // Fetch active vehicles from MERN backend
  const fetchActiveVehicles = useCallback(async () => {
    try {
      console.log('🔄 Fetching active vehicles from backend...');
      const data = await apiGet<any[]>('/api/vehicles/active');
      console.log('✅ Active vehicles fetched:', data?.length || 0, 'vehicles');
      console.log('Vehicle data:', data);

      // Ensure vehicles have proper structure
      const vehiclesWithDrivers = data?.map(vehicle => ({
        ...vehicle,
        vehicleName: vehicle.vehicleName || `${vehicle.type} ${vehicle.number}`,
        driverName: vehicle.driverName || 'No driver assigned'
      })) || [];

      console.log('📋 Processed vehicles:', vehiclesWithDrivers);
      setActiveVehicles(vehiclesWithDrivers);
    } catch (error) {
      console.error('❌ Failed to load active vehicles:', error);
      setActiveVehicles([]);
    }
  }, []);

  // Open booking dialog when user clicks Book Now
  const handleBookNow = (veh: any) => {
    if (!user) {
      toast({ title: 'Please login first', variant: 'destructive' });
      return;
    }
    setSelectedVehicleForBooking(veh);
    setDialogPickupAddress('');
    setDialogDropAddress('');
    setDialogPickupLocation(null);
    setDialogDropLocation(null);
    setDialogSelectingLocation(null);
    setPickupSuggestions([]);
    setDropSuggestions([]);
    setShowPickupSuggestions(false);
    setShowDropSuggestions(false);
    setBookingDialogOpen(true);
    
    // Get user's current location when opening dialog
    if (!userLocation) {
      getUserLocation();
    }
  };

  // Confirm booking after locations are set
  const handleConfirmBooking = async () => {
    if (!user || !selectedVehicleForBooking) return;
    
    if (!dialogPickupLocation || !dialogDropLocation) {
      toast({ 
        title: 'Missing locations', 
        description: 'Please set both pickup and drop locations',
        variant: 'destructive' 
      });
      return;
    }

    if (!dialogPickupAddress.trim() || !dialogDropAddress.trim()) {
      toast({ 
        title: 'Missing addresses', 
        description: 'Please enter both pickup and drop addresses',
        variant: 'destructive' 
      });
      return;
    }

    try {
      const distance = calculateDistance(
        dialogPickupLocation.lat,
        dialogPickupLocation.lng,
        dialogDropLocation.lat,
        dialogDropLocation.lng
      );
      const price = distance * 10; // ₹10 per km

      const body = {
        customerId: user.id,
        customerName: (user as any).name || (user as any).email || 'Customer',
        customerAddress: dialogPickupAddress,
        vehicleId: selectedVehicleForBooking._id, // Track which vehicle was requested
        // Don't assign driver or vehicle - admin will do this
        status: 'Requested',
        pickupLocation: { ...dialogPickupLocation, address: dialogPickupAddress },
        destinationLocation: { ...dialogDropLocation, address: dialogDropAddress },
        distance,
        price,
      };

      console.log('🚀 Creating booking with data:', body);

      const response = await apiPost('/api/bookings', body);
      console.log('✅ Booking created successfully:', response);

      setRequestedVehicleIds((prev) => ({ ...prev, [selectedVehicleForBooking._id]: true }));
      toast({
        title: 'Booking Request Sent to Admin',
        description: 'Your booking request is pending admin approval'
      });

      setBookingDialogOpen(false);
      setSelectedVehicleForBooking(null);
    } catch (e: any) {
      console.error('❌ Error creating booking:', e);
      toast({ title: 'Request failed', description: e.message, variant: 'destructive' });
    }
  };

  // Handle map click in dialog
  const handleDialogMapClick = (lat: number, lng: number) => {
    if (dialogSelectingLocation === 'pickup') {
      setDialogPickupLocation({ lat, lng });
      setDialogSelectingLocation(null);
      toast({
        title: 'Pickup location set',
        description: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    } else if (dialogSelectingLocation === 'drop') {
      setDialogDropLocation({ lat, lng });
      setDialogSelectingLocation(null);
      toast({
        title: 'Drop location set',
        description: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    }
  };

  const handleResendOtp = async (bookingId: string) => {
    try {
      setResendingOtp(prev => ({ ...prev, [bookingId]: true }));
      await apiPost(`/api/bookings/${bookingId}/resend-otp`, {});

      toast({
        title: 'OTP resent',
        description: 'A new OTP has been sent to you and the driver.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to resend OTP',
        description: error.message || 'Unable to resend OTP right now.',
        variant: 'destructive',
      });
    } finally {
      setResendingOtp(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket || !user) return;

    console.log('🔌 Setting up Socket.IO listeners for customer:', user.id);

    // Listen for OTP generation when driver accepts booking
    const onOtpGenerated = (otpData: any) => {
      console.log('🔑 OTP received for customer:', otpData);
      if (otpData.id) {
        // Update booking in state to show OTP
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === otpData.id || booking._id === otpData.id
              ? { ...booking, pickupOTP: otpData.otp, status: 'Booked' }
              : booking
          )
        );

        setBookingOTPs(prev => ({
          ...prev,
          [otpData.id]: otpData.otp,
        }));

        toast({
          title: 'Driver Found! 🎉',
          description: `Your OTP is: ${otpData.otp}. Share this with the driver when they arrive.`,
          duration: 10000, // Show for 10 seconds
        });
      }
    };

    // Listen for booking confirmations
    const onBookingConfirmed = (bookingData: any) => {
      console.log('✅ Booking confirmed for customer:', bookingData);
      if (bookingData.id) {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === bookingData.id || booking._id === bookingData.id
              ? { ...booking, ...bookingData, status: 'Booked' }
              : booking
          )
        );
      }
    };

    // Listen for delivery completion
    const onDeliveryCompleted = (deliveryData: any) => {
      console.log('🎯 Delivery completed for customer:', deliveryData);
      if (deliveryData.id) {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === deliveryData.id || booking._id === deliveryData.id
              ? { ...booking, status: 'Delivered' }
              : booking
          )
        );

        toast({
          title: 'Delivery Completed! ✅',
          description: 'Your order has been delivered successfully.',
        });
      }
    };

    // Listen for driver location updates
    const onDriverLocationUpdate = (locationData: any) => {
      console.log('📍 Driver location update received:', locationData);
      if (locationData.bookingId && locationData.location) {
        setDriverLocations(prev => ({
          ...prev,
          [locationData.bookingId]: locationData.location
        }));
      }
    };

    socket.on('driver_location_update', onDriverLocationUpdate);

    return () => {
      socket.off('pickup_otp_generated', onOtpGenerated);
      socket.off('booking_confirmed', onBookingConfirmed);
      socket.off('delivery_completed', onDeliveryCompleted);
      socket.off('driver_location_update', onDriverLocationUpdate);
    };
  }, [socket, user, toast]);

  // Close suggestion dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#pickup-address') && !target.closest('.pickup-suggestions')) {
        setShowPickupSuggestions(false);
      }
      if (!target.closest('#drop-address') && !target.closest('.drop-suggestions')) {
        setShowDropSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Socket listeners: booking status + live location + OTP + vehicle updates
  useEffect(() => {
    if (!socket) return;

    const onVehicleAdded = (vehicle: any) => {
      console.log('🚗 Vehicle added via Socket.IO:', vehicle);
      // Refresh vehicle list when a new vehicle is added
      fetchData();
    };

    const onVehicleUpdated = (vehicle: any) => {
      console.log('🔄 Vehicle updated via Socket.IO:', vehicle);
      // Refresh vehicle list when a vehicle is updated
      fetchData();
    };

    const onBookingConfirmed = (bookingData: any) => {
      console.log('✅ Booking confirmed via Socket.IO:', bookingData);
      // Refresh bookings list when admin confirms a booking
      fetchData();
      
      // Show toast notification
      toast({
        title: 'Booking Confirmed!',
        description: 'Your booking request has been approved and assigned to a driver.',
      });
    };

    const onBookingCreated = (bookingData: any) => {
      console.log('📦 Booking created via Socket.IO:', bookingData);
      // Refresh bookings list when a new booking is created
      fetchData();
    };

    const onBookingStatusUpdated = (bookingData: any) => {
      console.log('🔄 Booking status updated via Socket.IO:', bookingData);
      // Refresh bookings list when booking status changes
      fetchData();
    };

    socket.on('vehicle_added', onVehicleAdded);
    socket.on('vehicle_updated', onVehicleUpdated);
    socket.on('booking_created', onBookingCreated);
    socket.on('booking_confirmed', onBookingConfirmed);
    socket.on('booking_status_updated', onBookingStatusUpdated);

    return () => {
      socket.off('vehicle_added', onVehicleAdded);
      socket.off('vehicle_updated', onVehicleUpdated);
      socket.off('booking_created', onBookingCreated);
      socket.off('booking_confirmed', onBookingConfirmed);
      socket.off('booking_status_updated', onBookingStatusUpdated);
    };
  }, [socket]);

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket || !user) return;

    console.log('🔌 Setting up Socket.IO listeners for customer:', user.id);

    // Listen for OTP generation when driver accepts booking
    const onOtpGenerated = (otpData: any) => {
      console.log('🔑 OTP received for customer:', otpData);
      if (otpData.id) {
        // Update booking in state to show OTP
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === otpData.id || booking._id === otpData.id
              ? { ...booking, pickupOTP: otpData.otp, status: 'Booked' }
              : booking
          )
        );

        setBookingOTPs(prev => ({
          ...prev,
          [otpData.id]: otpData.otp,
        }));

        toast({
          title: 'Driver Found! 🎉',
          description: `Your OTP is: ${otpData.otp}. Share this with the driver when they arrive.`,
          duration: 10000, // Show for 10 seconds
        });
      }
    };

    // Listen for booking confirmations
    const onBookingConfirmed = (bookingData: any) => {
      console.log('✅ Booking confirmed for customer:', bookingData);
      if (bookingData.id) {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === bookingData.id || booking._id === bookingData.id
              ? { ...booking, ...bookingData, status: 'Booked' }
              : booking
          )
        );
      }
    };

    // Listen for delivery completion
    const onDeliveryCompleted = (deliveryData: any) => {
      console.log('🎯 Delivery completed for customer:', deliveryData);
      if (deliveryData.id) {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === deliveryData.id || booking._id === deliveryData.id
              ? { ...booking, status: 'Delivered' }
              : booking
          )
        );

        toast({
          title: 'Delivery Completed! ✅',
          description: 'Your order has been delivered successfully.',
        });
      }
    };

    // Listen for driver location updates
    const onDriverLocationUpdate = (locationData: any) => {
      console.log('📍 Driver location update received:', locationData);
      if (locationData.bookingId && locationData.location) {
        setDriverLocations(prev => ({
          ...prev,
          [locationData.bookingId]: locationData.location
        }));
      }
    };

    socket.on('pickup_otp_generated', onOtpGenerated);
    socket.on('booking_confirmed', onBookingConfirmed);
    socket.on('delivery_completed', onDeliveryCompleted);
    socket.on('driver_location_update', onDriverLocationUpdate);

    return () => {
      socket.off('pickup_otp_generated', onOtpGenerated);
      socket.off('booking_confirmed', onBookingConfirmed);
      socket.off('delivery_completed', onDeliveryCompleted);
      socket.off('driver_location_update', onDriverLocationUpdate);
    };
  }, [socket, user, toast]);

  // Close suggestion dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#pickup-address') && !target.closest('.pickup-suggestions')) {
        setShowPickupSuggestions(false);
      }
      if (!target.closest('#drop-address') && !target.closest('.drop-suggestions')) {
        setShowDropSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Socket listeners: booking status + live location + OTP + vehicle updates
  useEffect(() => {
    if (!socket) return;

    const onVehicleAdded = (vehicle: any) => {
      console.log('🚗 Vehicle added via Socket.IO:', vehicle);
      // Refresh vehicle list when a new vehicle is added
      fetchData();
    };

    const onVehicleUpdated = (vehicle: any) => {
      console.log('🔄 Vehicle updated via Socket.IO:', vehicle);
      // Refresh vehicle list when a vehicle is updated
      fetchData();
    };

    const onBookingCreated = (bookingData: any) => {
      console.log('📦 Booking created via Socket.IO:', bookingData);
      // Refresh bookings list when a new booking is created
      fetchData();
    };

    const onBookingStatusUpdated = (bookingData: any) => {
      console.log('🔄 Booking status updated via Socket.IO:', bookingData);
      // Refresh bookings list when booking status changes
      fetchData();
    };

    socket.on('vehicle_added', onVehicleAdded);
    socket.on('vehicle_updated', onVehicleUpdated);
    socket.on('booking_created', onBookingCreated);
    socket.on('booking_status_updated', onBookingStatusUpdated);

    return () => {
      socket.off('vehicle_added', onVehicleAdded);
      socket.off('vehicle_updated', onVehicleUpdated);
      socket.off('booking_created', onBookingCreated);
      socket.off('booking_status_updated', onBookingStatusUpdated);
    };
  }, [socket]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      console.log('🔄 CustomerDashboard: Initial fetchData call');
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch vehicles with their assigned drivers from MongoDB backend
      try {
        const vehiclesData = await apiGet<any[]>('/api/vehicles/active');
        console.log('MongoDB vehicles fetched:', vehiclesData?.length || 0, 'vehicles');

        // Ensure vehicles have proper structure
        const vehiclesWithDrivers = (vehiclesData || []).map(vehicle => ({
          ...vehicle,
          id: vehicle._id?.toString() || vehicle.id,
          vehicleName: vehicle.vehicleName || `${vehicle.type} ${vehicle.number}`,
          driverName: vehicle.driverName || 'No driver assigned'
        }));

        setActiveVehicles(vehiclesWithDrivers);
      } catch (vehicleError) {
        console.error('Error fetching vehicles from MongoDB:', vehicleError);
        setActiveVehicles([]);
      }

      // Fetch customer's bookings from MongoDB backend
      try {
        const bookingsData = await apiGet<any[]>(`/api/bookings/customer/${user.id}`);
        setBookings(bookingsData || []);

        // Extract OTPs from bookings and store them
        const otps: Record<string, string> = {};
        (bookingsData || []).forEach((booking: any) => {
          if (booking.pickupOTP && booking._id) {
            otps[booking._id] = booking.pickupOTP;
          }
        });
        setBookingOTPs(otps);

        // Fetch feedback for delivered bookings
        const feedbacks: Record<string, any> = {};
        const deliveredBookings = (bookingsData || []).filter((b: any) => b.status === 'Delivered');
        
        for (const booking of deliveredBookings) {
          try {
            const feedback = await apiGet(`/api/feedback/booking/${booking._id}`);
            if (feedback) {
              feedbacks[booking._id] = feedback;
            }
          } catch (err) {
            // No feedback yet for this booking
          }
        }
        setBookingFeedbacks(feedbacks);
      } catch (bookingError) {
        console.error('Error fetching bookings:', bookingError);
        setBookings([]);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (selectingLocation === 'pickup') {
      setPickupLocation({ lat, lng });
      setSelectingLocation(null);
      toast({
        title: 'Pickup location set',
        description: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    } else if (selectingLocation === 'drop') {
      setDropLocation({ lat, lng });
      setSelectingLocation(null);
      toast({
        title: 'Drop location set',
        description: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedVehicle || !pickupLocation || !dropLocation || !user) {
      toast({
        title: 'Missing information',
        description: 'Please select a vehicle and both locations',
        variant: 'destructive',
      });
      return;
    }

    try {
      const distance = calculateDistance(
        pickupLocation.lat,
        pickupLocation.lng,
        dropLocation.lat,
        dropLocation.lng
      );

      // TODO: Create booking via MongoDB API
      // await apiPost('/api/bookings', {
      //   customer_id: user.id,
      //   vehicle_id: selectedVehicle.id,
      //   pickup_location: { ...pickupLocation, address: pickupAddress },
      //   drop_location: { ...dropLocation, address: dropAddress },
      //   distance,
      //   status: 'PENDING',
      // });
      
      toast({
        title: 'Feature coming soon',
        description: 'Booking creation will be available soon.',
      });
      return;

      toast({
        title: 'Booking created',
        description: 'Your delivery request has been submitted.',
      });

      // Reset form
      setSelectedVehicle(null);
      setPickupLocation(null);
      setDropLocation(null);
      setPickupAddress('');
      setDropAddress('');
      
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error creating booking',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-muted text-muted-foreground',
      ACCEPTED: 'bg-primary text-primary-foreground',
      ON_ROUTE: 'bg-warning text-warning-foreground',
      COMPLETED: 'bg-success text-success-foreground',
      CANCELLED: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-muted';
  };

  const getMapMarkers = () => {
    const markers: any[] = [];
    
    if (pickupLocation) {
      markers.push({
        position: [pickupLocation.lat, pickupLocation.lng] as [number, number],
        popup: `Pickup: ${pickupAddress || 'Selected location'}`,
        icon: 'pickup',
      });
    }
    
    if (dropLocation) {
      markers.push({
        position: [dropLocation.lat, dropLocation.lng] as [number, number],
        popup: `Drop: ${dropAddress || 'Selected location'}`,
        icon: 'drop',
      });
    }
    
    return markers;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <Truck className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Feedback functions
  const handleSubmitFeedback = async (bookingId: string, booking: any) => {
    const rating = feedbackRating[bookingId];
    const comment = feedbackComment[bookingId] || '';

    if (!rating) {
      toast({
        title: 'Rating Required',
        description: 'Please select a star rating before submitting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmittingFeedback(prev => ({ ...prev, [bookingId]: true }));

      const feedbackResponse = await apiPost<{ success: boolean; feedback: any }>(
        '/api/feedback',
        {
        bookingId,
        customerId: user?.id,
        customerName: user?.name,
        driverId: booking.driverId,
        driverName: booking.driverName,
        rating,
        comment,
      }
      );

      setBookingFeedbacks(prev => ({ ...prev, [bookingId]: feedbackResponse.feedback }));
      setEditingFeedback(prev => ({ ...prev, [bookingId]: false }));

      toast({
        title: 'Feedback Submitted! ⭐',
        description: 'Thank you for your feedback!',
      });
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmittingFeedback(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleUpdateFeedback = async (bookingId: string) => {
    const rating = feedbackRating[bookingId];
    const comment = feedbackComment[bookingId] || '';

    if (!rating) {
      toast({
        title: 'Rating Required',
        description: 'Please select a star rating.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmittingFeedback(prev => ({ ...prev, [bookingId]: true }));

      const feedbackResponse = await apiPut<{ success: boolean; feedback: any }>(
        `/api/feedback/${bookingId}`,
        {
        rating,
        comment,
      }
      );

      setBookingFeedbacks(prev => ({ ...prev, [bookingId]: feedbackResponse.feedback }));
      setEditingFeedback(prev => ({ ...prev, [bookingId]: false }));

      toast({
        title: 'Feedback Updated! ⭐',
        description: 'Your feedback has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmittingFeedback(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleEditFeedback = (bookingId: string, existingFeedback: any) => {
    setFeedbackRating(prev => ({ ...prev, [bookingId]: existingFeedback.rating }));
    setFeedbackComment(prev => ({ ...prev, [bookingId]: existingFeedback.comment }));
    setEditingFeedback(prev => ({ ...prev, [bookingId]: true }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Customer Dashboard</h1>
          <p className="text-muted-foreground">Book deliveries and track your orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Available Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeVehicles.length}</div>
              <p className="text-sm text-muted-foreground">Active drivers ready</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bookings.filter((b) => ['ACCEPTED', 'ON_ROUTE'].includes(b.status)).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="book" className="space-y-4">
          <TabsList>
            <TabsTrigger value="book">Book Delivery</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Requests {bookings.filter((b: any) => b.status === 'Requested').length > 0 && 
                <Badge className="ml-2 bg-yellow-500">{bookings.filter((b: any) => b.status === 'Requested').length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Vehicles (Live)</CardTitle>
                <CardDescription>Fetched from backend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeVehicles.map((veh: any) => {
                    // Check if customer has an active booking with this vehicle
                    const hasActiveBooking = bookings.some((b: any) =>
                      b.vehicleId === veh._id &&
                      ['Booked', 'Reached Pickup', 'Order Picked Up', 'In Transit'].includes(b.status)
                    );

                    return (
                      <div key={veh._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <div>
                              <p className="font-semibold">{veh.vehicleName || veh.number}</p>
                              <p className="text-sm text-muted-foreground">
                                {veh.type} • {veh.capacity} tons
                                {veh.driverName && ` • Driver: ${veh.driverName}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Status: {veh.active ? '🟢 Active' : '🔴 Inactive'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={requestedVehicleIds[veh._id] || hasActiveBooking}
                          onClick={() => handleBookNow(veh)}
                        >
                          {requestedVehicleIds[veh._id] ? 'Requested' : hasActiveBooking ? 'Booked' : 'Book Now'}
                        </Button>
                      </div>
                    );
                  })}
                  {activeVehicles.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No active vehicles from backend</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Vehicle</CardTitle>
                  <CardDescription>Choose from available drivers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedVehicle?.id === vehicle.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{vehicle.number}</p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.type} • {vehicle.capacity} tons
                            </p>
                            {vehicle.driver && (
                              <p className="text-sm text-success">
                                Driver: {vehicle.driver.name}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-success">Available</Badge>
                        </div>
                      </div>
                    ))}

                    {vehicles.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No vehicles available at the moment
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Details</CardTitle>
                  <CardDescription>Set pickup and drop locations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter address"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                      />
                      <Button
                        variant={selectingLocation === 'pickup' ? 'default' : 'outline'}
                        onClick={() => setSelectingLocation('pickup')}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    {pickupLocation && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Drop Location</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter address"
                        value={dropAddress}
                        onChange={(e) => setDropAddress(e.target.value)}
                      />
                      <Button
                        variant={selectingLocation === 'drop' ? 'default' : 'outline'}
                        onClick={() => setSelectingLocation('drop')}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                    {dropLocation && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {dropLocation.lat.toFixed(4)}, {dropLocation.lng.toFixed(4)}
                      </p>
                    )}
                  </div>

                  {pickupLocation && dropLocation && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Distance: {calculateDistance(
                          pickupLocation.lat,
                          pickupLocation.lng,
                          dropLocation.lat,
                          dropLocation.lng
                        ).toFixed(2)} km
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleCreateBooking}
                    disabled={!selectedVehicle || !pickupLocation || !dropLocation}
                  >
                    Create Booking
                  </Button>
                </CardContent>
              </Card>
            </div> */}

            <Card>
              <CardHeader>
                <CardTitle>Select Locations on Map</CardTitle>
                <CardDescription>
                  {selectingLocation === 'pickup'
                    ? 'Click on the map to set pickup location'
                    : selectingLocation === 'drop'
                    ? 'Click on the map to set drop location'
                    : 'Click the map pin buttons above to select locations'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MapView
                  center={[51.505, -0.09]}
                  zoom={13}
                  markers={getMapMarkers()}
                  onMapClick={handleMapClick}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>Waiting for admin approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings
                    .filter((booking: any) => booking.status === 'Requested')
                    .map((booking: any) => {
                      const bookingId = booking._id || booking.id;
                      return (
                        <Card key={bookingId} className="border-yellow-500">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <Package className="h-5 w-5" />
                                  Request #{bookingId?.slice(0, 8)}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {new Date(booking.created_at || booking.createdAt).toLocaleString()}
                                </CardDescription>
                              </div>
                              <Badge className="bg-yellow-500">Pending Admin Approval</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-blue-500 mt-1" />
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                                    <p className="text-sm">{booking.pickupLocation?.address || booking.customerAddress || 'Not specified'}</p>
                                  </div>
                                </div>
                                {booking.destinationLocation && (
                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-red-500 mt-1" />
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Destination</p>
                                      <p className="text-sm">{booking.destinationLocation.address}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                {booking.distance && (
                                  <div className="flex items-center gap-2">
                                    <Route className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Distance</p>
                                      <p className="text-sm font-semibold">{booking.distance.toFixed(2)} km</p>
                                    </div>
                                  </div>
                                )}
                                {booking.price && (
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Price</p>
                                      <p className="text-sm font-semibold">₹{booking.price.toFixed(2)}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-sm text-yellow-800">
                                ⏳ Your request is waiting for admin approval. You'll be notified once a driver is assigned.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  
                  {bookings.filter((b: any) => b.status === 'Requested').length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-muted-foreground">No pending requests</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        All your requests have been processed
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            {bookings
              .filter((booking: any) => booking.status !== 'Requested') // Only show confirmed bookings, not requests
              .map((booking: any) => {
              const bookingId = booking._id || booking.id;
              const driverLocation = driverLocations[bookingId];
              const otp = bookingOTPs[bookingId];
              const isActive = ['Booked', 'Reached Pickup', 'Order Picked Up', 'In Transit'].includes(booking.status);
              
              return (
                <Card key={bookingId} className={isActive ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Package className="h-5 w-5" />
                          Booking #{bookingId?.slice(0, 8)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(booking.created_at || booking.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusBadge(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Trip Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-blue-500 mt-1" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                            <p className="text-sm">{booking.pickupLocation?.address || booking.customerAddress || 'Not specified'}</p>
                          </div>
                        </div>
                        {booking.destinationLocation && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500 mt-1" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Destination</p>
                              <p className="text-sm">{booking.destinationLocation.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {booking.distance && (
                          <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Distance</p>
                              <p className="text-sm font-semibold">{booking.distance.toFixed(2)} km</p>
                            </div>
                          </div>
                        )}
                        {booking.price && (
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Price</p>
                              <p className="text-sm font-semibold">₹{booking.price.toFixed(2)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OTP Display */}
                    {otp ? (
                      <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium">Pickup OTP</p>
                              <p className="text-xs text-muted-foreground">Share this with the driver</p>
                            </div>
                          </div>
                          <div className="text-3xl font-bold tracking-widest text-primary">
                            {otp}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendOtp(bookingId)}
                            disabled={!!resendingOtp[bookingId]}
                          >
                            {resendingOtp[bookingId] ? 'Resending...' : (
                              <span className="flex items-center gap-2">
                                <RefreshCcw className="h-4 w-4" />
                                Resend OTP
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : booking.status === 'Booked' ? (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">OTP Generating...</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">
                              OTP will appear here shortly. Refresh if not visible.
                            </p>
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendOtp(bookingId)}
                                disabled={!!resendingOtp[bookingId]}
                              >
                                {resendingOtp[bookingId] ? 'Resending...' : (
                                  <span className="flex items-center gap-2">
                                    <RefreshCcw className="h-4 w-4" />
                                    Resend OTP
                                  </span>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Full Route Map: Pickup → Destination (for all active bookings) */}
                    {isActive && booking.pickupLocation && booking.destinationLocation && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Route className="h-4 w-4 text-primary" />
                          Complete Route: Pickup → Destination
                        </Label>
                        <RouteMap
                          start={booking.pickupLocation}
                          end={booking.destinationLocation}
                          startLabel="Pickup Location"
                          endLabel="Destination"
                          driverLocation={driverLocation || undefined}
                          className="h-[350px] w-full rounded-lg border-2 border-primary/20"
                        />
                        {driverLocation && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            Green marker shows driver's current location on the route
                          </p>
                        )}
                      </div>
                    )}

                    {/* Live Tracking Map: Driver → Next Stop */}
                    {isActive && booking.pickupLocation && driverLocation && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                          <Label className="text-sm font-medium">
                            {booking.status === 'Booked' || booking.status === 'Reached Pickup'
                              ? 'Driver is on the way to pickup location'
                              : 'Driver is heading to destination'}
                          </Label>
                        </div>
                        <RouteMap
                          start={driverLocation}
                          end={
                            booking.status === 'Booked' || booking.status === 'Reached Pickup'
                              ? booking.pickupLocation
                              : booking.destinationLocation
                          }
                          startLabel="Driver Location"
                          endLabel={
                            booking.status === 'Booked' || booking.status === 'Reached Pickup'
                              ? 'Pickup Location'
                              : 'Destination'
                          }
                          driverLocation={driverLocation}
                          className="h-[300px] w-full rounded-lg"
                        />
                      </div>
                    )}

                    {/* Status Messages */}
                    {booking.status === 'Requested' && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Waiting for driver confirmation...
                        </p>
                      </div>
                    )}
                    
                    {booking.status === 'Order Picked Up' && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Order picked up! Driver is heading to destination.
                        </p>
                      </div>
                    )}
                    
                    {booking.status === 'Delivered' && (
                      <>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Delivery completed successfully!
                          </p>
                        </div>

                        {/* Feedback Section */}
                        {bookingFeedbacks[bookingId] && !editingFeedback[bookingId] ? (
                          // Show existing feedback with edit button
                          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                            <CardHeader>
                              <CardTitle className="text-sm flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  Your Feedback
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditFeedback(bookingId, bookingFeedbacks[bookingId])}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex items-center gap-2">
                                <StarRating rating={bookingFeedbacks[bookingId].rating} readonly size="sm" />
                                <span className="text-sm text-muted-foreground">
                                  ({bookingFeedbacks[bookingId].rating}/5)
                                </span>
                              </div>
                              {bookingFeedbacks[bookingId].comment && (
                                <p className="text-sm text-muted-foreground">
                                  "{bookingFeedbacks[bookingId].comment}"
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Submitted on {new Date(bookingFeedbacks[bookingId].createdAt).toLocaleDateString()}
                                {bookingFeedbacks[bookingId].isEdited && ' (edited)'}
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          // Show feedback form (new or editing)
                          <Card className="bg-primary/5 border-primary/20">
                            <CardHeader>
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Star className="h-4 w-4 text-primary" />
                                {bookingFeedbacks[bookingId] ? 'Edit Your Feedback' : 'Rate Your Experience'}
                              </CardTitle>
                              <CardDescription>
                                {bookingFeedbacks[bookingId] 
                                  ? 'Update your rating and feedback'
                                  : 'Help us improve by sharing your feedback'}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Rating *</Label>
                                <StarRating
                                  rating={feedbackRating[bookingId] || 0}
                                  onRatingChange={(rating) => 
                                    setFeedbackRating(prev => ({ ...prev, [bookingId]: rating }))
                                  }
                                  size="lg"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`feedback-${bookingId}`}>
                                  Comments (Optional)
                                </Label>
                                <Textarea
                                  id={`feedback-${bookingId}`}
                                  placeholder="Share your experience with the driver and service..."
                                  value={feedbackComment[bookingId] || ''}
                                  onChange={(e) => 
                                    setFeedbackComment(prev => ({ ...prev, [bookingId]: e.target.value }))
                                  }
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                {bookingFeedbacks[bookingId] && (
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingFeedback(prev => ({ ...prev, [bookingId]: false }))}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                )}
                                <Button
                                  onClick={() => 
                                    bookingFeedbacks[bookingId]
                                      ? handleUpdateFeedback(bookingId)
                                      : handleSubmitFeedback(bookingId, booking)
                                  }
                                  disabled={submittingFeedback[bookingId] || !feedbackRating[bookingId]}
                                  className="flex-1"
                                >
                                  {submittingFeedback[bookingId] 
                                    ? 'Submitting...' 
                                    : bookingFeedbacks[bookingId] 
                                      ? 'Update Feedback' 
                                      : 'Submit Feedback'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {bookings.filter((b: any) => b.status !== 'Requested').length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No confirmed bookings yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your bookings will appear here once admin confirms your request
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Book {selectedVehicleForBooking?.vehicleName} ({selectedVehicleForBooking?.number})
            </DialogTitle>
            <DialogDescription>
              Enter pickup and drop locations to calculate distance and price
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Vehicle Info */}
            {selectedVehicleForBooking && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Vehicle Details:</p>
                <div className="text-sm text-muted-foreground mt-1">
                  <p><span className="font-medium">Type:</span> {selectedVehicleForBooking.vehicleName}</p>
                  <p><span className="font-medium">Number:</span> {selectedVehicleForBooking.number}</p>
                  <p><span className="font-medium">Driver:</span> {selectedVehicleForBooking.driverName || 'Assigned Driver'}</p>
                </div>
              </div>
            )}

            {/* Pickup Location */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="pickup-address">Pickup Address</Label>
                {userLocation && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      setDialogPickupLocation(userLocation);
                      setDialogPickupAddress('Current Location');
                      toast({ title: 'Using current location', description: 'Pickup set to your location' });
                    }}
                  >
                    Use Current Location
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="pickup-address"
                    placeholder="Type area name (e.g., Connaught Place, Delhi)"
                    value={dialogPickupAddress}
                    onChange={(e) => {
                      setDialogPickupAddress(e.target.value);
                      searchAddress(e.target.value, 'pickup');
                    }}
                    onFocus={() => {
                      if (pickupSuggestions.length > 0) {
                        setShowPickupSuggestions(true);
                      }
                    }}
                  />
                  {showPickupSuggestions && pickupSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto pickup-suggestions">
                      {pickupSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                          onClick={() => handleSuggestionSelect(suggestion, 'pickup')}
                        >
                          <p className="text-sm font-medium">{suggestion.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.type} • {suggestion.addresstype}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant={dialogSelectingLocation === 'pickup' ? 'default' : 'outline'}
                  onClick={() => setDialogSelectingLocation('pickup')}
                  className="shrink-0"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {dialogPickupLocation && (
                <p className="text-xs text-muted-foreground">
                  Selected: {dialogPickupLocation.lat.toFixed(4)}, {dialogPickupLocation.lng.toFixed(4)}
                </p>
              )}
            </div>

            {/* Drop Location */}
            <div className="space-y-2 relative">
              <Label htmlFor="drop-address">Drop Address</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="drop-address"
                    placeholder="Type area name (e.g., India Gate, Delhi)"
                    value={dialogDropAddress}
                    onChange={(e) => {
                      setDialogDropAddress(e.target.value);
                      searchAddress(e.target.value, 'drop');
                    }}
                    onFocus={() => {
                      if (dropSuggestions.length > 0) {
                        setShowDropSuggestions(true);
                      }
                    }}
                  />
                  {showDropSuggestions && dropSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto drop-suggestions">
                      {dropSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                          onClick={() => handleSuggestionSelect(suggestion, 'drop')}
                        >
                          <p className="text-sm font-medium">{suggestion.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.type} • {suggestion.addresstype}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant={dialogSelectingLocation === 'drop' ? 'default' : 'outline'}
                  onClick={() => setDialogSelectingLocation('drop')}
                  className="shrink-0"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {dialogDropLocation && (
                <p className="text-xs text-muted-foreground">
                  Selected: {dialogDropLocation.lat.toFixed(4)}, {dialogDropLocation.lng.toFixed(4)}
                </p>
              )}
            </div>

            {/* Map */}
            <div className="space-y-2">
              <Label>
                {dialogSelectingLocation === 'pickup'
                  ? 'Click on the map to set pickup location'
                  : dialogSelectingLocation === 'drop'
                  ? 'Click on the map to set drop location'
                  : 'Click the map pin buttons above to select locations'}
              </Label>
              <MapView
                center={userLocation ? [userLocation.lat, userLocation.lng] : [28.6139, 77.2090]}
                zoom={13}
                markers={[
                  ...(userLocation
                    ? [{
                        position: [userLocation.lat, userLocation.lng] as [number, number],
                        popup: 'Your Location',
                        icon: 'active' as const,
                      }]
                    : []),
                  ...(dialogPickupLocation
                    ? [{
                        position: [dialogPickupLocation.lat, dialogPickupLocation.lng] as [number, number],
                        popup: `Pickup: ${dialogPickupAddress || 'Selected location'}`,
                        icon: 'pickup' as const,
                      }]
                    : []),
                  ...(dialogDropLocation
                    ? [{
                        position: [dialogDropLocation.lat, dialogDropLocation.lng] as [number, number],
                        popup: `Drop: ${dialogDropAddress || 'Selected location'}`,
                        icon: 'drop' as const,
                      }]
                    : []),
                ]}
                onMapClick={handleDialogMapClick}
                className="h-[300px] w-full rounded-lg"
              />
            </div>

            {/* Distance and Price Display */}
            {dialogPickupLocation && dialogDropLocation && (
              <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">Distance:</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {calculateDistance(
                      dialogPickupLocation.lat,
                      dialogPickupLocation.lng,
                      dialogDropLocation.lat,
                      dialogDropLocation.lng
                    ).toFixed(2)} km
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">Estimated Price:</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    ₹{(calculateDistance(
                      dialogPickupLocation.lat,
                      dialogPickupLocation.lng,
                      dialogDropLocation.lat,
                      dialogDropLocation.lng
                    ) * 10).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Rate: ₹10 per kilometer
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBookingDialogOpen(false);
                setSelectedVehicleForBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={!dialogPickupLocation || !dialogDropLocation || !dialogPickupAddress.trim() || !dialogDropAddress.trim()}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
