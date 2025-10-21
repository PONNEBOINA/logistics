import express from 'express';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Booking from '../models/Booking.js';

const router = express.Router();

// DELETE /api/admin/clear-all-data - Clear all data from database
router.delete('/clear-all-data', async (req, res) => {
  try {
    console.log('🗑️ Clearing all data from database...');
    
    // Clear all collections
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Booking.deleteMany({});
    
    console.log('✅ All data cleared successfully');
    
    res.json({
      success: true,
      message: 'All data cleared successfully',
      cleared: {
        users: 'All users deleted',
        vehicles: 'All vehicles deleted', 
        bookings: 'All bookings deleted'
      }
    });
  } catch (err) {
    console.error('❌ Error clearing data:', err);
    res.status(500).json({ 
      error: 'Failed to clear data', 
      details: err.message 
    });
  }
});

export default router;
