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
 *               type:
 *                 type: string
 *                 enum: [file, link]
 *                 description: Type of attachment (file or link)
 *               name:
 *                 type: string
 *                 description: Name of the attachment
 *               description:
 *                 type: string
 *                 description: Optional description of the attachment
 *               # For file type
 *               filename:
 *                 type: string
 *                 description: Generated filename for uploaded file
 *               originalname:
 *                 type: string
 *                 description: Original filename
 *               mimetype:
 *                 type: string
 *                 description: MIME type of the file
 *               size:
 *                 type: number
 *                 description: File size in bytes
 *               path:
 *                 type: string
 *                 description: Path to the uploaded file
 *               # For link type
 *               url:
 *                 type: string
 *                 description: URL to the external resource
 *               urlType:
 *                 type: string
 *                 enum: [document, video, website, other]
 *                 description: Type of URL resource
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
 *         assignmentType:
 *           type: string
 *           enum: [homework, classwork, test, exam, project]
 *           required: true
 *           description: Type of assignment
 *         difficultyLevel:
 *           type: string
 *           enum: [easy, moderate, challenging]
 *           default: moderate
 *           description: Difficulty level of the assignment
 *         estimatedTime:
 *           type: number
 *           description: Estimated time to complete in minutes
 *         learningObjectives:
 *           type: array
 *           items:
 *             type: string
 *           description: List of learning objectives for this assignment
 *         rubrics:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: string
 *               marks:
 *                 type: number
 *               description:
 *                 type: string
 *           description: Grading rubrics for the assignment
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
    type: Number,
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

  // Attachments - can be either files or links
  attachments: [
    {
      type: {
        type: String,
        enum: ["file", "link"],
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      // File-specific fields
      filename: { type: String },
      originalname: { type: String },
      mimetype: { type: String },
      size: { type: Number },
      path: { type: String },
      // Link-specific fields
      url: { type: String },
      urlType: {
        type: String,
        enum: ["document", "video", "website", "other"],
      },
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

  // Assignment Type and Details
  assignmentType: {
    type: String,
    enum: ["homework", "classwork", "test", "exam", "project"],
  },
  difficultyLevel: {
    type: String,
    enum: ["easy", "moderate", "challenging"],
    default: "moderate",
  },
  estimatedTime: {
    type: Number, // in minutes
  },
  learningObjectives: [
    {
      type: String,
    },
  ],
  rubrics: [
    {
      criteria: { type: String, required: true },
      marks: { type: Number, required: true },
      description: { type: String },
    },
  ],

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

// Add indexes for better query performance
AssignmentSchema.index({ class: 1, subject: 1, status: 1 });
AssignmentSchema.index({ createdBy: 1, status: 1 });

// Validate attachment fields based on type
AssignmentSchema.pre("save", function (next) {
  if (this.attachments && this.attachments.length > 0) {
    for (const attachment of this.attachments) {
      if (attachment.type === "file") {
        if (
          !attachment.filename ||
          !attachment.originalname ||
          !attachment.mimetype ||
          !attachment.path
        ) {
          return next(
            new Error(
              "File attachments must include filename, originalname, mimetype, and path"
            )
          );
        }
      } else if (attachment.type === "link") {
        if (!attachment.url) {
          return next(new Error("Link attachments must include a URL"));
        }
      }
    }
  }
  next();
});

module.exports = mongoose.model("Assignment", AssignmentSchema);
