const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     Gradebook:
 *       type: object
 *       required:
 *         - student
 *         - class
 *         - subject
 *         - teacher
 *         - academicYear
 *         - term
 *       properties:
 *         student:
 *           type: string
 *           format: objectId
 *         class:
 *           type: string
 *           format: objectId
 *         subject:
 *           type: string
 *           format: objectId
 *         teacher:
 *           type: string
 *           format: objectId
 *         assignments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               assignment:
 *                 type: string
 *                 format: objectId
 *               marks:
 *                 type: number
 *               grade:
 *                 type: string
 *               weight:
 *                 type: number
 *               feedback:
 *                 type: string
 *         tests:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               marks:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               weight:
 *                 type: number
 *         exams:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               marks:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               weight:
 *                 type: number
 *         totalMarks:
 *           type: number
 *         finalGrade:
 *           type: string
 *         positionInClass:
 *           type: number
 *         remarks:
 *           type: string
 *         academicYear:
 *           type: string
 *         term:
 *           type: string
 *           enum: [Term 1, Term 2, Term 3]
 *         isPublished:
 *           type: boolean
 *           default: false
 *         publishedAt:
 *           type: string
 *           format: date-time
 */

const GradebookSchema = new mongoose.Schema({
  // Relationships
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
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Grading data
  assignments: [
    {
      assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment" },
      marks: { type: Number },
      grade: { type: String },
      weight: { type: Number },
      feedback: { type: String },
    },
  ],
  tests: [
    {
      name: { type: String },
      marks: { type: Number },
      date: { type: Date },
      weight: { type: Number },
    },
  ],
  exams: [
    {
      name: { type: String },
      marks: { type: Number },
      date: { type: Date },
      weight: { type: Number },
    },
  ],

  // Summary
  totalMarks: { type: Number },
  finalGrade: { type: String },
  positionInClass: { type: Number },
  remarks: { type: String },

  // Term information
  academicYear: { type: String, required: true },
  term: {
    type: String,
    enum: ["Term 1", "Term 2", "Term 3"],
    required: true,
  },

  // System
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Gradebook", GradebookSchema);
