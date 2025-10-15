import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, UserCircle, Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-primary rounded-2xl shadow-lg">
              <Truck className="h-16 w-16 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Logistics Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your fleet management with real-time tracking, smart routing, and seamless delivery coordination
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-3">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Admin Control</CardTitle>
              <CardDescription>
                Manage your entire fleet, assign drivers, and monitor all deliveries from a centralized dashboard
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="p-3 bg-success/10 rounded-lg w-fit mb-3">
                <Truck className="h-8 w-8 text-success" />
              </div>
              <CardTitle>Driver Dashboard</CardTitle>
              <CardDescription>
                Toggle availability, accept bookings, and update delivery status with an intuitive interface
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="p-3 bg-accent/10 rounded-lg w-fit mb-3">
                <UserCircle className="h-8 w-8 text-accent" />
              </div>
              <CardTitle>Customer Booking</CardTitle>
              <CardDescription>
                Book deliveries, select pickup and drop locations on a map, and track your orders in real-time
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to transform your logistics?</h2>
            <p className="text-lg mb-6 opacity-90">
              Join our platform and experience seamless fleet management
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary">
                Sign Up Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
