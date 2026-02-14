const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  generateQuestion,
  verifyResponse,
} = require("../controllers/voiceCaptchaController");
const { voiceVerificationLimiter } = require("../middleware/security");

// Configure multer for audio uploads
const upload = multer({ dest: "uploads/" });

// Verify voice response
router.post("/verify", upload.single("audio"), verifyResponse);

module.exports = router;
