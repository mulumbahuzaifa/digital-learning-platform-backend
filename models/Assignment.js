const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - dueDate
 *         - totalMarks
 *         - class
 *         - subject
 *         - createdBy
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the assignment
 *         description:
 *           type: string
 *           description: Detailed description of the assignment
 *         instructions:
 *           type: string
 *           description: Specific instructions for completing the assignment
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Deadline for submission
 *         totalMarks:
 *           type: number
 *           description: Maximum marks for the assignment
 *         weighting:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of total grade this assignment counts for
 *         class:
 *           type: string
 *           format: objectId
 *           description: Reference to the class this assignment belongs to
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Reference to the subject this assignment belongs to
 *         createdBy:
 *           type: string
 *           format: objectId
 *           description: Reference to the teacher who created the assignment
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *           description: Array of attached files for the assignment
 *         submissionType:
 *           type: string
 *           enum: [text, file, both]
 *           default: file
 *           description: Type of submission allowed
 *         allowedFormats:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of allowed file formats for submission
 *         allowLateSubmission:
 *           type: boolean
 *           default: false
 *           description: Whether late submissions are allowed
 *         latePenalty:
 *           type: number
 *           default: 0
 *           description: Percentage penalty per day for late submissions
 *         status:
 *           type: string
 *           enum: [draft, published, closed]
 *           default: draft
 *           description: Current status of the assignment
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the assignment was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the assignment was last updated
 */

const AssignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  weighting: {
    type: Number, // Percentage of total grade
    min: 0,
    max: 100,
  },

  // Relationships
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Attachments
  attachments: [
    {
      url: { type: String, required: true },
      name: { type: String },
      type: { type: String },
    },
  ],

  // Submission settings
  submissionType: {
    type: String,
    enum: ["text", "file", "both"],
    default: "file",
  },
  allowedFormats: [{ type: String }], // ['pdf', 'docx', ...]
  allowLateSubmission: { type: Boolean, default: false },
  latePenalty: { type: Number, default: 0 }, // Percentage per day

  // Status
  status: {
    type: String,
    enum: ["draft", "published", "closed"],
    default: "draft",
  },

  // System
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Assignment", AssignmentSchema);
