const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ErrorResponse = require('./errorResponse');

// Configure storage paths
const uploadPaths = {
  content: path.join(__dirname, '../public/uploads/content'),
  submissions: path.join(__dirname, '../public/uploads/submissions'),
  thumbnails: path.join(__dirname, '../public/uploads/thumbnails')
};

// Ensure upload directories exist
const ensureUploadDirs = () => {
  Object.values(uploadPaths).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureUploadDirs();
    let uploadPath = uploadPaths.content; // Default path
    
    if (file.fieldname === 'files') {
      uploadPath = uploadPaths.submissions;
    } else if (file.fieldname === 'thumbnail') {
      uploadPath = uploadPaths.thumbnails;
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File type validation
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|mp4|mp3|zip/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new ErrorResponse('File type not supported', 400));
}

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});

/**
 * Uploads a file and returns file metadata
 * @param {Object} file - The file object from multer
 * @returns {Object} File metadata { url, filename, size, mimetype }
 */
const uploadFile = (file) => {
  if (!file) {
    throw new ErrorResponse('No file uploaded', 400);
  }

  return {
    url: `/uploads/content/${file.filename}`,
    filename: file.filename,
    originalname: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path
  };
};

/**
 * Deletes a file from the server
 * @param {String} filePath - Path to the file
 */
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../public', filePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    console.error('Error deleting file:', err);
    throw new ErrorResponse('Failed to delete file', 500);
  }
};

module.exports = {
  upload,          // For middleware usage
  uploadFile,      // For direct file handling
  deleteFile       // For file removal
};
