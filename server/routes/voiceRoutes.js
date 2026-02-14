
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { registerVoice } = require('../controllers/voiceBiometricController');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Voice registration route
router.post('/register', upload.single('voice'), registerVoice);

module.exports = router;
