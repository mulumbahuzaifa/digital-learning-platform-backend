const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated user ID
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         email:
 *           type: string
 *           format: email
 *           unique: true
 *         role:
 *           type: string
 *           enum: [admin, teacher, student]
 *           default: student
 *         profile:
 *           $ref: '#/components/schemas/UserProfile'
 *         classRequests:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClassRequest'
 *         isVerified:
 *           type: boolean
 *           default: false
 *         isActive:
 *           type: boolean
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     UserProfile:
 *       type: object
 *       properties:
 *         bio:
 *           type: string
 *           maxLength: 500
 *         avatar:
 *           type: string
 *           description: URL to profile image
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *         phone:
 *           type: string
 *         address:
 *           type: object
 *           properties:
 *             district:
 *               type: string
 *             county:
 *               type: string
 *             subCounty:
 *               type: string
 *         currentClass:
 *           type: string
 *           description: Reference to Class (for students)
 *         year:
 *           type: string
 *           description: Academic year (for students)
 *         studentId:
 *           type: string
 *           description: Unique student identifier
 *         parentGuardian:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             contact:
 *               type: string
 *             relationship:
 *               type: string
 *         qualifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Qualification'
 *         teacherId:
 *           type: string
 *           description: Unique teacher identifier
 *         department:
 *           type: string
 *
 *     ClassRequest:
 *       type: object
 *       properties:
 *         class:
 *           type: string
 *           description: Reference to Class
 *         subject:
 *           type: string
 *           description: Reference to Subject (for teachers)
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: pending
 *         requestedAt:
 *           type: string
 *           format: date-time
 *         processedAt:
 *           type: string
 *           format: date-time
 *         processedBy:
 *           type: string
 *           description: Reference to User who processed the request
 *         reason:
 *           type: string
 *           description: Reason for rejection
 *         roleInClass:
 *           type: string
 *           enum: [teacher, student]
 *
 *     Qualification:
 *       type: object
 *       properties:
 *         subject:
 *           type: string
 *           description: Reference to Subject
 *         qualificationLevel:
 *           type: string
 *         yearsOfExperience:
 *           type: number
 *         institution:
 *           type: string
 *         yearObtained:
 *           type: number
 */

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ["admin", "teacher", "student"],
    default: "student",
    required: true,
  },

  profile: {
    bio: { type: String, maxlength: 500 },
    avatar: { type: String }, // URL to image
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    phone: { type: String },
    address: {
      district: { type: String },
      county: { type: String },
      subCounty: { type: String },
    },

    // Student-specific
    currentClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    year: { type: String },
    studentId: { type: String, unique: true, sparse: true },
    parentGuardian: {
      name: { type: String },
      contact: { type: String },
      relationship: { type: String },
    },

    // Teacher-specific
    qualifications: [
      {
        subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
        qualificationLevel: { type: String },
        yearsOfExperience: { type: Number },
        institution: { type: String },
        yearObtained: { type: Number },
        documents: [
          {
            name: { type: String, required: true },
            url: { type: String, required: true },
            fileType: { type: String },
            uploadedAt: { type: Date, default: Date.now },
            description: { type: String },
          }
        ],
        isVerified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: { type: Date },
      },
    ],
    teacherId: { type: String, unique: true, sparse: true },
    department: { type: String },
  },
  // Track all class enrollment requests (for both teachers and students)
  classRequests: [
    {
      class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
      subject: {
        // Added for teacher subject assignment
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      requestedAt: {
        type: Date,
        default: Date.now,
      },
      processedAt: { type: Date },
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String }, // For rejection reasons
      roleInClass: {
        type: String,
        enum: ["teacher", "student"],
      },
    },
  ],
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  isVerified: {
    type: Boolean,
    default: false,
  },
  remember: {
    type: Boolean,
    default: false,
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate email verification token
UserSchema.methods.getVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Set expire time (30 minutes)
  this.emailVerificationExpire = Date.now() + 30 * 60 * 1000;

  return verificationToken;
};

// matchPassword
UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generate password reset token
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate JWT token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = mongoose.model("User", UserSchema);
