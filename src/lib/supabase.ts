import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type UserRole = 'ADMIN' | 'DRIVER' | 'CUSTOMER';
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'ON_ROUTE' | 'COMPLETED' | 'CANCELLED';
export type VehicleType = 'VAN' | 'TRUCK' | 'LORRY' | 'MOTORCYCLE';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  number: string;
  type: VehicleType;
  capacity: number;
  assigned_driver: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  pickup_location: { lat: number; lng: number };
  pickup_address: string | null;
  drop_location: { lat: number; lng: number };
  drop_address: string | null;
  distance: number | null;
  status: BookingStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tracking {
  id: string;
  booking_id: string;
  driver_id: string;
  coordinates: { lat: number; lng: number };
  timestamp: string;
}
