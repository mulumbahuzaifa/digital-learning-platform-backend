const path = require("path");

// Environment configuration
const env = process.env.NODE_ENV || "development";

// Base configuration
const baseConfig = {
  env,
  port: process.env.PORT || 5000,
  baseUrl: process.env.BASE_URL || "http://localhost:5000",

  // MongoDB configuration
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/digital-learning-platform",

  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  jwtExpire: process.env.JWT_EXPIRE || "30d",
  jwtCookieExpire: process.env.JWT_COOKIE_EXPIRE || 30,

  // File upload configuration
  uploadDir: path.join(__dirname, "../uploads"),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: {
    images: [".jpg", ".jpeg", ".png", ".gif"],
    documents: [".pdf", ".doc", ".docx", ".txt"],
    assignments: [".pdf", ".doc", ".docx", ".txt", ".zip", ".rar"],
  },

  // Email service configuration
  emailService: {
    provider: process.env.EMAIL_PROVIDER || "smtp",
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    from: process.env.EMAIL_FROM || "newsomateam@gmail.com",
  },

  // SMS service configuration
  smsService: {
    provider: process.env.SMS_PROVIDER || "twilio",
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_NUMBER,
  },

  // Plagiarism check service configuration
  plagiarismApiKey: process.env.PLAGIARISM_API_KEY,
  plagiarismApiEndpoint:
    process.env.PLAGIARISM_API_ENDPOINT ||
    "https://api.plagiarism-service.com/v1",

  // Academic year configuration
  currentAcademicYear: process.env.CURRENT_ACADEMIC_YEAR || "2025",
  currentTerm: process.env.CURRENT_TERM || "Term 1",

  // Grading configuration
  gradingSystem: {
    A: { min: 80, points: 5 },
    B: { min: 70, points: 4 },
    C: { min: 60, points: 3 },
    D: { min: 50, points: 2 },
    F: { min: 0, points: 0 },
  },

  // Pagination configuration
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },

  // Cache configuration
  cache: {
    enabled: process.env.CACHE_ENABLED === "true",
    ttl: process.env.CACHE_TTL || 3600, // 1 hour in seconds
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "app.log",
  },

  // Security configuration
  security: {
    bcryptSaltRounds: 10,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  },

  // Video Service Configuration
  videoService: {
    apiKey: process.env.VIDEO_SERVICE_API_KEY,
    apiSecret: process.env.VIDEO_SERVICE_API_SECRET,
    baseUrl:
      process.env.VIDEO_SERVICE_BASE_URL || "https://api.video-service.com/v2",
    defaultSettings: {
      hostVideo: true,
      participantVideo: true,
      joinBeforeHost: false,
      muteUponEntry: true,
      waitingRoom: true,
      meetingAuthentication: true,
      encryptionType: "enhanced_encryption",
    },
  },
};

// Environment-specific configurations
const envConfig = {
  development: {
    debug: true,
    mongoUri: process.env.MONGO_URI,
  },

  test: {
    debug: true,
    mongoUri: "mongodb://localhost:27017/digital-learning-platform-test",
  },

  production: {
    debug: false,
    mongoUri: process.env.MONGO_URI,
    security: {
      ...baseConfig.security,
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 50,
      },
    },
  },
};

// Merge base config with environment-specific config
const config = {
  ...baseConfig,
  ...envConfig[env],
};

// Export configuration
module.exports = config;
