const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ErrorResponse = require("./errorResponse");

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine upload directory based on type
    const uploadType = req.path.includes("/submissions")
      ? "submissions"
      : "content";
    const uploadDir = path.join(__dirname, `../public/uploads/${uploadType}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Get allowed formats from request
  const allowedFormats = req.body.allowedFormats || [
    "pdf",
    "doc",
    "docx",
    "txt",
    "jpg",
    "jpeg",
    "png",
  ];

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ErrorResponse(`File type ${ext} not allowed`, 400), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files
  },
});

/**
 * Uploads a file and returns file metadata
 * @param {Object} file - The file object from multer
 * @returns {Object} File metadata { url, filename, size, mimetype }
 */
const uploadFile = (file) => {
  if (!file) {
    throw new ErrorResponse("No file uploaded", 400);
  }

  return {
    url: `/uploads/${file.path.split("uploads/")[1]}`,
    filename: file.filename,
    originalname: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path,
  };
};

/**
 * Deletes a file from the server
 * @param {String} filePath - Path to the file
 */
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(__dirname, "../public", filePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new ErrorResponse("Error deleting file", 500);
  }
};

// Helper function to get file info
const getFileInfo = (file) => {
  return {
    url: `/uploads/${file.path.split("uploads/")[1]}`,
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
  };
};

module.exports = {
  upload, // For middleware usage
  uploadFile, // For direct file handling
  deleteFile, // For file removal
  getFileInfo, // For getting file information
};
