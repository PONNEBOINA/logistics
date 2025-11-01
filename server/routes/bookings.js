import express from 'express';
import Booking from '../models/Booking.js';
import Feedback from '../models/Feedback.js';

const router = express.Router();

// GET /api/bookings/debug/:driverId - Debug endpoint to check all data
router.get('/debug/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const allBookings = await Booking.find({});
    const allFeedbacks = await Feedback.find({});
    const driverBookings = await Booking.find({ driverId });
    const driverFeedbacks = await Feedback.find({ driverId });
    
    res.json({
      driverId,
      totalBookings: allBookings.length,
      totalFeedbacks: allFeedbacks.length,
      driverBookingsCount: driverBookings.length,
      driverFeedbacksCount: driverFeedbacks.length,
      allBookings: allBookings.map(b => ({
        id: b._id,
        driverId: b.driverId,
        driverName: b.driverName,
        status: b.status,
        customerId: b.customerId
      })),
      allFeedbacks: allFeedbacks.map(f => ({
        id: f._id,
        bookingId: f.bookingId,
        driverId: f.driverId,
        driverName: f.driverName,
        rating: f.rating
      })),
      driverBookings,
      driverFeedbacks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/test - Simple test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Bookings API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/bookings - Get all bookings',
      'POST /api/bookings - Create booking',
      'GET /api/bookings/active - Get active bookings',
      'GET /api/bookings/customer/:id - Get customer bookings'
    ]
  });
});

