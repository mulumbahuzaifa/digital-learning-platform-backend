const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       required:
 *         - class
 *         - date
 *         - recordedBy
 *         - records
 *       properties:
 *         class:
 *           type: string
 *           format: objectId
 *           description: Reference to the class
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Reference to the subject (optional)
 *         recordedBy:
 *           type: string
 *           format: objectId
 *           description: Reference to the teacher who recorded attendance
 *         date:
 *           type: string
 *           format: date
 *           description: Date of attendance
 *         session:
 *           type: string
 *           enum: [morning, afternoon, full-day]
 *           default: full-day
 *           description: Session of attendance
 *         records:
 *           type: array
 *           description: Array of individual student attendance records
 *           items:
 *             type: object
 *             required:
 *               - student
 *               - status
 *             properties:
 *               student:
 *                 type: string
 *                 format: objectId
 *                 description: Reference to the student
 *               status:
 *                 type: string
 *                 enum: [present, absent, late, excused]
 *                 default: present
 *                 description: Attendance status
 *               remark:
 *                 type: string
 *                 description: Additional remarks
 *               timeIn:
 *                 type: string
 *                 description: Time student arrived (format HH:mm)
 *               timeOut:
 *                 type: string
 *                 description: Time student left (format HH:mm)
 *         isSubmitted:
 *           type: boolean
 *           default: false
 *           description: Whether attendance has been submitted
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: When attendance was submitted
 *         isVerified:
 *           type: boolean
 *           default: false
 *           description: Whether attendance has been verified by admin
 *         verifiedBy:
 *           type: string
 *           format: objectId
 *           description: Reference to admin who verified
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *           description: When attendance was verified
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When attendance record was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When attendance record was last updated
 */

const AttendanceSchema = new mongoose.Schema({
  // Relationships
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Attendance data
  date: {
    type: Date,
    required: true,
  },
  session: {
    type: String,
    enum: ["morning", "afternoon", "full-day"],
    default: "full-day",
  },
  records: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      status: {
        type: String,
        enum: ["present", "absent", "late", "excused"],
        default: "present",
      },
      remark: { type: String },
      timeIn: { type: String }, // "08:15"
      timeOut: { type: String },
    },
  ],

  // Metadata
  isSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date },

  // System
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
