const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const User = require("../models/User");

const RESEMBLYZER_SERVICE_URL = "http://localhost:5001";

// Register voice using Resemblyzer
const registerVoice = async (req, res) => {
  try {
    const { email } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res
        .status(400)
        .json({ success: false, message: "Audio file required" });
    }

    // Send audio to Resemblyzer service for embedding extraction
    const form = new FormData();
    form.append("audio", fs.createReadStream(audioFile.path));

    const response = await axios.post(
      `${RESEMBLYZER_SERVICE_URL}/embed`,
      form,
      {
        headers: form.getHeaders(),
      }
    );

    // Clean up uploaded file
    fs.unlinkSync(audioFile.path);

    if (!response.data.success) {
      throw new Error("Failed to extract voice embedding");
    }

    const embedding = response.data.embedding;
    const voiceprintId = `voiceprint_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    res.json({
      success: true,
      voiceprintId,
      embedding,
      message: "Voice registration completed successfully",
    });
  } catch (error) {
    console.error("Voice registration error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify voice using Resemblyzer
const verifyVoice = async (userId, audioPath) => {
  try {
    const user = await User.findById(userId);

    if (!user.voiceEmbedding || user.voiceEmbedding.length === 0) {
      return { success: false, message: "No enrolled voiceprint found" };
    }

    // Send audio and stored embedding to Resemblyzer service
    const form = new FormData();
    form.append("audio", fs.createReadStream(audioPath));
    form.append("stored_embedding", JSON.stringify(user.voiceEmbedding));

    const response = await axios.post(
      `${RESEMBLYZER_SERVICE_URL}/verify`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000 // 30 second timeout
      }
    );

    if (!response.data.success) {
      console.error("Voice verification service error:", response.data);
      throw new Error(response.data.message || response.data.error || "Voice verification service error");
    }

    return {
      success: true,
      isMatch: response.data.isMatch,
      similarity: response.data.similarity,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Voice verification error:", error);
    return { success: false, message: error.message };
  }
};

// Legacy function for backward compatibility
const enrollVoiceprint = async (req, res) => {
  return registerVoice(req, res);
};

module.exports = { enrollVoiceprint, verifyVoice, registerVoice };
