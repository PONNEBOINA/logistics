import { useState, useEffect } from 'react';
import { supabase, Booking, Vehicle } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Truck, Navigation, CheckCircle, Package } from 'lucide-react';
import Navbar from '@/components/Navbar';

const DriverDashboard = () => {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      const [bookingsRes, vehicleRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('driver_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('vehicles')
          .select('*')
          .eq('assigned_driver', profile.id)
          .single(),
      ]);

      if (bookingsRes.error && bookingsRes.error.code !== 'PGRST116') {
        throw bookingsRes.error;
      }

      setBookings((bookingsRes.data || []) as any);
      setAssignedVehicle(vehicleRes.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      await updateProfile({ is_active: isActive });
      toast({
        title: isActive ? 'Status: Active' : 'Status: Inactive',
        description: isActive
          ? 'You are now available for bookings'
          : 'You are no longer available for bookings',
      });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'ACCEPTED',
          driver_id: profile?.id,
          vehicle_id: assignedVehicle?.id,
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Booking accepted',
        description: 'You have accepted this delivery.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: 'ON_ROUTE' | 'COMPLETED') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Delivery status updated to ${status.replace('_', ' ')}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
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
          <h1 className="text-3xl font-bold mb-2">Driver Dashboard</h1>
          <p className="text-muted-foreground">Manage your deliveries and availability</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Availability Status</span>
                <Switch
                  checked={profile?.is_active || false}
                  onCheckedChange={handleToggleActive}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    profile?.is_active ? 'bg-success animate-pulse' : 'bg-muted'
                  }`}
                />
                <span className="font-medium">
                  {profile?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {profile?.is_active
                  ? 'You are available for new bookings'
                  : 'Toggle on to receive bookings'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Assigned Vehicle</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {assignedVehicle ? (
                <div>
                  <div className="text-2xl font-bold">{assignedVehicle.number}</div>
                  <p className="text-sm text-muted-foreground">
                    {assignedVehicle.type} • {assignedVehicle.capacity} tons
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No vehicle assigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bookings.filter((b) => ['ACCEPTED', 'ON_ROUTE'].includes(b.status)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Deliveries</CardTitle>
            <CardDescription>View and manage your assigned bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-4 p-4 border rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">Booking #{booking.id.slice(0, 8)}</p>
                        <Badge className={getStatusBadge(booking.status)}>
                          {booking.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Distance: {booking.distance ? `${booking.distance.toFixed(2)} km` : 'Calculating...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {booking.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptBooking(booking.id)}
                        disabled={!assignedVehicle}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                    )}

                    {booking.status === 'ACCEPTED' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-warning"
                        onClick={() => handleUpdateStatus(booking.id, 'ON_ROUTE')}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Start Delivery
                      </Button>
                    )}

                    {booking.status === 'ON_ROUTE' && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-success"
                        onClick={() => handleUpdateStatus(booking.id, 'COMPLETED')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {bookings.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No deliveries assigned yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Make sure you're active to receive bookings
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;
