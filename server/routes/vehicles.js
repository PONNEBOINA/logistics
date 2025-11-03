import express from 'express';
import Vehicle from '../models/Vehicle.js';
import Booking from '../models/Booking.js';

const router = express.Router();

// GET /api/vehicles - Get all vehicles (admin use)
router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: err.message });
  }
});

// GET /api/vehicles/active - Get only available vehicles (not currently in active bookings)
router.get('/active', async (_req, res) => {
  try {
    // First get all active bookings to find busy vehicles
    const activeBookingStatuses = [
      'Booked',           // Driver accepted, heading to pickup
      'Reached Pickup',   // Driver at pickup, waiting for OTP
      'Order Picked Up',  // Driver picked up order
      'In Transit'        // Driver delivering
    ];
    
    // Get all active bookings with vehicle IDs that are actually busy
    const activeBookings = await Booking.find({
      status: { $in: activeBookingStatuses },
      vehicleId: { $exists: true, $ne: null }
    }).select('vehicleId status');
    
    console.log('🚛 Active bookings with vehicles:', activeBookings.map(b => ({
      bookingId: b._id,
      vehicleId: b.vehicleId,
      status: b.status,
      vehicleIdType: typeof b.vehicleId
    })));

    // Create a set of busy vehicle IDs (only include truly busy vehicles)
    const busyVehicleIds = new Set(
      activeBookings
        .map(b => b.vehicleId?.toString())
        .filter(Boolean) // Remove any null/undefined
    );

    console.log('🔴 Busy vehicle IDs:', Array.from(busyVehicleIds));
    
    // Get all active vehicles
    const allActiveVehicles = await Vehicle.find({ active: true }).lean();
    
    console.log('🚗 All active vehicles:', allActiveVehicles.map(v => ({
      id: v._id,
      number: v.number,
      driverId: v.driverId,
      active: v.active
    })));
    
    // Filter out vehicles that are in the busy list
    const availableVehicles = [];
    
    for (const vehicle of allActiveVehicles) {
      const vehicleIdStr = vehicle._id.toString();
      const isBusy = busyVehicleIds.has(vehicleIdStr);
      
      if (!isBusy) {
        // Only process vehicles that aren't busy
        try {
          // If vehicle has a driver, check if driver is active
          if (vehicle.driverId) {
            const driver = await mongoose.model('User').findOne(
              { _id: vehicle.driverId, active: true },
              { password: 0, __v: 0 }
            ).lean();
            
            if (driver) {
              availableVehicles.push({
                ...vehicle,
                driver: {
                  _id: driver._id,
                  name: driver.name,
                  email: driver.email,
                  phone: driver.phone
                }
              });
            }
          } else {
            // Vehicles without drivers are still available
            availableVehicles.push(vehicle);
          }
        } catch (error) {
          console.error(`Error processing vehicle ${vehicle._id}:`, error);
        }
      } else {
        console.log(`🚫 Vehicle ${vehicle.number} (${vehicleIdStr}) is busy with status: ` + 
          activeBookings.find(b => b.vehicleId?.toString() === vehicleIdStr)?.status);
      }
    }
    
    console.log(`✅ Found ${availableVehicles.length} available vehicles out of ${allActiveVehicles.length} total active vehicles`);
    
    // Return available vehicles sorted by creation date (newest first)
    res.json(availableVehicles.sort((a, b) => b.createdAt - a.createdAt));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active vehicles', details: err.message });
  }
});

// GET /api/vehicles/for-driver/:driverId (list all for a driver)
router.get('/for-driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const list = await Vehicle.find({ driverId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch vehicles', details: err.message });
  }
});

// GET /api/vehicles/by-driver/:driverId
router.get('/by-driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const v = await Vehicle.findOne({ driverId });
    if (!v) return res.status(404).json({ error: 'Not found' });
    res.json(v);
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch vehicle', details: err.message });
  }
});

// PUT /api/vehicles/by-driver/:driverId (upsert)
router.put('/by-driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const update = { ...req.body, driverId };
    const v = await Vehicle.findOneAndUpdate(
      { driverId },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json(v);
  } catch (err) {
    res.status(400).json({ error: 'Failed to upsert vehicle', details: err.message });
  }
});

// PATCH /api/vehicles/by-driver/:driverId/active
router.patch('/by-driver/:driverId/active', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { active } = req.body;
    const v = await Vehicle.findOneAndUpdate(
      { driverId },
      { $set: { active: !!active } },
      { new: true }
    );
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(v);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update active status', details: err.message });
  }
});

// PATCH /api/vehicles/by-driver/:driverId/active-all (activate/deactivate all vehicles for a driver)
router.patch('/by-driver/:driverId/active-all', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { active } = req.body;
    const result = await Vehicle.updateMany(
      { driverId },
      { $set: { active: !!active } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No vehicles found for this driver' });
    }
    const vehicles = await Vehicle.find({ driverId });
    res.json({ 
      success: true, 
      updated: result.modifiedCount, 
      total: result.matchedCount,
      vehicles 
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update vehicles', details: err.message });
  }
});

// POST /api/vehicles  (create)
router.post('/', async (req, res) => {
  try {
    console.log('Creating vehicle with data:', req.body);

    const v = await Vehicle.create(req.body);
    console.log('Vehicle created successfully:', v);

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      console.log('Emitting vehicle_added event');
      io.emit('vehicle_added', v);
    } else {
      console.error('Socket.IO instance not available');
    }

    res.status(201).json(v);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Vehicle number already exists', field: 'number' });
    }
    res.status(400).json({ error: 'Failed to create vehicle', details: err.message });
  }
});

// PATCH /api/vehicles/:id (update)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid vehicle ID format' });
    }

    console.log('Updating vehicle:', id, 'with data:', req.body);
    
    const v = await Vehicle.findByIdAndUpdate(id, req.body, { new: true });
    if (!v) {
      console.log('Vehicle not found:', id);
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    console.log('Vehicle updated successfully:', v);

    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      console.log('Emitting vehicle_updated event');
      io.emit('vehicle_updated', v);
    }

    res.json(v);
  } catch (err) {
    console.error('Error updating vehicle:', err);
    res.status(400).json({ error: 'Failed to update vehicle', details: err.message });
  }
});

export default router;
