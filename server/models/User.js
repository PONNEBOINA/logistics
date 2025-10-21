import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'DRIVER', 'CUSTOMER'],
    default: 'CUSTOMER'
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  approved: {
    type: Boolean,
    default: function() {
      // Drivers need approval, others are auto-approved
      return this.role !== 'DRIVER';
    }
  },
  is_active: {
    type: Boolean,
    default: false
  },
  vehicleType: {
    type: String,
    enum: [
      'Motorcycle', 'Scooter', 'Electric bike', 'Bicycle', 'Auto rickshaw',
      'Electric cargo rickshaw', 'Maruti Eeco', 'Mahindra Bolero', 'Tata Ace',
      'Mahindra Jeeto', 'Tempo', 'Ashok Leyland Dost', 'Tata Winger',
      'Box truck (closed body)', 'Container truck', 'Heavy goods vehicle (HGV)',
      'Flatbed truck', 'Open body truck', 'Trailer truck', 'Semi-truck',
      'Lorry', 'DCM', 'Auto'
    ],
    required: function() {
      return this.role === 'DRIVER';
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving and update timestamp
userSchema.pre('save', async function(next) {
  // Update timestamp
  this.updated_at = Date.now();
  
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
