import express from 'express';
import Feedback from '../models/Feedback.js';

const router = express.Router();

// POST /api/feedback - Create new feedback
router.post('/', async (req, res) => {
  try {
    const { bookingId, customerId, customerName, driverId, driverName, rating, comment } = req.body;

    // Validate required fields
    if (!bookingId || !customerId || !driverId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if feedback already exists for this booking
    const existingFeedback = await Feedback.findOne({ bookingId });
    if (existingFeedback) {
      return res.status(400).json({ error: 'Feedback already exists for this booking. Use update endpoint to edit.' });
    }

    // Create new feedback
    const feedback = new Feedback({
      bookingId,
      customerId,
      customerName,
      driverId,
      driverName,
      rating,
      comment: comment || '',
    });

    await feedback.save();

    // Calculate updated average rating for driver
    const driverStats = await Feedback.calculateAverageRating(driverId);

    console.log(`✅ Feedback created for booking ${bookingId}, driver rating: ${driverStats.averageRating}`);

    // Emit Socket.IO event for real-time update
    if (req.io) {
      req.io.to(`driver:${driverId}`).emit('new_feedback', {
        feedback,
        driverStats,
      });
    }

    res.status(201).json({
      feedback,
      driverStats,
    });
  } catch (err) {
    console.error('Error creating feedback:', err);
    res.status(400).json({ error: 'Failed to create feedback', details: err.message });
  }
});

// PUT /api/feedback/:bookingId - Update existing feedback
router.put('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, comment } = req.body;

    // Find existing feedback
    const feedback = await Feedback.findOne({ bookingId });
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found for this booking' });
    }

    // Update feedback
    feedback.rating = rating !== undefined ? rating : feedback.rating;
    feedback.comment = comment !== undefined ? comment : feedback.comment;
    feedback.isEdited = true;
    feedback.editedAt = new Date();

    await feedback.save();

    // Recalculate average rating for driver
    const driverStats = await Feedback.calculateAverageRating(feedback.driverId);

    console.log(`✅ Feedback updated for booking ${bookingId}, new driver rating: ${driverStats.averageRating}`);

    // Emit Socket.IO event for real-time update
    if (req.io) {
      req.io.to(`driver:${feedback.driverId}`).emit('feedback_updated', {
        feedback,
        driverStats,
      });
    }

    res.json({
      feedback,
      driverStats,
    });
  } catch (err) {
    console.error('Error updating feedback:', err);
    res.status(400).json({ error: 'Failed to update feedback', details: err.message });
  }
});

// GET /api/feedback/booking/:bookingId - Get feedback for a specific booking
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const feedback = await Feedback.findOne({ bookingId });
    
    res.json(feedback);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(400).json({ error: 'Failed to fetch feedback', details: err.message });
  }
});

// GET /api/feedback/driver/:driverId - Get all feedback for a driver
router.get('/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const feedbacks = await Feedback.find({ driverId }).sort({ createdAt: -1 });
    const driverStats = await Feedback.calculateAverageRating(driverId);

    res.json({
      feedbacks,
      stats: driverStats,
    });
  } catch (err) {
    console.error('Error fetching driver feedback:', err);
    res.status(400).json({ error: 'Failed to fetch driver feedback', details: err.message });
  }
});

// GET /api/feedback/customer/:customerId - Get all feedback by a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const feedbacks = await Feedback.find({ customerId }).sort({ createdAt: -1 });
    
    res.json(feedbacks);
  } catch (err) {
    console.error('Error fetching customer feedback:', err);
    res.status(400).json({ error: 'Failed to fetch customer feedback', details: err.message });
  }
});

// GET /api/feedback/stats/all - Get rating stats for all drivers (for admin)
router.get('/stats/all', async (req, res) => {
  try {
    const allFeedback = await Feedback.aggregate([
      {
        $group: {
          _id: '$driverId',
          driverName: { $first: '$driverName' },
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          latestFeedback: { $max: '$createdAt' },
        },
      },
      {
        $project: {
          driverId: '$_id',
          driverName: 1,
          averageRating: { $round: ['$averageRating', 1] },
          totalRatings: 1,
          latestFeedback: 1,
        },
      },
      {
        $sort: { averageRating: -1 },
      },
    ]);

    res.json(allFeedback);
  } catch (err) {
    console.error('Error fetching all driver stats:', err);
    res.status(400).json({ error: 'Failed to fetch driver stats', details: err.message });
  }
});

// DELETE /api/feedback/:bookingId - Delete feedback (optional, for admin)
router.delete('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const feedback = await Feedback.findOneAndDelete({ bookingId });
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Recalculate driver stats after deletion
    const driverStats = await Feedback.calculateAverageRating(feedback.driverId);

    res.json({
      message: 'Feedback deleted successfully',
      driverStats,
    });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(400).json({ error: 'Failed to delete feedback', details: err.message });
  }
});

export default router;
