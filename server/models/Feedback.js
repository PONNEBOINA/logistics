import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
    },
    driverId: {
      type: String,
      required: true,
      index: true,
    },
    driverName: {
      type: String,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  { 
    timestamps: true // Automatically adds createdAt and updatedAt
  }
);

// Index for efficient queries
FeedbackSchema.index({ driverId: 1, createdAt: -1 });
FeedbackSchema.index({ bookingId: 1 });

// Static method to calculate average rating for a driver
FeedbackSchema.statics.calculateAverageRating = async function(driverId) {
  const result = await this.aggregate([
    { $match: { driverId: driverId } },
    {
      $group: {
        _id: '$driverId',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: result[0].totalRatings,
    };
  }

  return {
    averageRating: 0,
    totalRatings: 0,
  };
};

export default mongoose.model('Feedback', FeedbackSchema);
