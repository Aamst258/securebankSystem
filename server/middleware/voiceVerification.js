
const ActivityLog = require('../models/ActivityLog');
const Transaction = require('../models/Transaction');

const logVoiceVerification = async (userId, transactionId, verificationData) => {
  try {
    const activityLog = new ActivityLog({
      userId,
      action: 'Voice Verification Attempt',
      actionType: 'voice_verification',
      details: `Voice verification ${verificationData.success ? 'succeeded' : 'failed'} for transaction`,
      transactionId,
      voiceVerificationData: {
        similarity: verificationData.similarity,
        question: verificationData.question,
        verificationResult: verificationData.success ? 'passed' : 'failed',
        audioFilePath: verificationData.audioPath
      }
    });
    
    await activityLog.save();
    
    // Update transaction verification attempts
    await Transaction.findByIdAndUpdate(transactionId, {
      $inc: { 'verificationResult.verificationAttempts': 1 },
      $set: { 
        'verificationResult.lastVerificationAttempt': new Date(),
        'verificationResult.voiceVerificationStatus': verificationData.success ? 'passed' : 'failed'
      }
    });
    
  } catch (error) {
    console.error('Error logging voice verification:', error);
  }
};

module.exports = { logVoiceVerification };
