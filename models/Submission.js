const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       required:
 *         - assignment
 *         - student
 *         - class
 *         - subject
 *       properties:
 *         assignment:
 *           type: string
 *           format: objectId
 *           description: Reference to the assignment being submitted
 *         student:
 *           type: string
 *           format: objectId
 *           description: Reference to the student submitting
 *         class:
 *           type: string
 *           format: objectId
 *           description: Reference to the class
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Reference to the subject
 *         textSubmission:
 *           type: string
 *           description: Text content of the submission (if applicable)
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL to the uploaded file
 *               name:
 *                 type: string
 *                 description: Original filename
 *               type:
 *                 type: string
 *                 description: MIME type of the file
 *               size:
 *                 type: number
 *                 description: File size in bytes
 *           description: Array of attached files
 *         submitDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of submission
 *         isLate:
 *           type: boolean
 *           default: false
 *           description: Whether the submission is late
 *         lateDays:
 *           type: number
 *           default: 0
 *           description: Number of days late
 *         marksAwarded:
 *           type: number
 *           description: Marks awarded for the submission
 *         grade:
 *           type: string
 *           description: Grade assigned (A, B, C, D, F)
 *         feedback:
 *           type: string
 *           description: Teacher's feedback on the submission
 *         gradedBy:
 *           type: string
 *           format: objectId
 *           description: Reference to the teacher who graded
 *         gradedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time of grading
 *         rubrics:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *                 description: Grading criteria
 *               marks:
 *                 type: number
 *                 description: Marks awarded for this criteria
 *               comment:
 *                 type: string
 *                 description: Comments for this criteria
 *           description: Detailed grading rubrics
 *         status:
 *           type: string
 *           enum: [submitted, graded, resubmitted, overdue]
 *           default: submitted
 *           description: Current status of the submission
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the submission was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the submission was last updated
 */

const SubmissionSchema = new mongoose.Schema({
  // Relationships
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assignment",
    required: true,
  },
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
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },

  // Submission content
  textSubmission: { type: String },
  attachments: [
    {
      url: { type: String, required: true },
      name: { type: String },
      type: { type: String },
      size: { type: Number },
    },
  ],
  submitDate: {
    type: Date,
    default: Date.now,
  },
  isLate: { type: Boolean, default: false },
  lateDays: { type: Number, default: 0 },

  // Grading
  marksAwarded: { type: Number },
  grade: { type: String },
  feedback: { type: String },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gradedAt: { type: Date },
  rubrics: [
    {
      criteria: { type: String },
      marks: { type: Number },
      comment: { type: String },
    },
  ],

  // Status
  status: {
    type: String,
    enum: ["submitted", "graded", "resubmitted", "overdue"],
    default: "submitted",
  },

  // System
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Submission", SubmissionSchema);
