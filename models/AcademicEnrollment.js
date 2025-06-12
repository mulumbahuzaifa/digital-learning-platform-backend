const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     AcademicEnrollment:
 *       type: object
 *       required:
 *         - student
 *         - class
 *         - academicYear
 *         - term
 *         - status
 *       properties:
 *         student:
 *           type: string
 *           format: objectId
 *           description: Reference to the student
 *         class:
 *           type: string
 *           format: objectId
 *           description: Reference to the class
 *         academicYear:
 *           type: string
 *           description: Academic year (e.g., "2024")
 *         term:
 *           type: string
 *           enum: [Term 1, Term 2, Term 3]
 *           description: Current academic term
 *         status:
 *           type: string
 *           enum: [active, completed, transferred]
 *           default: active
 *           description: Current status of enrollment
 *         enrollmentDate:
 *           type: string
 *           format: date-time
 *           description: Date when student was enrolled
 *         completionDate:
 *           type: string
 *           format: date-time
 *           description: Date when enrollment was completed
 *         transferDetails:
 *           type: object
 *           properties:
 *             fromClass:
 *               type: string
 *               format: objectId
 *             toClass:
 *               type: string
 *               format: objectId
 *             transferDate:
 *               type: string
 *               format: date-time
 *             reason:
 *               type: string
 *         subjects:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 format: objectId
 *               status:
 *                 type: string
 *                 enum: [enrolled, completed, dropped]
 *               enrollmentDate:
 *                 type: string
 *                 format: date-time
 *               completionDate:
 *                 type: string
 *                 format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const AcademicEnrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
  },
  term: {
    type: String,
    enum: ["Term 1", "Term 2", "Term 3"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "completed", "transferred"],
    default: "active",
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
  completionDate: {
    type: Date,
  },
  transferDetails: {
    fromClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    toClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    transferDate: { type: Date },
    reason: { type: String },
  },
  subjects: [
    {
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
      },
      status: {
        type: String,
        enum: ["enrolled", "completed", "dropped"],
        default: "enrolled",
      },
      enrollmentDate: {
        type: Date,
        default: Date.now,
      },
      completionDate: {
        type: Date,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for better query performance
AcademicEnrollmentSchema.index({ student: 1, status: 1 });
AcademicEnrollmentSchema.index({ class: 1, academicYear: 1, term: 1 });
AcademicEnrollmentSchema.index({ student: 1, academicYear: 1, term: 1 });

module.exports = mongoose.model("AcademicEnrollment", AcademicEnrollmentSchema);
