import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiGet, apiPut, setAuthToken, removeAuthToken } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DRIVER' | 'CUSTOMER';
  isSuperAdmin?: boolean;
  approved: boolean;
  is_active: boolean;
  vehicleType?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: string, vehicleType?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('MongoAuthContext: Checking auth...');
    try {
      const token = localStorage.getItem('auth_token');
      console.log('MongoAuthContext: Token exists?', !!token);
      
      if (!token) {
        console.log('MongoAuthContext: No token, user not logged in');
        setLoading(false);
        return;
      }

      // Verify token and get user data
      console.log('MongoAuthContext: Verifying token...');
      const response = await apiGet<{ user: User }>('/api/auth/me');
      console.log('MongoAuthContext: User verified:', response.user);
      setUser(response.user);
    } catch (error) {
      // Token invalid or expired
      console.log('MongoAuthContext: Token verification failed:', error);
      removeAuthToken();
      setUser(null);
    } finally {
      console.log('MongoAuthContext: Auth check complete, loading = false');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiPost<{ token: string; user: User }>('/api/auth/login', {
        email,
        password,
      });

      setAuthToken(response.token);
      setUser(response.user);

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in';
      toast({
        title: 'Sign in failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string, vehicleType?: string) => {
    try {
      const requestBody: any = {
        email,
        password,
        name,
        role,
      };

      // Add vehicleType for drivers only if provided
      if (role === 'DRIVER' && vehicleType && vehicleType.trim() !== '') {
        requestBody.vehicleType = vehicleType;
      }

      const response = await apiPost<{ token: string; user: User }>('/api/auth/signup', requestBody);

      setAuthToken(response.token);
      setUser(response.user);

      toast({
        title: 'Account created!',
        description: 'Welcome to the logistics platform.',
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create account';
      toast({
        title: 'Sign up failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      removeAuthToken();
      setUser(null);

      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const response = await apiPut<{ user: User }>('/api/auth/profile', updates);
      setUser(response.user);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
