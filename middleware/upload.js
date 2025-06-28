const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ErrorResponse = require('../utils/errorResponse');

// Configure storage for qualification documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create directory for qualification documents
    const uploadDir = path.join(__dirname, '../public/uploads/qualifications');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `qualification-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Get allowed formats
  const allowedFormats = [
    'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'
  ];
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ErrorResponse(`File type ${ext} not allowed. Allowed types: ${allowedFormats.join(', ')}`, 400), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

module.exports = { upload }; 