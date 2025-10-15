import { useState, useEffect } from 'react';
import { supabase, Vehicle, Booking, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Users, Package, Plus } from 'lucide-react';
import Navbar from '@/components/Navbar';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    number: '',
    type: 'VAN' as 'VAN' | 'TRUCK' | 'LORRY' | 'MOTORCYCLE',
    capacity: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vehiclesRes, driversRes, bookingsRes] = await Promise.all([
        supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'DRIVER'),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      ]);

      if (vehiclesRes.error) throw vehiclesRes.error;
      if (driversRes.error) throw driversRes.error;
      if (bookingsRes.error) throw bookingsRes.error;

      setVehicles(vehiclesRes.data || []);
      setDrivers(driversRes.data || []);
      setBookings((bookingsRes.data || []) as any);
    } catch (error: any) {
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('vehicles').insert({
        number: newVehicle.number,
        type: newVehicle.type,
        capacity: parseFloat(newVehicle.capacity),
      });

      if (error) throw error;

      toast({
        title: 'Vehicle added',
        description: 'New vehicle has been added successfully.',
      });

      setNewVehicle({ number: '', type: 'VAN', capacity: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error adding vehicle',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAssignDriver = async (vehicleId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ assigned_driver: driverId })
        .eq('id', vehicleId);

      if (error) throw error;

      toast({
        title: 'Driver assigned',
        description: 'Driver has been assigned to the vehicle.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error assigning driver',
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {drivers.filter(d => d.is_active).length}
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

        <Tabs defaultValue="vehicles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

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
                        onValueChange={(v) => setNewVehicle({ ...newVehicle, type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VAN">Van</SelectItem>
                          <SelectItem value="TRUCK">Truck</SelectItem>
                          <SelectItem value="LORRY">Lorry</SelectItem>
                          <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
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
                      </div>

                      <div className="flex items-center gap-4">
                        <Select
                          value={vehicle.assigned_driver || undefined}
                          onValueChange={(v) => handleAssignDriver(vehicle.id, v)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Assign driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name}
                              </SelectItem>
                            ))}
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
            <Card>
              <CardHeader>
                <CardTitle>Registered Drivers</CardTitle>
                <CardDescription>View all drivers and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{driver.name}</p>
                        <p className="text-sm text-muted-foreground">{driver.email}</p>
                      </div>
                      <Badge className={driver.is_active ? 'bg-success' : 'bg-muted'}>
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}

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
                <CardDescription>Monitor delivery status and tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">Booking #{booking.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          Distance: {booking.distance ? `${booking.distance.toFixed(2)} km` : 'N/A'}
                        </p>
                      </div>
                      <Badge className={getStatusBadge(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}

                  {bookings.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No bookings available
                    </p>
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

export default AdminDashboard;
