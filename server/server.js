const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/database");
const multer = require("multer");
// Remove Google Cloud TTS import
// const textToSpeech = require("@google-cloud/text-to-speech");
const fs = require("fs");
const util = require("util");
const { securityHeaders } = require("./middleware/security");

// Import routes
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const voiceCaptchaRoutes = require("./routes/voiceCaptchaRoutes");
const userRoutes = require("./routes/userRoutes");

dotenv.config(); // Load variables from .env

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());
app.use(securityHeaders);
app.use("/audio", express.static("audio"));

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Remove ElevenLabs TTS (placeholder) and related comments

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/voice-captcha", voiceCaptchaRoutes);
app.use("/api/voice", require("./routes/voiceRoutes"));

// Legacy routes (for backward compatibility)
app.post("/api/signup", require("./controllers/authController").signup);
app.post("/api/login", require("./controllers/authController").login);

// Sample route
app.get("/", (req, res) => {
  res.send("Voice-Based CAPTCHA Banking System API");
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});