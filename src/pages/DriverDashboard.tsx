import { useState, useEffect, useContext, useCallback } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { useAuth } from '@/contexts/MongoAuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Truck, Package, MapPin, CheckCircle, Navigation, Power, Check, X, Key, Star } from 'lucide-react';
import Navbar from '@/components/Navbar';
import RouteMap from '@/components/RouteMap';
import StarRating from '@/components/StarRating';
import { Input } from '@/components/ui/input';

interface Booking {
  id: string;
  _id?: string;
  status: string;
  distance?: number;
  price?: number;
  customerName?: string;
  pickupLocation?: { lat: number; lng: number; address: string };
  destinationLocation?: { lat: number; lng: number; address: string };
  driverId?: string;
  driverName?: string;
  vehicleName?: string;
  vehicleType?: string;
}

const DriverDashboard = () => {
  const { socket } = useContext(SocketContext);
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [assignedBookings, setAssignedBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(user?.is_active || false);

  // Location tracking state
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  // OTP verification state
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [currentBookingForOtp, setCurrentBookingForOtp] = useState<string | null>(null);
  const [otpGeneratedBookings, setOtpGeneratedBookings] = useState<Set<string>>(new Set()); // Track bookings with OTP generated

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (user) {
      setIsActive(user.is_active);
      fetchBookings();
    }
  }, [user]);

  // Continuous geolocation tracking for active bookings
  useEffect(() => {
    if (!socket || assignedBookings.length === 0) return;

    // Check if there are any active bookings
    const hasActiveBookings = assignedBookings.some(b => 
      ['Booked', 'Reached Pickup', 'Order Picked Up', 'In Transit'].includes(b.status || '')
    );

    if (!hasActiveBookings) return;

    // Get current location
    const updateLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            setCurrentLocation(newLocation);

            // Emit location to all active bookings
            assignedBookings
              .filter(b => ['Booked', 'Reached Pickup', 'Order Picked Up', 'In Transit'].includes(b.status || ''))
              .forEach(booking => {
                const bookingId = booking._id || booking.id;
                socket.emit('driver_location_update', {
                  bookingId,
                  location: newLocation,
                  driverId: user?.id
                });
              });
          },
          (error) => {
            console.error('❌ Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      }
    };

    // Initial location update
    updateLocation();

    // Set up interval for continuous tracking (every 5 seconds)
    const locationInterval = setInterval(updateLocation, 5000);

    return () => {
      clearInterval(locationInterval);
    };
  }, [socket, assignedBookings, user]);

  // Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    const onBookingAssigned = (bookingData: any) => {
      console.log('📦 New booking assigned to driver:', bookingData);
      if (bookingData.driverId === user.id) {
        console.log('🔄 Refreshing bookings due to new assignment');
        fetchBookings(); // Refresh bookings
        toast({
          title: 'New Booking Assigned!',
          description: `You have a new delivery request from ${bookingData.customerName || 'Customer'}`,
        });
      }
    };

    const onDeliveryCompleted = (deliveryData: any) => {
      console.log('✅ Delivery completed event received:', deliveryData);
      if (deliveryData.driverId === user.id) {
        console.log('🔄 Refreshing bookings due to delivery completion');
        fetchBookings(); // Refresh bookings to move to history
        fetchFeedback(); // Refresh feedback in case customer left review
      }
    };

    socket.on('booking_assigned', onBookingAssigned);
    socket.on('delivery_completed', onDeliveryCompleted);

    return () => {
      socket.off('booking_assigned', onBookingAssigned);
      socket.off('delivery_completed', onDeliveryCompleted);
    };
  }, [socket, user, toast]); // Removed fetchBookings and fetchFeedback to prevent infinite loop

  // Location tracking functions
  const startLocationTracking = (bookingId: string) => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support location tracking.',
        variant: 'destructive',
      });
      return;
    }

    setActiveBookingId(bookingId);
    setLocationTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);

        // Send location update to server
        if (socket && bookingId) {
          socket.emit('driver_location_update', {
            bookingId: bookingId,
            location: location,
            driverId: user?.id,
          });
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        toast({
          title: 'Location tracking failed',
          description: 'Unable to track your location. Please check permissions.',
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    // Store watch ID for cleanup
    (window as any).locationWatchId = watchId;
  };

  const stopLocationTracking = () => {
    if ((window as any).locationWatchId) {
      navigator.geolocation.clearWatch((window as any).locationWatchId);
      (window as any).locationWatchId = null;
    }
    setLocationTracking(false);
    setActiveBookingId(null);
    setCurrentLocation(null);
  };

  // Start location tracking when a booking becomes active
  useEffect(() => {
    const activeBooking = assignedBookings.find(b =>
      ['Booked', 'Reached Pickup', 'Order Picked Up', 'In Transit'].includes(b.status || '')
    );

    if (activeBooking && !locationTracking) {
      startLocationTracking(activeBooking._id || activeBooking.id || '');
    } else if (!activeBooking && locationTracking) {
      stopLocationTracking();
    }
  }, [assignedBookings, locationTracking]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []); // Add missing dependencies

  // Separate useEffect for booking status updates
  useEffect(() => {
    if (!socket || !user) return;

    const onBookingStatusUpdated = (bookingData: any) => {
      console.log('🔄 Booking status updated:', bookingData);
      if (bookingData.driverId === user.id || bookingData.customerId) {
        console.log('🔄 Refreshing bookings due to status update');
        fetchBookings();
      }
    };

    socket.on('booking_status_updated', onBookingStatusUpdated);

    return () => {
      socket.off('booking_status_updated', onBookingStatusUpdated);
    };
  }, [socket, user]); // Note: toast is not used in this useEffect so not included

  const fetchBookings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 [DRIVER] Fetching driver bookings for user:', user.id);

      // Fetch all bookings for this driver
      const bookingsData = await apiGet<Booking[]>(`/api/bookings/driver/${user.id}`);
      console.log('✅ [DRIVER] Driver bookings fetched:', bookingsData?.length || 0);
      console.log('📦 [DRIVER] Bookings data:', bookingsData);

      const bookings = bookingsData || [];
      
      // Check for duplicates
      const bookingIds = bookings.map(b => b._id || b.id);
      const uniqueBookingIds = [...new Set(bookingIds)];
      if (bookingIds.length !== uniqueBookingIds.length) {
        console.warn('⚠️ [DRIVER] Duplicate booking IDs found in API response:', bookingIds);
      }
      
      // Separate pending (awaiting driver response) and accepted bookings
      const pending = bookings.filter(b => b.status === 'Pending');
      const assigned = bookings.filter(b => 
        b.status === 'Booked' || b.status === 'Reached Pickup' || 
        b.status === 'Order Picked Up' || b.status === 'In Transit'
      );
      const completed = bookings.filter(b => 
        b.status === 'Delivered' || b.status === 'Completed'
      );

      console.log('🟡 [DRIVER] Pending bookings:', pending.length, pending);
      console.log('🟢 [DRIVER] Assigned bookings:', assigned.length, assigned);
      console.log('✅ [DRIVER] Completed bookings:', completed.length, completed);
      
      // Debug: Log all booking statuses
      console.log('📊 [DRIVER] All booking statuses:', bookings.map(b => ({ id: b._id || b.id, status: b.status, driverId: b.driverId })));

      // Check if any booking appears in both arrays (shouldn't happen)
      const duplicateCheck = pending.filter(p => assigned.some(a => (a._id || a.id) === (p._id || p.id)));
      if (duplicateCheck.length > 0) {
        console.warn('⚠️ [DRIVER] Bookings appearing in both pending and assigned:', duplicateCheck);
      }

      setPendingBookings(pending);
      setAssignedBookings(assigned);
      setCompletedBookings(completed);

      // Auto-populate OTP generated bookings based on "Reached Pickup" status
      const otpBookings = assigned
        .filter(b => b.status === 'Reached Pickup')
        .map(b => b._id || b.id);
      
      if (otpBookings.length > 0) {
        console.log('🔑 [DRIVER] Found bookings with OTP generated:', otpBookings);
        setOtpGeneratedBookings(new Set(otpBookings));
      }
    } catch (error: any) {
      console.error('❌ [DRIVER] Error fetching bookings:', error);
      toast({
        title: 'Error fetching bookings',
        description: error.message || 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchFeedback = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingFeedback(true);
      const response = await apiGet<any>(`/api/feedback/driver/${user.id}`);
      
      setFeedbacks(response.feedbacks || []);
      setAverageRating(response.stats?.averageRating || 0);
      setTotalRatings(response.stats?.totalRatings || 0);

      console.log(`⭐ Driver feedback loaded: ${response.stats?.averageRating}/5 (${response.stats?.totalRatings} ratings)`);
    } catch (error: any) {
      console.error('❌ Error fetching feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  }, [user]);

  // Fetch feedback when component mounts
  useEffect(() => {
    if (user) {
      fetchFeedback();
    }
  }, [user, fetchFeedback]);

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await apiPatch(`/api/bookings/${bookingId}`, {
        status: 'Booked'
      });

      toast({
        title: 'Booking Accepted!',
        description: 'You have accepted the delivery request.',
      });

      fetchBookings(); // Refresh bookings
    } catch (error: any) {
      console.error('❌ Error accepting booking:', error);
      toast({
        title: 'Error accepting booking',
        description: error.message || 'Failed to accept booking',
        variant: 'destructive',
      });
    }
  };

  const handleReachedPickup = async (bookingId: string) => {
    try {
      // Generate OTP for pickup verification (this also updates status to "Reached Pickup")
      const otpResponse = await apiPost(`/api/bookings/${bookingId}/reached-pickup`, {
        driverLocation: currentLocation
      });

      // Track that OTP was generated for this booking
      setOtpGeneratedBookings(prev => new Set(prev).add(bookingId));

      // Show OTP verification UI
      setCurrentBookingForOtp(bookingId);
      setShowOtpVerification(true);
      setOtpInput('');

      toast({
        title: 'OTP Generated!',
        description: `Please ask the customer for the OTP to verify pickup.`,
      });

      fetchBookings(); // Refresh bookings
    } catch (error: any) {
      console.error('❌ Error reaching pickup:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark arrival at pickup',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!currentBookingForOtp || !otpInput.trim()) {
      toast({
        title: 'OTP Required',
        description: 'Please enter the OTP provided by the customer.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setVerifyingOtp(true);

      // Verify OTP with backend
      await apiPost(`/api/bookings/${currentBookingForOtp}/verify-otp`, {
        otp: otpInput.trim()
      });

      toast({
        title: 'Pickup Verified! ✅',
        description: 'OTP verified successfully. Trip started!',
      });

      // Remove from OTP generated bookings (hide reopen button)
      setOtpGeneratedBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentBookingForOtp);
        return newSet;
      });

      // Close OTP verification UI
      setShowOtpVerification(false);
      setOtpInput('');
      setCurrentBookingForOtp(null);

      fetchBookings(); // Refresh bookings to show updated status
    } catch (error: any) {
      console.error('❌ Error verifying OTP:', error);
      toast({
        title: 'Invalid OTP',
        description: error.message || 'The OTP you entered is incorrect or expired.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      await apiPatch(`/api/bookings/${bookingId}`, {
        status: 'Rejected',
        driverId: null,
        driverName: null,
        vehicleId: null,
        vehicleName: null
      });

      toast({
        title: 'Booking Rejected',
        description: 'You have rejected the delivery request.',
      });

      fetchBookings(); // Refresh bookings
    } catch (error: any) {
      toast({
        title: 'Error rejecting booking',
        description: error.message || 'Failed to reject booking',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async () => {
    try {
      const newActiveStatus = !isActive;
      
      await updateProfile({ is_active: newActiveStatus });
      setIsActive(newActiveStatus);
      
      toast({
        title: newActiveStatus ? 'You are now active' : 'You are now inactive',
        description: newActiveStatus 
          ? 'You can now receive delivery requests' 
          : 'You will not receive new delivery requests',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Booked: 'bg-blue-500',
      'Reached Pickup': 'bg-orange-500',
      'Order Picked Up': 'bg-purple-500',
      'In Transit': 'bg-indigo-500',
      Delivered: 'bg-green-500',
    };
    return colors[status] || 'bg-muted';
  };

  const handleMarkPickupCompleted = async (bookingId: string) => {
    try {
      // TODO: Update booking via MongoDB API
      toast({
        title: 'Feature coming soon',
        description: 'Pickup completion will be available soon.',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkDropCompleted = async (bookingId: string) => {
    try {
      // TODO: Update booking via MongoDB API
      toast({
        title: 'Feature coming soon',
        description: 'Drop-off completion will be available soon.',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      await apiPost(`/api/bookings/${bookingId}/mark-delivered`, {});

      toast({
        title: 'Delivery Completed! ✅',
        description: 'The delivery has been marked as completed.',
      });

      fetchBookings(); // Refresh bookings
    } catch (error: any) {
      console.error('❌ Error marking delivery as completed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark delivery as completed',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <Truck className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading deliveries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Driver Dashboard</h1>
          <p className="text-muted-foreground">View and manage your assigned deliveries</p>
        </div>

        {/* Active/Inactive Toggle */}
        <Card className={`mb-6 ${isActive ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-300'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Power className={`h-8 w-8 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <Label htmlFor="active-toggle" className="text-lg font-semibold cursor-pointer">
                    {isActive ? 'You are Active' : 'You are Inactive'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isActive 
                      ? 'You can receive delivery assignments from admin' 
                      : 'Turn on to receive delivery assignments'}
                  </p>
                </div>
              </div>
              <Switch
                id="active-toggle"
                checked={isActive}
                onCheckedChange={handleToggleActive}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedBookings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <MapPin className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBookings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Deliveries</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedBookings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                {averageRating > 0 && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Booking Requests */}
        {pendingBookings.length > 0 && (
          <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-yellow-600" />
                Pending Booking Requests
                <Badge className="bg-yellow-500">{pendingBookings.length}</Badge>
              </CardTitle>
              <CardDescription>Review and accept or reject delivery requests from admin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingBookings.map((booking) => {
                  const bookingId = booking._id || booking.id;
                  return (
                    <div
                      key={bookingId}
                      className="p-4 border-2 border-yellow-500 rounded-lg space-y-3 bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-yellow-600" />
                            <p className="font-semibold">New Delivery Request #{bookingId.slice(0, 8)}</p>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">
                            Customer: {booking.customerName || 'Unknown'}
                          </p>

                          <div className="space-y-2 ml-7">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                                <p className="text-sm">
                                  {booking.pickupLocation?.address || 'Not specified'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Drop</p>
                                <p className="text-sm">
                                  {booking.destinationLocation?.address || 'Not specified'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              {booking.distance && (
                                <span className="text-muted-foreground">
                                  Distance: {booking.distance.toFixed(2)} km
                                </span>
                              )}
                              {booking.price && (
                                <span className="font-medium text-green-600">
                                  Earnings: ₹{booking.price.toFixed(2)}
                                </span>
                              )}
                            </div>

                            {booking.vehicleName && (
                              <div className="flex items-center gap-2 text-sm">
                                <Truck className="h-4 w-4 text-primary" />
                                <span className="text-muted-foreground">
                                  Vehicle: <span className="font-medium">{booking.vehicleName}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Badge className="bg-yellow-500">Pending</Badge>
                      </div>

                      {/* Accept/Reject Buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => handleAcceptBooking(bookingId)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept Delivery
                        </Button>
                        <Button
                          onClick={() => handleRejectBooking(bookingId)}
                          variant="destructive"
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assigned Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Deliveries</CardTitle>
            <CardDescription>Complete pickup and drop-off for each delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedBookings.map((booking) => {
                const bookingId = booking._id || booking.id;
                return (
                  <div
                    key={bookingId}
                    className="p-4 border rounded-lg space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <p className="font-semibold">Delivery #{bookingId.slice(0, 8)}</p>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          Customer: {booking.customerName || 'Unknown'}
                        </p>
                        
                        <div className="space-y-2 ml-7">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                              <p className="text-sm">
                                {booking.pickupLocation?.address || 'Not specified'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Drop</p>
                              <p className="text-sm">
                                {booking.destinationLocation?.address || 'Not specified'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            {booking.distance && (
                              <span className="text-muted-foreground">
                                Distance: {booking.distance.toFixed(2)} km
                              </span>
                            )}
                            {booking.price && (
                              <span className="font-medium text-green-600">
                                Earnings: ₹{booking.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Badge className={getStatusBadge(booking.status)}>
                        {booking.status === 'Booked' ? 'Accepted' : booking.status}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {booking.status === 'Reached Pickup' && otpGeneratedBookings.has(bookingId) && (
                        <Button
                          onClick={() => {
                            setCurrentBookingForOtp(bookingId);
                            setShowOtpVerification(true);
                            setOtpInput('');
                          }}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Reopen OTP Verification
                        </Button>
                      )}
                      
                      {booking.status === 'Booked' && (
                        <>
                          <Button
                            onClick={() => handleReachedPickup(bookingId)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Reached Pickup Location
                          </Button>
                          <Button
                            onClick={() => handleMarkPickupCompleted(bookingId)}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Pickup Completed
                          </Button>
                        </>
                      )}

                      {['Order Picked Up', 'In Transit'].includes(booking.status || '') && (
                        <Button
                          onClick={() => handleMarkCompleted(bookingId)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Delivered
                        </Button>
                      )}

                      {booking.status === 'In Transit' && (
                        <Button
                          onClick={() => handleMarkDropCompleted(bookingId)}
                          className="flex-1"
                          variant="default"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Drop Completed
                        </Button>
                      )}

                      {/* Current Location Display for Active Bookings */}
                      {['Booked', 'Reached Pickup', 'Order Picked Up', 'In Transit'].includes(booking.status || '') && currentLocation && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Navigation className="h-4 w-4" />
                          <span>
                            {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {assignedBookings.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No deliveries assigned yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Accept pending requests or wait for admin to assign deliveries
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Map: Driver → Pickup (After Accept, Before OTP) */}
      {assignedBookings
        .filter(booking => booking.status === 'Booked' && booking.pickupLocation)
        .map(booking => {
          const bookingId = booking._id || booking.id;
          
          return (
            <div key={`route-to-pickup-${bookingId}`} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-blue-500" />
                    Heading to Pickup Location
                  </CardTitle>
                  <CardDescription>
                    Navigate to customer's pickup location
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentLocation ? (
                    <RouteMap
                      start={currentLocation}
                      end={{
                        lat: booking.pickupLocation.lat,
                        lng: booking.pickupLocation.lng
                      }}
                      startLabel="Your Location"
                      endLabel="Pickup Location"
                      driverLocation={currentLocation}
                      className="h-[400px] w-full"
                    />
                  ) : (
                    <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Enable location to see route</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReachedPickup(bookingId)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Reached Pickup Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}

      {/* OTP Verification Modal */}
      {showOtpVerification && currentBookingForOtp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Verify Pickup OTP
              </CardTitle>
              <CardDescription>
                Enter the 6-digit OTP provided by the customer to verify pickup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOtpVerification(false);
                    setOtpInput('');
                    setCurrentBookingForOtp(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpInput.length !== 6}
                  className="flex-1"
                >
                  {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Booking Route Map */}
      {assignedBookings
        .filter(booking => ['Order Picked Up', 'In Transit'].includes(booking.status || ''))
        .map(booking => {
          const bookingId = booking._id || booking.id;
          if (!booking.pickupLocation || !booking.destinationLocation) return null;

          return (
            <div key={`route-${bookingId}`} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    Trip Route: {booking.pickupLocation.address} → {booking.destinationLocation.address}
                  </CardTitle>
                  <CardDescription>
                    Live navigation from pickup to destination
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RouteMap
                    start={{
                      lat: booking.pickupLocation.lat,
                      lng: booking.pickupLocation.lng
                    }}
                    end={{
                      lat: booking.destinationLocation.lat,
                      lng: booking.destinationLocation.lng
                    }}
                    startLabel="Pickup Location"
                    endLabel="Destination"
                    driverLocation={currentLocation || undefined}
                    className="h-[400px] w-full"
                  />
                </CardContent>
              </Card>
            </div>
          );
        })}

      {/* Delivery History Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Delivery History
              </CardTitle>
              <CardDescription>
                {completedBookings.length > 0 
                  ? `You have completed ${completedBookings.length} ${completedBookings.length === 1 ? 'delivery' : 'deliveries'}`
                  : 'No completed deliveries yet'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchBookings();
                toast({
                  title: 'Refreshing...',
                  description: 'Loading latest delivery data',
                });
              }}
              className="flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {completedBookings.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 dark:bg-green-950 border-green-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {completedBookings.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Deliveries
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {completedBookings.reduce((sum, b) => sum + (b.distance || 0), 0).toFixed(1)} km
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Distance
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        ₹{completedBookings.reduce((sum, b) => sum + (b.price || 0), 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Earnings
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Completed Deliveries List */}
              <div className="space-y-3">
                {completedBookings.map((booking) => {
                  const bookingId = booking._id || booking.id;
                  return (
                    <Card key={bookingId} className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <p className="font-medium">Booking #{bookingId.slice(0, 8)}</p>
                              <Badge className="bg-green-500">Delivered</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Customer: {booking.customerName || 'Unknown'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              ₹{booking.price?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.distance?.toFixed(1) || '0'} km
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 text-blue-500 mt-1" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                                <p className="text-sm">
                                  {booking.pickupLocation?.address || 'Not specified'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 text-red-500 mt-1" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Destination</p>
                                <p className="text-sm">
                                  {booking.destinationLocation?.address || 'Not specified'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {booking.vehicleName && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground">
                              Vehicle: <span className="font-medium">{booking.vehicleName}</span>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">No completed deliveries yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your delivery history will appear here once you complete your first delivery
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ratings & Feedback Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Ratings & Feedback
          </CardTitle>
          <CardDescription>
            {totalRatings > 0 
              ? `Your average rating is ${averageRating.toFixed(1)}/5 based on ${totalRatings} customer ${totalRatings === 1 ? 'review' : 'reviews'}`
              : 'No feedback received yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFeedback ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading feedback...</p>
            </div>
          ) : feedbacks.length > 0 ? (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <Card key={feedback._id} className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{feedback.customerName || 'Anonymous Customer'}</p>
                          <Badge variant="outline" className="text-xs">
                            Booking #{feedback.bookingId.slice(0, 8)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={feedback.rating} readonly size="sm" />
                          <span className="text-sm text-muted-foreground">
                            ({feedback.rating}/5)
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </p>
                        {feedback.isEdited && (
                          <p className="text-xs text-muted-foreground italic">
                            (edited)
                          </p>
                        )}
                      </div>
                    </div>
                    {feedback.comment && (
                      <div className="mt-3 p-3 bg-background rounded-md">
                        <p className="text-sm text-muted-foreground italic">
                          "{feedback.comment}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">No feedback received yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete deliveries to start receiving customer ratings and feedback
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDashboard;
