// OLD SUPABASE AUTH - REPLACED WITH MONGODB
// Use MongoAuthContext from './MongoAuthContext' instead
// This file is kept for backward compatibility only

import { createContext, useContext, ReactNode } from 'react';

// Dummy exports - use MongoAuthContext instead
export const useAuth = () => {
  throw new Error('Use MongoAuthContext instead of AuthContext');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
