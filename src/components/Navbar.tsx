import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-primary text-primary-foreground';
      case 'DRIVER':
        return 'bg-success text-success-foreground';
      case 'CUSTOMER':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <nav className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Logistics Platform</h1>
              <p className="text-xs text-muted-foreground">Fleet Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {profile.name}
                  </p>
                  <Badge className={getRoleBadgeColor(profile.role)} variant="secondary">
                    {profile.role}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
