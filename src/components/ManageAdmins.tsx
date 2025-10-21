import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Shield, UserPlus, Trash2, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/MongoAuthContext';

interface Admin {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  created_at: string;
}

export function ManageAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if current user is Super Admin
  const isSuperAdmin = user?.role === 'ADMIN' && user?.isSuperAdmin;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/api/auth/admins');
      setAdmins(response.admins);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch admins',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiPost('/api/auth/create-admin', formData);
      
      toast({
        title: 'Success! ✅',
        description: response.message || 'New admin created successfully',
      });

      // Reset form and refresh list
      setFormData({ name: '', email: '', password: '' });
      setShowAddForm(false);
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create admin',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`Are you sure you want to delete admin "${adminName}"?`)) {
      return;
    }

    try {
      await apiDelete(`/api/auth/admin/${adminId}`);
      
      toast({
        title: 'Success',
        description: 'Admin deleted successfully',
      });

      fetchAdmins();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete admin',
        variant: 'destructive',
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Only Super Admin can manage admins.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Manage Admins
              </CardTitle>
              <CardDescription>
                View and manage all admin accounts. Only Super Admin can add or remove admins.
              </CardDescription>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add New Admin
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Add Admin Form */}
      {showAddForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Add New Admin</CardTitle>
            <CardDescription>Create a new admin account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter admin name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter admin email"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password (min 6 characters)"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Admin'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', email: '', password: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>All Admins ({admins.length})</CardTitle>
          <CardDescription>List of all administrator accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading admins...</p>
          ) : admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No admins found</p>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {admin.isSuperAdmin ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Shield className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{admin.name}</p>
                        {admin.isSuperAdmin && (
                          <Badge className="bg-yellow-500">Super Admin</Badge>
                        )}
                        {admin.id === user?.id && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {!admin.isSuperAdmin && admin.id !== user?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
