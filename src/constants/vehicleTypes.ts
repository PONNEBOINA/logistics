export const VEHICLE_TYPES = [
  'Motorcycle',
  'Scooter', 
  'Electric bike',
  'Bicycle',
  'Auto rickshaw',
  'Electric cargo rickshaw',
  'Maruti Eeco',
  'Mahindra Bolero',
  'Tata Ace',
  'Mahindra Jeeto',
  'Tempo',
  'Ashok Leyland Dost',
  'Tata Winger',
  'Box truck (closed body)',
  'Container truck',
  'Heavy goods vehicle (HGV)',
  'Flatbed truck',
  'Open body truck',
  'Trailer truck',
  'Semi-truck',
  'Lorry',
  'DCM',
  'Auto'
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number];
