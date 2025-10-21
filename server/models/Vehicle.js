import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const VehicleSchema = new mongoose.Schema(
  {
    driverId: { type: String, index: true },
    driverName: { type: String },
    vehicleName: { type: String, required: true },
    number: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: [
        'Motorcycle', 'Scooter', 'Electric bike', 'Bicycle', 'Auto rickshaw',
        'Electric cargo rickshaw', 'Maruti Eeco', 'Mahindra Bolero', 'Tata Ace',
        'Mahindra Jeeto', 'Tempo', 'Ashok Leyland Dost', 'Tata Winger',
        'Box truck (closed body)', 'Container truck', 'Heavy goods vehicle (HGV)',
        'Flatbed truck', 'Open body truck', 'Trailer truck', 'Semi-truck',
        'Lorry', 'DCM', 'Auto'
      ],
      required: true
    },
    capacity: { type: Number, required: true },
    assigned_driver: { type: String, default: null },
    active: { type: Boolean, default: true, index: true },
    location: { type: LocationSchema, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Vehicle', VehicleSchema);
