
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

module.exports = upload;
