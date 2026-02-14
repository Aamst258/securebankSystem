const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProfile', required: true },
  action: { type: String, required: true },
  actionType: {
    type: String,
    enum: ['auth', 'transaction', 'voice_verification', 'profile_update', 'security'],
    default: 'auth'
  },
  details: String,
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  voiceVerificationData: {
    similarity: Number,
    question: String,
    verificationResult: String,
    audioFilePath: String
  },
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