// GET /api/bookings - Get all bookings (for admin dashboard)
router.get('/', async (req, res) => {
  try {
    console.log('📦 Fetching all bookings for admin dashboard');
    const bookings = await Booking.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${bookings.length} bookings`);
    res.json(bookings);
  } catch (err) {
    console.error('❌ Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
  }
});

// POST /api/bookings
router.post('/', async (req, res) => {
  try {
    console.log('📦 Creating booking with data:', req.body);

    // Check if a similar booking already exists (prevent duplicates)
    const existingBooking = await Booking.findOne({
      customerId: req.body.customerId,
      vehicleId: req.body.vehicleId,
      status: 'Requested',
      createdAt: {
        $gte: new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
      }
    });

    if (existingBooking) {
      console.log('⚠️ Similar booking already exists, returning existing:', existingBooking._id);
      return res.status(200).json(existingBooking);
    }

    const booking = await Booking.create(req.body);
    console.log('✅ Booking created successfully:', booking._id);

    // Don't emit to driver yet - wait for admin to assign
    // Driver will be notified when admin approves and assigns via PATCH endpoint

    // Emit booking_created event for real-time admin updates
    if (req.io) {
      console.log('📡 Emitting booking_created event to all clients');
      req.io.emit('booking_created', booking);
    } else {
      console.warn('⚠️ Socket.IO instance not available for booking_created event');
    }

    console.log('🎯 Booking creation completed successfully');
    res.status(201).json(booking);
  } catch (err) {
    console.error('❌ Error creating booking:', err);
    res.status(400).json({ error: 'Failed to create booking', details: err.message });
  }
});

// GET /api/bookings/customer/:id
router.get('/customer/:id', async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.params.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
  }
});

// GET /api/bookings/driver/:id - Get ALL bookings for a driver (including completed)
router.get('/driver/:id', async (req, res) => {
  try {
    const driverId = req.params.id;
    
    console.log(`\n🔍 ========== DRIVER BOOKINGS REQUEST ==========`);
    console.log(`Driver ID: ${driverId}`);
    
    // Try to find bookings by driverId first (ALL statuses)
    let bookings = await Booking.find({ driverId: driverId }).sort({ createdAt: -1 });
    console.log(`📦 Direct query found: ${bookings.length} bookings`);
    
    // If no bookings found, try via feedback collection
    if (bookings.length === 0) {
      console.log(`🔍 Trying fallback via feedback collection...`);
      
      const feedbacks = await Feedback.find({ driverId: driverId });
      console.log(`📝 Found ${feedbacks.length} feedbacks`);
      
      if (feedbacks.length > 0) {
        const bookingIds = feedbacks.map(f => f.bookingId);
        console.log(`🔍 Booking IDs from feedback:`, bookingIds);
        
        bookings = await Booking.find({ _id: { $in: bookingIds } }).sort({ createdAt: -1 });
        console.log(`📦 Fallback query found: ${bookings.length} bookings`);
      }
    }
    
    console.log(`✅ Returning ${bookings.length} bookings to frontend`);
    console.log(`========================================\n`);
    
    console.log(`✅ [DRIVER API] Found ${bookings.length} bookings for driver ${driverId}`);
    
    // Deduplicate bookings by ID to prevent returning the same booking multiple times
    const uniqueBookings = bookings.filter((booking, index, self) => {
      const bookingId = booking._id.toString();
      return index === self.findIndex(b => b._id.toString() === bookingId);
    });
    
    if (uniqueBookings.length !== bookings.length) {
      console.warn(`⚠️ [DRIVER API] Deduplicated ${bookings.length} bookings to ${uniqueBookings.length} unique bookings`);
    }
    
    // Log each unique booking found
    uniqueBookings.forEach((booking, index) => {
      console.log(`📋 [DRIVER API] Booking ${index + 1}: ID=${booking._id}, status=${booking.status}, customer=${booking.customerName}`);
    });
    
    res.json(uniqueBookings);
  } catch (err) {
    console.error(`❌ [DRIVER API] Error:`, err);
    res.status(500).json({ error: 'Failed to fetch driver bookings', details: err.message });
  }
});

// PATCH /api/bookings/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const booking = await Booking.findByIdAndUpdate(id, update, { new: true });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    console.log('Booking updated successfully:', booking);

    // Emit Socket.IO events based on status changes
    if (req.io) {
      // If booking is assigned to driver (status changed to Pending)
      if (update.status === 'Pending' && update.driverId) {
        const room = `driver:${update.driverId}`;
        console.log(`📤 Emitting booking_assigned event to room: ${room}`);
        console.log(`📦 Booking data:`, {
          id: booking._id.toString(),
          customerName: booking.customerName,
          driverId: update.driverId,
          driverName: update.driverName,
          vehicleName: update.vehicleName,
        });
        
        const eventData = {
          id: booking._id.toString(),
          status: 'Pending',
          customerName: booking.customerName,
          driverId: update.driverId,
          driverName: update.driverName,
          vehicleName: update.vehicleName,
          vehicleType: update.vehicleType,
          distance: booking.distance,
          price: booking.price,
          pickupLocation: booking.pickupLocation,
          destinationLocation: booking.destinationLocation,
        };
        
        req.io.to(room).emit('booking_assigned', eventData);
        console.log(`✅ booking_assigned event emitted to ${room}`);
      }

      // If driver accepts booking (status changed to Booked)
      if (update.status === 'Booked') {
        console.log(`📤 Emitting booking_confirmed event`);
        req.io.to(`customer:${booking.customerId}`).emit('booking_confirmed', {
          id: booking._id.toString(),
          status: 'Booked',
          driverName: booking.driverName,
          vehicleName: booking.vehicleName,
          distance: booking.distance,
          price: booking.price,
        });

        // Notify admin dashboard
        req.io.emit('booking_status_updated', {
          id: booking._id.toString(),
          status: 'Booked',
          driverId: booking.driverId,
          driverName: booking.driverName,
        });
      }

      // If driver rejects booking (status changed to Rejected)
      if (update.status === 'Rejected') {
        console.log(`📤 Emitting booking_rejected event`);
        req.io.emit('booking_status_updated', {
          id: booking._id.toString(),
          status: 'Rejected',
          driverId: null,
          driverName: null,
        });
      }
    }

    // Generate OTP when driver confirms booking
    if (update.status === 'Booked' && !booking.pickupOTP) {
      const otp = booking.generatePickupOTP();
      await booking.save();
    }

    // Emit confirmation/denial events to the customer
    if (req.io && update.status) {
      if (update.status === 'Denied') {
        req.io.to(`customer:${booking.customerId}`).emit('booking_denied', { id: booking._id.toString() });
      }
      if (update.status === 'Booked' || update.status === 'Arriving') {
        // Notify customer
        req.io.to(`customer:${booking.customerId}`).emit('booking_confirmed', {
          id: booking._id.toString(),
          driverId: booking.driverId,
          vehicleId: booking.vehicleId,
          pickupLocation: booking.pickupLocation,
          destinationLocation: booking.destinationLocation,
          status: booking.status,
          distance: booking.distance,
          price: booking.price,
          customerName: booking.customerName,
          createdAt: booking.createdAt,
          otp: booking.pickupOTP, // Send OTP to customer
        });

        // Notify driver about new booking assignment
        if (booking.driverId) {
          req.io.to(`driver:${booking.driverId}`).emit('booking_request', {
            id: booking._id.toString(),
            driverId: booking.driverId,
            customerId: booking.customerId,
            customerName: booking.customerName,
            customerAddress: booking.customerAddress,
            vehicleId: booking.vehicleId,
            pickupLocation: booking.pickupLocation,
            destinationLocation: booking.destinationLocation,
            status: booking.status,
            createdAt: booking.createdAt,
            distance: booking.distance,
            price: booking.price,
          });
        }
      }

      // Emit general booking status update for all status changes
      req.io.emit('booking_status_updated', {
        id: booking._id.toString(),
        status: booking.status,
        customerId: booking.customerId,
        driverId: booking.driverId,
        vehicleId: booking.vehicleId,
      });
    }

    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update booking', details: err.message });
  }
});

// PATCH /api/bookings/:id/generate-otp - Generate OTP when driver accepts booking
router.patch('/:id/generate-otp', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Update status to Reached Pickup and generate OTP
    booking.status = 'Reached Pickup';
    const otp = booking.generatePickupOTP();

    await booking.save();

    console.log(`✅ OTP generated for booking ${id}: ${otp}`);

    // Emit OTP to customer
    if (req.io) {
      const otpData = {
        id: booking._id.toString(),
        status: 'Booked',
        otp: otp,
        customerName: booking.customerName,
        driverName: booking.driverName,
        vehicleName: booking.vehicleName,
        distance: booking.distance,
        price: booking.price,
      };

      req.io.to(`customer:${booking.customerId}`).emit('pickup_otp_generated', otpData);
      console.log(`📤 Sent OTP to customer ${booking.customerId}`);
    }

    res.json({
      success: true,
      otp: otp,
      booking: booking,
      message: 'Booking accepted and OTP generated'
    });
  } catch (err) {
    console.error('❌ Error generating OTP:', err);
    res.status(400).json({ error: 'Failed to generate OTP', details: err.message });
  }
});

// POST /api/bookings/:id/reached-pickup - Driver reached pickup location, generate OTP
router.post('/:id/reached-pickup', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverLocation } = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // Generate OTP
    const otp = booking.generatePickupOTP();
    booking.status = 'Reached Pickup';
    booking.driverLocation = driverLocation;
    await booking.save();
    
    // Emit OTP to customer
    if (req.io) {
      req.io.to(`customer:${booking.customerId}`).emit('pickup_otp_generated', {
        id: booking._id.toString(),
        otp: otp,
        status: 'Reached Pickup',
        driverLocation: booking.driverLocation,
      });
      
      // Also notify driver
      req.io.to(`driver:${booking.driverId}`).emit('pickup_reached', {
        id: booking._id.toString(),
        status: 'Reached Pickup',
      });
    }
    
    res.json({ 
      success: true, 
      booking,
      message: 'OTP generated and sent to customer' 
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to generate OTP', details: err.message });
  }
});

// POST /api/bookings/:id/resend-otp - Customer requests a fresh OTP
router.post('/:id/resend-otp', async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const validStatuses = ['Booked', 'Reached Pickup', 'Waiting for Pickup Confirmation'];
    if (!validStatuses.includes(booking.status)) {
      return res.status(400).json({
        error: 'Cannot resend OTP for this booking status',
        details: `Current status: ${booking.status}`,
      });
    }

    const otp = booking.generatePickupOTP();
    await booking.save();

    if (req.io) {
      const otpData = {
        id: booking._id.toString(),
        otp,
        status: booking.status,
        driverLocation: booking.driverLocation,
      };

      req.io.to(`customer:${booking.customerId}`).emit('pickup_otp_generated', otpData);

      if (booking.driverId) {
        req.io.to(`driver:${booking.driverId}`).emit('pickup_otp_generated', otpData);
      }
    }

    res.json({
      success: true,
      otp,
      booking,
      message: 'A new OTP has been generated and shared.',
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to resend OTP', details: err.message });
  }
});

// POST /api/bookings/:id/verify-otp - Verify OTP and start pickup
router.post('/:id/verify-otp', async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // Verify OTP
    const isValid = booking.verifyPickupOTP(otp);
    
    if (!isValid) {
      const isExpired = booking.otpGeneratedAt && 
        (Date.now() - new Date(booking.otpGeneratedAt).getTime() > 30 * 60 * 1000);
      
      return res.status(400).json({ 
        success: false, 
        error: isExpired ? 'OTP has expired. Please generate a new one.' : 'Invalid OTP',
        isExpired
      });
    }
    
    // Update status to Order Picked Up
    booking.status = 'Order Picked Up';
    booking.pickupOTP = null; // Clear OTP after verification
    await booking.save();
    
    // Emit pickup confirmed event
    if (req.io) {
      const pickupData = {
        id: booking._id.toString(),
        status: 'Order Picked Up',
        pickupLocation: booking.pickupLocation,
        destinationLocation: booking.destinationLocation,
        driverLocation: booking.driverLocation,
      };
      
      req.io.to(`customer:${booking.customerId}`).emit('pickup_confirmed', pickupData);
      req.io.to(`driver:${booking.driverId}`).emit('pickup_confirmed', pickupData);
    }
    
    res.json({ 
      success: true, 
      booking,
      message: 'OTP verified successfully. Order picked up!' 
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to verify OTP', details: err.message });
  }
});

// POST /api/bookings/:id/mark-delivered - Mark booking as delivered
router.post('/:id/mark-delivered', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverLocation } = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    booking.status = 'Delivered';
    booking.driverLocation = driverLocation;
    await booking.save();
    
    // Emit delivery completed event
    if (req.io) {
      const deliveryData = {
        id: booking._id.toString(),
        status: 'Delivered',
        driverLocation: booking.driverLocation,
        driverId: booking.driverId,
        driverName: booking.driverName,
      };

      req.io.to(`customer:${booking.customerId}`).emit('delivery_completed', deliveryData);
      req.io.to(`driver:${booking.driverId}`).emit('delivery_completed', deliveryData);

      // Notify admin dashboard that driver is now available
      req.io.emit('delivery_completed', deliveryData);
    }
    
    res.json({ 
      success: true, 
      booking,
      message: 'Delivery completed successfully!' 
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to mark as delivered', details: err.message });
  }
});

// POST /api/bookings/:id/update-driver-status - Update driver active status
router.post('/:id/update-driver-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Find the booking and update driver status (you might want to create a separate driver status endpoint)
    // For now, we'll just emit the status update event
    if (req.io) {
      req.io.emit('driver_status_updated', {
        driverId: id,
        isActive: isActive,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Driver status updated'
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update driver status', details: err.message });
  }
});

export default router;
