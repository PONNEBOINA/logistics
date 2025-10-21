import { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { useAuth } from '@/contexts/MongoAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ManageAdmins } from '@/components/ManageAdmins';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Users, Package, Plus, MapPin, Route, CheckCircle, UserCheck, Check, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { apiGet, apiPatch, apiPut, apiPost } from '@/lib/api';
import { VEHICLE_TYPES, type VehicleType } from '@/constants/vehicleTypes';

interface Vehicle {
  id: string;
  number: string;
  type: VehicleType;
  capacity: number;
  assigned_driver?: string;
  active: boolean;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  is_active: boolean;
  vehicleType?: VehicleType;
  created_at: string;
}

interface Booking {
  id: string;
  status: string;
  distance?: number;
  driverId?: string;
}

// Helper component to display vehicle and driver info for a booking
const VehicleDriverInfo = ({ 
  booking, 
  vehicles, 
  drivers, 
  isDriverAvailable 
}: { 
  booking: any;
  vehicles: Vehicle[];
  drivers: Profile[];
  isDriverAvailable: (driverId: string) => boolean;
}) => {
  const vehicle = vehicles.find(v => v.id === booking.vehicleId);
  const driver = vehicle ? drivers.find(d => d.id === vehicle.assigned_driver) : null;
  
  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-md">
      <p className="text-sm font-medium mb-2">Requested Vehicle & Assigned Driver:</p>
      {vehicle ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{vehicle.type} - {vehicle.number}</span>
            <Badge variant="outline" className="text-xs">Capacity: {vehicle.capacity}t</Badge>
          </div>
          {driver ? (
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm">Driver: <span className="font-medium">{driver.name}</span></span>
              {isDriverAvailable(driver.id) ? (
                <Badge className="bg-green-500 text-xs">Available</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Busy</Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-destructive">⚠️ No driver assigned to this vehicle</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-destructive">⚠️ Vehicle not found</p>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { socket } = useContext(SocketContext);
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    number: '',
    type: '' as VehicleType | '',
    capacity: '',
  });

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching admin data...');

      // Check authentication first
      const token = localStorage.getItem('auth_token');
      console.log('🔐 Auth token exists:', !!token);
      if (!token) {
        console.error('❌ No auth token found!');
        toast({
          title: 'Not authenticated',
          description: 'Please log in again',
          variant: 'destructive',
        });
        return;
      }

      // Fetch users (drivers) from MongoDB API
      try {
        console.log('📡 Fetching users from /api/auth/users...');
        const usersResponse = await apiGet<{ users: any[] }>('/api/auth/users');
        console.log('✅ Users fetched:', usersResponse?.users?.length || 0, 'users');

        const normalizedUsers = (usersResponse.users || []).map((u: any) => ({
          ...u,
          id: u.id || u._id,
        }));

        const allDrivers = normalizedUsers.filter((u: any) => u.role === 'DRIVER');
        console.log('🚛 Drivers found:', allDrivers.length);

        setVehicles([]);
        setDrivers(allDrivers.filter(d => d.approved !== false));
        setPendingDrivers(allDrivers.filter(d => d.approved === false));
      } catch (usersError) {
        console.error('❌ Error fetching users:', usersError);
        setDrivers([]);
        setPendingDrivers([]);
        setVehicles([]);
      }

      // Fetch bookings from MongoDB API
      try {
        console.log('📦 Fetching bookings from /api/bookings...');
        const bookingsData = await apiGet<any[]>('/api/bookings');
        console.log('✅ Bookings fetched:', bookingsData?.length || 0, 'bookings');
        
        // Normalize booking data to have id field
        const normalizedBookings = (bookingsData || []).map((b: any) => ({
          ...b,
          id: b._id?.toString() || b.id,
        }));
        
        setBookings(normalizedBookings);
      } catch (bookingError) {
        console.error('❌ Error fetching bookings from MongoDB:', bookingError);
        setBookings([]);
      }

      // Fetch vehicles from MongoDB API
      try {
        console.log('🚗 Fetching vehicles from /api/vehicles...');
        const vehiclesData = await apiGet<any[]>('/api/vehicles');
        console.log('✅ Vehicles fetched:', vehiclesData?.length || 0, 'vehicles');

        // Normalize vehicle data to have id field like users
        const normalizedVehicles = (vehiclesData || []).map((v: any) => ({
          ...v,
          id: v._id?.toString() || v.id,
        }));

        setVehicles(normalizedVehicles);
      } catch (vehicleError) {
        console.error('❌ Error fetching vehicles from MongoDB:', vehicleError);
        setVehicles([]);
      }

      console.log('✅ Admin data loaded successfully');
    } catch (error: any) {
      console.error('❌ Error in fetchData:', error);
      toast({
        title: 'Error fetching data',
        description: error.message || 'Failed to load admin data',
        variant: 'destructive',
      });
      // Set empty data so page still renders
      setVehicles([]);
      setDrivers([]);
      setPendingDrivers([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket.IO not connected yet');
      return;
    }

    console.log('🔌 Setting up Socket.IO listeners for admin dashboard');

    const onVehicleAdded = (vehicle: any) => {
      console.log('🚗 Vehicle added via Socket.IO:', vehicle);
      fetchData();
    };

    const onVehicleUpdated = (vehicle: any) => {
      console.log('🔄 Vehicle updated via Socket.IO:', vehicle);
      fetchData();
    };

    const onBookingCreated = (booking: any) => {
      console.log('📦 New booking created via Socket.IO:', booking);
      console.log('🎯 This should trigger admin dashboard refresh!');
      fetchData();
    };

    const onBookingStatusUpdated = (bookingData: any) => {
      console.log('🔄 Booking status updated via Socket.IO:', bookingData);
      fetchData();
    };

    const onDriverStatusUpdated = (driverData: any) => {
      console.log('👤 Driver status updated via Socket.IO:', driverData);
      fetchData();
    };

    const onDeliveryCompleted = (deliveryData: any) => {
      console.log('✅ Delivery completed via Socket.IO:', deliveryData);
      // Refresh data to update driver availability
      fetchData();
    };

    socket.on('vehicle_added', onVehicleAdded);
    socket.on('vehicle_updated', onVehicleUpdated);
    socket.on('booking_created', onBookingCreated);
    socket.on('booking_status_updated', onBookingStatusUpdated);
    socket.on('driver_status_updated', onDriverStatusUpdated);
    socket.on('delivery_completed', onDeliveryCompleted);

    console.log('✅ Socket.IO listeners registered');

    return () => {
      console.log('🧹 Cleaning up Socket.IO listeners');
      socket.off('vehicle_added', onVehicleAdded);
      socket.off('vehicle_updated', onVehicleUpdated);
      socket.off('booking_created', onBookingCreated);
      socket.off('booking_status_updated', onBookingStatusUpdated);
      socket.off('driver_status_updated', onDriverStatusUpdated);
      socket.off('delivery_completed', onDeliveryCompleted);
    };
  }, [socket]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log('Attempting to create vehicle with data:', {
        number: newVehicle.number,
        type: newVehicle.type,
        capacity: parseFloat(newVehicle.capacity),
        vehicleName: `${newVehicle.type} ${newVehicle.number}`,
      });

      // Create vehicle via MongoDB API
      const response = await apiPost('/api/vehicles', {
        number: newVehicle.number,
        type: newVehicle.type,
        capacity: parseFloat(newVehicle.capacity),
        vehicleName: `${newVehicle.type} ${newVehicle.number}`,
      });

      console.log('Vehicle creation response:', response);

      toast({
        title: 'Vehicle added',
        description: 'New vehicle has been added successfully.',
      });

      setNewVehicle({ number: '', type: '', capacity: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating vehicle:', error);
      toast({
        title: 'Error adding vehicle',
        description: error.message || 'Failed to add vehicle',
        variant: 'destructive',
      });
    }
  };

  const handleToggleVehicleStatus = async (vehicleId: string, active: boolean) => {
    try {
      // Update vehicle active status via MongoDB API
      const response = await apiPatch(`/api/vehicles/${vehicleId}`, {
        active: active
      });

      toast({
        title: active ? 'Vehicle activated' : 'Vehicle deactivated',
        description: `Vehicle is now ${active ? 'active' : 'inactive'}.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error updating vehicle status',
        description: error.message || 'Failed to update vehicle status',
        variant: 'destructive',
      });
    }
  };

  const handleAssignDriver = async (vehicleId: string, driverId: string) => {
    try {
      // Update vehicle with assigned driver via MongoDB API
      const response = await apiPatch(`/api/vehicles/${vehicleId}`, {
        assigned_driver: driverId
      });

      toast({
        title: 'Driver assigned',
        description: 'Driver has been assigned to the vehicle.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error assigning driver',
        description: error.message || 'Failed to assign driver',
        variant: 'destructive',
      });
    }
  };

  const handleApproveDriver = async (driverId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('=== APPROVE DRIVER DEBUG ===');
      console.log('Driver ID:', driverId);
      console.log('Current user:', user);
      console.log('Auth token exists:', !!token);
      console.log('Token preview:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
      console.log('User role:', user?.role);
      console.log('===========================');

      if (!token) {
        toast({
          title: 'Not authenticated',
          description: 'Please log out and log in again',
          variant: 'destructive',
        });
        return;
      }

      if (user?.role !== 'ADMIN') {
        toast({
          title: 'Unauthorized',
          description: 'Only admins can approve drivers',
          variant: 'destructive',
        });
        return;
      }

      if (!driverId) {
        console.error('Missing driver ID for approval');
        toast({
          title: 'Invalid driver',
          description: 'Driver identifier is missing. Please refresh and try again.',
          variant: 'destructive',
        });
        return;
      }

      // Call MongoDB API to approve driver
      const response = await apiPut(`/api/auth/approve/${driverId}`, {});
      console.log('Approve response:', response);
      
      toast({
        title: 'Driver approved',
        description: 'Driver has been approved and can now be assigned to deliveries.',
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error approving driver:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      toast({
        title: 'Error approving driver',
        description: error.message || 'Failed to approve driver',
        variant: 'destructive',
      });
    }
  };

  const handleRejectDriver = async (driverId: string) => {
    try {
      // TODO: Create delete user endpoint
      // await apiDelete(`/api/auth/users/${driverId}`);
      
      toast({
        title: 'Feature coming soon',
        description: 'Driver rejection will be available soon.',
      });
      return;

      toast({
        title: 'Driver rejected',
        description: 'Driver request has been rejected and removed.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error rejecting driver',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleConfirmBookingRequest = async (bookingId: string) => {
    try {
      console.log('🔵 [ADMIN] Confirming booking:', bookingId);
      
      // Get the booking details
      const booking = bookings.find(b => (b as any)._id === bookingId || b.id === bookingId) as any;
      console.log('🔵 [ADMIN] Found booking:', booking);
      
      if (!booking || !booking.vehicleId) {
        console.error('❌ [ADMIN] Booking has no vehicleId:', booking);
        toast({
          title: 'Error',
          description: 'Booking does not have a vehicle assigned.',
          variant: 'destructive',
        });
        return;
      }

      console.log('🔵 [ADMIN] Looking for vehicle:', booking.vehicleId);
      console.log('🔵 [ADMIN] Available vehicles:', vehicles.map(v => ({ id: v.id, type: v.type, assigned_driver: v.assigned_driver })));
      
      // Find the vehicle and its assigned driver
      const vehicle = vehicles.find(v => v.id === booking.vehicleId);
      console.log('🔵 [ADMIN] Found vehicle:', vehicle);
      
      if (!vehicle) {
        console.error('❌ [ADMIN] Vehicle not found for ID:', booking.vehicleId);
        toast({
          title: 'Error',
          description: 'Vehicle not found.',
          variant: 'destructive',
        });
        return;
      }

      if (!vehicle.assigned_driver) {
        console.error('❌ [ADMIN] Vehicle has no assigned_driver:', vehicle);
        toast({
          title: 'Error',
          description: 'This vehicle does not have a driver assigned.',
          variant: 'destructive',
        });
        return;
      }

      console.log('🔵 [ADMIN] Looking for driver:', vehicle.assigned_driver);
      console.log('🔵 [ADMIN] Available drivers:', drivers.map(d => ({ id: d.id, name: d.name })));
      
      // Find the driver
      const driver = drivers.find(d => d.id === vehicle.assigned_driver);
      console.log('🔵 [ADMIN] Found driver:', driver);
      
      if (!driver) {
        console.error('❌ [ADMIN] Driver not found for ID:', vehicle.assigned_driver);
        toast({
          title: 'Error',
          description: 'Driver not found.',
          variant: 'destructive',
        });
        return;
      }

      // Check if driver is available
      const available = isDriverAvailable(driver.id);
      console.log('🔵 [ADMIN] Driver available:', available);
      
      if (!available) {
        toast({
          title: 'Driver Unavailable',
          description: `${driver.name} is currently busy with another delivery.`,
          variant: 'destructive',
        });
        return;
      }

      console.log('🔵 [ADMIN] Sending PATCH request to assign driver:', {
        bookingId,
        driverId: driver.id,
        driverName: driver.name,
        vehicleName: `${vehicle.type} ${vehicle.number}`,
      });

      // Update booking with driver assignment - set to Pending for driver response
      await apiPatch(`/api/bookings/${bookingId}`, {
        status: 'Pending',
        driverId: driver.id,
        driverName: driver.name,
        vehicleName: `${vehicle.type} ${vehicle.number}`,
        vehicleType: vehicle.type,
      });

      console.log('✅ [ADMIN] Booking confirmed successfully');

      toast({
        title: 'Booking confirmed',
        description: `Booking sent to ${driver.name} with ${vehicle.type} ${vehicle.number}. Waiting for driver response.`,
      });

      fetchData();
    } catch (error: any) {
      console.error('❌ [ADMIN] Error confirming booking:', error);
      toast({
        title: 'Error confirming booking',
        description: error.message || 'Failed to confirm booking',
        variant: 'destructive',
      });
    }
  };

  const handleRejectBookingRequest = async (bookingId: string) => {
    try {
      await apiPatch(`/api/bookings/${bookingId}`, {
        status: 'Denied'
      });

      toast({
        title: 'Booking rejected',
        description: 'Customer booking request has been rejected.',
      });

      // Hide dropdown if it was shown
      setShowDriverDropdown(prev => ({ ...prev, [bookingId]: false }));

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error rejecting booking',
        description: error.message || 'Failed to reject booking',
        variant: 'destructive',
      });
    }
  };


  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      // Supabase statuses
      PENDING: 'bg-muted text-muted-foreground',
      ACCEPTED: 'bg-primary text-primary-foreground',
      ON_ROUTE: 'bg-warning text-warning-foreground',
      COMPLETED: 'bg-success text-success-foreground',
      CANCELLED: 'bg-destructive text-destructive-foreground',
      // MongoDB statuses
      Requested: 'bg-yellow-500 text-white',
      Booked: 'bg-blue-500 text-white',
      'Reached Pickup': 'bg-orange-500 text-white',
      'Order Picked Up': 'bg-purple-500 text-white',
      'In Transit': 'bg-indigo-500 text-white',
      Delivered: 'bg-green-500 text-white',
      Denied: 'bg-red-500 text-white',
    };
    return colors[status] || 'bg-muted';
  };

  // Helper function to check if a driver is available for new assignments
  const isDriverAvailable = (driverId: string) => {
    console.log(`🔍 Checking availability for driver: ${driverId}`);

    // Check if driver is active
    const driver = drivers.find(d => d.id === driverId);
    console.log(`👤 Driver found:`, driver?.name, `is_active:`, driver?.is_active);

    if (!driver || !driver.is_active) {
      console.log(`❌ Driver not active or not found`);
      return false;
    }

    // Check if driver has an active vehicle
    const hasActiveVehicle = vehicles.some(
      v => v.assigned_driver === driverId && v.active
    );
    console.log(`🚗 Has active vehicle:`, hasActiveVehicle);

    if (!hasActiveVehicle) {
      console.log(`❌ Driver has no active vehicle`);
      return false;
    }

    // Check if driver has ongoing deliveries (not completed)
    // A driver has an ongoing delivery if they have any booking with status:
    // Booked, Reached Pickup, Order Picked Up, In Transit
    const hasOngoingDelivery = bookings.some(
      b => (b.driverId === driverId || (b as any).driverId === driverId) &&
           ((b.status as any) === 'Booked' ||
            (b.status as any) === 'Reached Pickup' ||
            (b.status as any) === 'Order Picked Up' ||
            (b.status as any) === 'In Transit')
    );

    console.log(`📦 Has ongoing delivery:`, hasOngoingDelivery);

    const isAvailable = !hasOngoingDelivery;
    console.log(`✅ Driver available:`, isAvailable);

    return isAvailable;
  };

  const getAvailableDrivers = () => {
    return drivers.filter(driver => isDriverAvailable(driver.id));
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage vehicles, drivers, and deliveries</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drivers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <UserCheck className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingDrivers.length}</div>
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

        <Tabs defaultValue="driver-requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="driver-requests">
              Driver Requests {pendingDrivers.length > 0 && <Badge className="ml-2 bg-yellow-500">{pendingDrivers.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="booking-requests">
              Booking Requests {bookings.filter(b => (b.status as any) === 'Requested').length > 0 && 
                <Badge className="ml-2 bg-yellow-500">{bookings.filter(b => (b.status as any) === 'Requested').length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="drivers">Approved Drivers</TabsTrigger>
            <TabsTrigger value="bookings">All Bookings</TabsTrigger>
            <TabsTrigger value="routes">Assign Drivers</TabsTrigger>
            {user?.isSuperAdmin && <TabsTrigger value="manage-admins">Manage Admins</TabsTrigger>}
          </TabsList>

          <TabsContent value="driver-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Driver Requests</CardTitle>
                <CardDescription>Approve or reject driver registration requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingDrivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{driver.name}</p>
                        <p className="text-sm text-muted-foreground">{driver.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Registered: {new Date(driver.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveDriver(driver.id)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectDriver(driver.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}

                  {pendingDrivers.length === 0 && (
                    <div className="text-center py-12">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-muted-foreground">No pending driver requests</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Booking Requests</CardTitle>
                <CardDescription>Review and manage customer delivery requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings
                    .filter(b => (b.status as any) === 'Requested')
                    .map((booking) => {
                      const bookingId = (booking as any)._id || booking.id;

                      return (
                        <div
                          key={bookingId}
                          className="p-4 border rounded-lg space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold">Booking #{bookingId.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground mb-2">
                                Customer: {(booking as any).customerName || 'Unknown'}
                              </p>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-muted-foreground">Pickup</p>
                                    <p>{(booking as any).pickupLocation?.address || (booking as any).customerAddress || 'Not specified'}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-muted-foreground">Drop</p>
                                    <p>{(booking as any).destinationLocation?.address || 'Not specified'}</p>
                                  </div>
                                </div>
                                {booking.distance && (
                                  <p className="text-sm text-muted-foreground">
                                    Distance: {booking.distance.toFixed(2)} km • Price: ₹{((booking as any).price || 0).toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-yellow-500">Requested</Badge>
                          </div>

                          {/* Vehicle & Driver Info */}
                          <VehicleDriverInfo 
                            booking={booking}
                            vehicles={vehicles}
                            drivers={drivers}
                            isDriverAvailable={isDriverAvailable}
                          />

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleConfirmBookingRequest(bookingId)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Confirm Booking
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectBookingRequest(bookingId)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                  {bookings.filter(b => (b.status as any) === 'Requested').length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-muted-foreground">No pending booking requests</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Vehicle</CardTitle>
                <CardDescription>Register a new vehicle in the fleet</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddVehicle} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Vehicle Number</Label>
                      <Input
                        id="number"
                        placeholder="ABC-1234"
                        value={newVehicle.number}
                        onChange={(e) => setNewVehicle({ ...newVehicle, number: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Vehicle Type</Label>
                      <Select
                        value={newVehicle.type}
                        onValueChange={(v) => setNewVehicle({ ...newVehicle, type: v as VehicleType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {VEHICLE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity (tons)</Label>
                      <Input
                        id="capacity"
                        type="number"
                        step="0.01"
                        placeholder="2.5"
                        value={newVehicle.capacity}
                        onChange={(e) => setNewVehicle({ ...newVehicle, capacity: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vehicle Fleet</CardTitle>
                <CardDescription>Manage your vehicles and assign drivers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{vehicle.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.type} • {vehicle.capacity} tons
                        </p>
                        {vehicle.assigned_driver && (
                          <p className="text-sm text-success">
                            Driver: {drivers.find(d => d.id === vehicle.assigned_driver)?.name || 'Unknown'}
                          </p>
                        )}
                        <Badge className={vehicle.active ? 'bg-green-500' : 'bg-red-500'}>
                          {vehicle.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant={vehicle.active ? 'destructive' : 'default'}
                          onClick={() => handleToggleVehicleStatus(vehicle.id, !vehicle.active)}
                        >
                          {vehicle.active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Select
                          value={vehicle.assigned_driver || undefined}
                          onValueChange={(v) => handleAssignDriver(vehicle.id, v)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Assign driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers
                              .filter(driver => {
                                // Only show drivers who can drive this vehicle type
                                return driver.vehicleType === vehicle.type && 
                                       // And are not already assigned to another active vehicle
                                       !vehicles.some(v => v.assigned_driver === driver.id && v.active && v.id !== vehicle.id);
                              })
                              .map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name} - {driver.vehicleType}
                              </SelectItem>
                            ))}
                            {drivers.filter(driver => 
                              driver.vehicleType === vehicle.type && 
                              !vehicles.some(v => v.assigned_driver === driver.id && v.active && v.id !== vehicle.id)
                            ).length === 0 && (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No available drivers for {vehicle.type}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                  {vehicles.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No vehicles registered yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4">
            {/* Available Drivers Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Available Drivers
                  <Badge className="bg-green-500 text-white">{getAvailableDrivers().length}</Badge>
                </CardTitle>
                <CardDescription>Drivers who are active and available for new assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getAvailableDrivers().map((driver) => {
                    const driverVehicle = vehicles.find(
                      v => v.assigned_driver === driver.id && v.active
                    );
                    return (
                      <div
                        key={driver.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-semibold text-green-800">{driver.name}</p>
                            <p className="text-sm text-green-600">{driver.email}</p>
                            <p className="text-xs text-green-600">
                              Vehicle: {driverVehicle?.type} {driverVehicle?.number}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500 text-white">Available</Badge>
                          <Badge className="bg-blue-500 text-white">Ready</Badge>
                        </div>
                      </div>
                    );
                  })}

                  {getAvailableDrivers().length === 0 && (
                    <div className="text-center py-8 p-4 border-2 border-dashed border-muted rounded-lg">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">No drivers available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Drivers need to be active with assigned vehicles and no ongoing deliveries
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* All Approved Drivers Section */}
            <Card>
              <CardHeader>
                <CardTitle>All Approved Drivers</CardTitle>
                <CardDescription>Complete list of all approved drivers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {drivers.map((driver) => {
                    const isAvailable = isDriverAvailable(driver.id);
                    const driverVehicle = vehicles.find(
                      v => v.assigned_driver === driver.id && v.active
                    );

                    return (
                      <div
                        key={driver.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          isAvailable ? 'bg-green-50 border-green-200' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            isAvailable ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <div>
                            <p className={`font-semibold ${isAvailable ? 'text-green-800' : ''}`}>
                              {driver.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{driver.email}</p>
                            {driverVehicle && (
                              <p className="text-xs text-muted-foreground">
                                Vehicle: {driverVehicle.type} {driverVehicle.number}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={driver.is_active ? 'bg-success' : 'bg-muted'}>
                            {driver.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {isAvailable && (
                            <Badge className="bg-green-500 text-white">Available</Badge>
                          )}
                          {!isAvailable && driver.is_active && (
                            <Badge className="bg-yellow-500 text-white">Busy</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {drivers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No drivers registered yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Monitor delivery status and completed bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings
                    .filter(b => {
                      const status = (b.status as any);
                      return status === 'Booked' || status === 'Reached Pickup' || 
                             status === 'Order Picked Up' || status === 'In Transit' || 
                             status === 'Delivered' || status === 'Denied';
                    })
                    .map((booking) => {
                    const bookingId = (booking as any)._id || booking.id;
                    const status = (booking.status as any) || 'PENDING';
                    return (
                      <div
                        key={bookingId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">Booking #{bookingId.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground mb-1">
                            Customer: {(booking as any).customerName || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Distance: {booking.distance ? `${booking.distance.toFixed(2)} km` : 'N/A'} • 
                            Price: ₹{((booking as any).price || 0).toFixed(2)}
                          </p>
                          {(booking as any).driverName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Driver: {(booking as any).driverName} | Vehicle: {(booking as any).vehicleName}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusBadge(status)}>
                          {status.replace('_', ' ')}
                        </Badge>
                      </div>
                    );
                  })}

                  {bookings.filter(b => {
                    const status = (b.status as any);
                    return status === 'Booked' || status === 'Reached Pickup' || 
                           status === 'Order Picked Up' || status === 'In Transit' || 
                           status === 'Delivered' || status === 'Denied';
                  }).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No completed or active bookings
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assign Drivers to Deliveries</CardTitle>
                <CardDescription>Monitor bookings assigned to drivers awaiting response</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings
                    .filter(b => (b.status as any) === 'Pending')
                    .map((booking) => (
                    <div
                      key={(booking as any)._id || booking.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">Booking #{((booking as any)._id || booking.id).slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground mb-2">
                            Customer: {(booking as any).customerName || 'Unknown'}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                              <div>
                                <p className="font-medium text-muted-foreground">Pickup</p>
                                <p>{(booking as any).pickupLocation?.address || (booking as any).customerAddress || 'Not specified'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                              <div>
                                <p className="font-medium text-muted-foreground">Drop</p>
                                <p>{(booking as any).destinationLocation?.address || 'Not specified'}</p>
                              </div>
                            </div>
                            {booking.distance && (
                              <p className="text-sm text-muted-foreground">
                                Distance: {booking.distance.toFixed(2)} km • Price: ₹{((booking as any).price || 0).toFixed(2)}
                              </p>
                            )}
                            {(booking as any).driverName && (booking as any).vehicleName && (
                              <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                                <p className="text-sm font-medium text-blue-800">
                                  Assigned to: {(booking as any).driverName}
                                </p>
                                <p className="text-xs text-blue-600">
                                  Vehicle: {(booking as any).vehicleName}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-yellow-500">Pending Driver Response</Badge>
                      </div>
                    </div>
                  ))}
                  
                  {bookings.filter(b => (b.status as any) === 'Pending').length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-muted-foreground">No bookings awaiting driver response</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Assign drivers to booking requests first
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Admins Tab - Super Admin Only */}
          <TabsContent value="manage-admins" className="space-y-4">
            <ManageAdmins />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
