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
 *         - enrollment
 *       properties:
 *         assignment:
 *           type: string
 *           format: objectId
 *           description: Reference to the assignment being submitted
 *         student:
 *           type: string
 *           format: objectId
 *           description: Reference to the student submitting
 *         enrollment:
 *           type: string
 *           format: objectId
 *           description: Reference to the student's academic enrollment
 *         textSubmission:
 *           type: string
 *           description: Text content of the submission (if applicable)
 *         files:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - filename
 *               - originalname
 *               - mimetype
 *               - path
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Generated filename
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
 *         status:
 *           type: string
 *           enum: [submitted, graded, resubmitted, overdue]
 *           default: submitted
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const SubmissionSchema = new mongoose.Schema({
  // Core relationships
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
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AcademicEnrollment",
    required: true,
  },

  // Submission content
  textSubmission: { type: String },
  files: [
    {
      filename: { type: String },
      originalname: { type: String },
      mimetype: { type: String },
      size: { type: Number },
      path: { type: String },
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

  // Submission Details
  submissionMethod: {
    type: String,
    enum: ["online", "offline"],
    default: "online",
  },
  submissionNotes: { type: String },
  resubmissionCount: { type: Number, default: 0 },
  lastResubmissionDate: { type: Date },
  plagiarismScore: { type: Number, min: 0, max: 100 },
  plagiarismReport: { type: String },
  studentComments: { type: String },
  teacherComments: { type: String },
  parentFeedback: { type: String },
  parentFeedbackDate: { type: Date },

  // Status
  status: {
    type: String,
    enum: [
      "submitted",
      "graded",
      "resubmitted",
      "overdue",
      "returned",
      "approved",
    ],
    default: "submitted",
  },

  // System
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add indexes for better query performance
SubmissionSchema.index({ assignment: 1, student: 1 });
SubmissionSchema.index({ student: 1, status: 1 });
SubmissionSchema.index({ enrollment: 1 });

// Virtual populate for class and subject
SubmissionSchema.virtual("class", {
  ref: "Assignment",
  localField: "assignment",
  foreignField: "_id",
  justOne: true,
  select: "class",
});

SubmissionSchema.virtual("subject", {
  ref: "Assignment",
  localField: "assignment",
  foreignField: "_id",
  justOne: true,
  select: "subject",
});

// Pre-save middleware to set submission type and check if late
SubmissionSchema.pre("save", async function (next) {
  if (this.isNew) {
    const assignment = await this.model("Assignment").findById(this.assignment);
    if (assignment) {
      // Check if submission is late
      if (new Date() > assignment.dueDate) {
        this.isLate = true;
        const diffTime = Math.abs(new Date() - assignment.dueDate);
        this.lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
  }
  next();
});

// Method to get class and subject info
SubmissionSchema.methods.getClassAndSubject = async function () {
  const assignment = await this.model("Assignment")
    .findById(this.assignment)
    .populate("class", "name level stream")
    .populate("subject", "name code");

  return {
    class: assignment.class,
    subject: assignment.subject,
  };
};

module.exports = mongoose.model("Submission", SubmissionSchema);
