const fs = require("fs");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { verifyVoice } = require("./voiceBiometricController");
const axios = require("axios");
const FormData = require("form-data");

const MAX_ATTEMPTS = 3;
const VOICE_SERVICE_URL = "http://localhost:5001";

// Convert speech to text using voice service
const convertSpeechToText = async (audioPath) => {
  try {
    const form = new FormData();
    form.append("audio", fs.createReadStream(audioPath));
    const mongoose = require("mongoose");

    const response = await axios.post(`${VOICE_SERVICE_URL}/stt`, form, {
      headers: form.getHeaders(),
    });

    if (response.data.success) {
      return response.data.text || "";
    }
    return "";
  } catch (error) {
    console.error("Speech to text conversion error:", error);
    return "";
  }
};

// Calculate text similarity
const calculateSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;

  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  if (words1.length === 0 || words2.length === 0) return 0;

  const intersection = words1.filter((word) => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];

  return intersection.length / union.length;
};

// Generate security question
const generateSecurityQuestion = async (req, res) => {
  try {
    const { userId, transactionId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if user has voice embedding
    if (!user.voiceEmbedding || user.voiceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Voice profile not set up. Please register your voice first.",
      });
    }

    const securityFields = [
      { field: "nickname", question: "What is your nickname?" },
      { field: "shoeSize", question: "What is your shoe size?" },
      { field: "favoriteColor", question: "What is your favorite color?" },
      { field: "birthPlace", question: "Where were you born?" },
      { field: "petName", question: "What is your pet's name?" },
      {
        field: "motherMaidenName",
        question: "What is your mother's maiden name?",
      },
      {
        field: "firstSchool",
        question: "What is the name of your first school?",
      },
      { field: "childhoodFriend", question: "Who was your childhood friend?" },
    ];

    // Filter fields that have values
    const availableFields = securityFields.filter(
      (item) => user[item.field] && user[item.field].trim() !== ""
    );

    if (availableFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No security questions set up. Please update your profile.",
      });
    }

    const randomField =
      availableFields[Math.floor(Math.random() * availableFields.length)];

    // Update transaction with verification field
    if (transactionId) {
      await Transaction.findByIdAndUpdate(transactionId, {
        lastVerificationField: randomField.field,
        verificationAttempts: 0,
      });
    }

    res.json({
      success: true,
      question: randomField.question,
      field: randomField.field,
    });
  } catch (error) {
    console.error("Generate security question error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify voice response
const verifyResponse = async (req, res) => {
  try {
    // 🔹 Read fields from request body
    const { userId, field, transactionId } = req.body;

    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: "Audio response required",
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has voice embedding
    if (!user.voiceEmbedding || user.voiceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Voice profile not registered. Please register your voice first.",
      });
    }

    // 🔹 Set verification field
    let verificationField = field || null;

    // 🟢 TRACK ATTEMPTS PER TRANSACTION
    let currentAttempt = 0;
    let attemptsLeft = MAX_ATTEMPTS;
    const MAX_TOTAL_ATTEMPTS = 10; // Hard limit

    if (transactionId) {
      const transaction = await Transaction.findById(transactionId);
      if (transaction) {
        currentAttempt =
          (transaction.verificationResult?.verificationAttempts || 0) + 1;

        // Check if already exceeded max attempts
        if (currentAttempt > MAX_TOTAL_ATTEMPTS) {
          return res.json({
            success: false,
            message: "Maximum attempts exceeded. Transaction denied.",
            attemptsLeft: 0,
            isDenied: true,
          });
        }

        attemptsLeft = MAX_TOTAL_ATTEMPTS - currentAttempt;
      }
    }

    if (!verificationField) {
      return res.status(400).json({
        success: false,
        message: "Security question field not found",
      });
    }

    if (attemptsLeft <= 0) {
      return res.json({
        success: false,
        message: "Maximum attempts reached. Transaction denied.",
        attemptsLeft: 0,
      });
    }

    // Verify voice using embedding
    const voiceResult = await verifyVoice(userId, audioFile.path);

    if (!voiceResult.success) {
      if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path);
      return res.status(400).json({
        success: false,
        message: voiceResult.message || "Voice verification failed",
        attemptsLeft,
      });
    }

    // Convert speech to text
    const spokenText = await convertSpeechToText(audioFile.path);

    // Get expected answer from DB
    const expectedAnswer = (user[verificationField] || "").toString().trim();

    // Calculate content similarity
    const textSimilarity = calculateSimilarity(
      spokenText.trim().toLowerCase(),
      expectedAnswer.toLowerCase()
    );

    // Voice + Content check
    const isVoiceMatch = voiceResult.success && voiceResult.isMatch;
    const isContentMatch = textSimilarity > 0.7;
    const overallSuccess = isVoiceMatch && isContentMatch;

    if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path);

    // 🟢 UPDATE TRANSACTION ATTEMPT TRACKING
    if (transactionId) {
      await Transaction.findByIdAndUpdate(transactionId, {
        $set: {
          "verificationResult.verificationAttempts": currentAttempt,
          "verificationResult.lastVerificationAttempt": new Date(),
        },
      });
    }

    // ===============================
    // 🚀 LOGGING
    // ===============================
    console.log("====================================");
    if (overallSuccess) {
      console.log("✅ VOICE VERIFICATION SUCCESS:");
    } else if (attemptsLeft > 0) {
      console.log("❌ VOICE VERIFICATION FAILED (Retry allowed):");
    } else {
      console.log("🚫 MAXIMUM ATTEMPTS REACHED — TRANSACTION DENIED:");
    }
    console.log(`- User ID: ${userId}`);
    console.log(`- Transaction ID: ${transactionId}`);
    console.log(`- Attempt: ${currentAttempt}/10`);
    console.log(`- Verification Field: ${verificationField}`);
    console.log(`- Expected Answer: "${expectedAnswer}"`);
    console.log(`- User Said: "${spokenText}"`);
    console.log(`- Voice Match: ${isVoiceMatch}`);
    console.log(`- Content Match: ${isContentMatch}`);
    console.log(`- Voice Similarity: ${voiceResult.similarity}`);
    console.log(`- Text Similarity: ${textSimilarity}`);
    console.log(`- Attempts Left: ${attemptsLeft}`);
    console.log("====================================");

    // ===============================
    // 🎯 FINAL RESPONSE
    // ===============================
    if (overallSuccess) {
      // Update transaction status to approved
      if (transactionId) {
        await Transaction.findByIdAndUpdate(transactionId, {
          $set: {
            "verificationResult.voiceVerificationStatus": "passed",
          },
        });
      }

      return res.json({
        success: true,
        message: "Transaction approved",
        attemptsLeft,
        currentAttempt,
        voiceMatch: isVoiceMatch,
        contentMatch: isContentMatch,
        similarity: voiceResult.similarity,
        recognizedText: spokenText,
        textSimilarity,
      });
    } else if (attemptsLeft > 0) {
      return res.json({
        success: false,
        message: `Verification failed. Attempts left: ${attemptsLeft}`,
        attemptsLeft,
        currentAttempt,
        similarity: voiceResult.similarity,
        recognizedText: spokenText,
        voiceMatch: isVoiceMatch,
        contentMatch: isContentMatch,
        textSimilarity,
        isDenied: false,
      });
    } else {
      // Max attempts reached - deny transaction
      if (transactionId) {
        await Transaction.findByIdAndUpdate(transactionId, {
          $set: {
            "verificationResult.voiceVerificationStatus": "failed",
            status: "denied",
          },
        });
      }

      return res.json({
        success: false,
        message: "Maximum 10 attempts reached. Transaction has been denied.",
        attemptsLeft: 0,
        currentAttempt,
        isDenied: true,
        similarity: voiceResult.similarity,
        recognizedText: spokenText,
      });
    }
  } catch (error) {
    console.error("🚨 Unexpected voice verification error:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateSecurityQuestion,
  verifyResponse,
};
