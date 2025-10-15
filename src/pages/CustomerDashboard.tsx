import { useState, useEffect } from 'react';
import { supabase, Vehicle, Booking, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, MapPin, Navigation, Package } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MapView from '@/components/MapView';

const CustomerDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<(Vehicle & { driver?: Profile })[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking form state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dropLocation, setDropLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'drop' | null>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
      
      // Subscribe to profile updates for real-time active status
      const profileChannel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profileChannel);
      };
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      // Fetch vehicles with their assigned drivers
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*, driver:profiles!vehicles_assigned_driver_fkey(*)')
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      // Filter for active drivers only
      const activeVehicles = (vehiclesData || [])
        .filter((v: any) => v.driver && v.driver.is_active)
        .map((v: any) => ({
          ...v,
          driver: v.driver,
        }));

      setVehicles(activeVehicles);

      // Fetch customer's bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      setBookings((bookingsData || []) as any);
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
    if (!selectedVehicle || !pickupLocation || !dropLocation || !profile) {
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

      const { error } = await supabase.from('bookings').insert({
        customer_id: profile.id,
        vehicle_id: selectedVehicle.id,
        pickup_location: { ...pickupLocation, address: pickupAddress },
        drop_location: { ...dropLocation, address: dropAddress },
        distance,
        status: 'PENDING',
      });

      if (error) throw error;

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
              <div className="text-2xl font-bold">{vehicles.length}</div>
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
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            </div>

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

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>Track your delivery requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-3 p-4 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold">Booking #{booking.id.slice(0, 8)}</p>
                            <Badge className={getStatusBadge(booking.status)}>
                              {booking.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Distance: {booking.distance ? `${booking.distance.toFixed(2)} km` : 'Calculating...'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {bookings.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No bookings yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Create your first delivery booking to get started
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDashboard;
