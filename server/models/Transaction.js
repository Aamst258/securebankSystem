
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['transfer', 'deposit', 'withdraw'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recipientAccountNumber: {
    type: String
  },
  recipientName: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'completed'],
    default: 'pending'
  },
  verificationQuestions: [{
    type: String
  }],
  verificationResult: {
    voiceMatch: Boolean,
    contentMatch: Boolean,
    voiceSimilarity: Number,
    textSimilarity: Number,
    verificationAttempts: { type: Number, default: 0 },
    lastVerificationAttempt: Date,
    voiceVerificationStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'expired'],
      default: 'pending'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  verificationExpiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from creation
    }
  },
  isExpired: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
