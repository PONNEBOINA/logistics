import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    customerName: { type: String },
    customerAddress: { type: String },
    driverId: { type: String, index: true },
    driverName: { type: String },
    vehicleId: { type: String },
    vehicleName: { type: String },
    vehicleType: { type: String },
    status: {
      type: String,
      enum: [
        'Requested',
        'Pending',
        'Booked',
        'Rejected',
        'Denied',
        'Arriving',
        'Reached Pickup',
        'Waiting for Pickup Confirmation',
        'Order Picked Up',
        'In Transit',
        'Delivered',
        'Completed',
        'Cancelled'
      ],
      default: 'Requested',
      index: true,
    },
    pickupLocation: { type: LocationSchema, required: false },
    destinationLocation: { type: LocationSchema, required: false },
    distance: { type: Number }, // Distance in kilometers
    price: { type: Number }, // Price in rupees
    pickupOTP: { type: String }, // OTP for pickup verification
    otpGeneratedAt: { type: Date }, // Timestamp when OTP was generated
    driverLocation: { type: LocationSchema }, // Driver's current location
  },
  { timestamps: true }
);

// Helper method to generate OTP
BookingSchema.methods.generatePickupOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.pickupOTP = otp;
  this.otpGeneratedAt = new Date();
  return otp;
};

// Helper method to verify OTP (valid for 30 minutes)
BookingSchema.methods.verifyPickupOTP = function(enteredOTP) {
  if (!this.pickupOTP || !this.otpGeneratedAt) return false;

  const thirtyMinutes = 30 * 60 * 1000;
  const isExpired = Date.now() - this.otpGeneratedAt.getTime() > thirtyMinutes;

  if (isExpired) return false;

  const storedOtp = this.pickupOTP.toString().trim();
  const providedOtp = (enteredOTP ?? '').toString().trim();

  return storedOtp === providedOtp;
};

export default mongoose.model('Booking', BookingSchema);
